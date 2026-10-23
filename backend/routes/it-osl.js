const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const uploadMem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const { buildRbac, isGlobalRole, isFieldRole, normalizeRole } = require('../utils/itOslRbac');
const rbac = buildRbac(prisma);
const requirePermission = rbac.requirePermission;

// Semua route IT-OSL memakai actor terverifikasi (role dibaca dari DB).
router.use(rbac.attachActor);
const itOslUploadDir = path.join(__dirname, '..', 'public', 'it-osl');
if (!fs.existsSync(itOslUploadDir)) fs.mkdirSync(itOslUploadDir, { recursive: true });
async function processItOslImage(file){
  const name = `itosl-${Date.now()}-${Math.round(Math.random()*10000)}.webp`;
  const fp = path.join(itOslUploadDir, name);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(fp);
  return `/public/it-osl/${name}`;
}

// ── UPLOAD (Multiple & Single Images) ───────────────────────────────────────
router.post('/upload', requirePermission('TICKET_CREATE'), uploadMem.array('files', 10), async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Tidak ada file gambar yang diunggah' });
    }
    const urls = [];
    for (const file of files) {
      const url = await processItOslImage(file);
      urls.push(url);
    }
    res.json({ urls, url: urls[0] });
  } catch (e) {
    console.error('[IT-OSL upload error]', e);
    res.status(500).json({ message: e.message });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function requireAdmin(req, res){
  const actor = req.itOslActor || {};
  const role = normalizeRole(actor.role || req.headers['x-user-role']);
  if(!actor.verified || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')){
    res.status(403).json({ message:'Hanya Admin/SuperAdmin yang boleh melakukan aksi ini' })
    return false
  }
  return true
}
function requireSuperAdmin(req, res){
  const actor = req.itOslActor || {};
  const role = normalizeRole(actor.role || req.headers['x-user-role']);
  if(!actor.verified || role !== 'SUPER_ADMIN'){
    res.status(403).json({ message:'Aksi ini hanya untuk SuperAdmin' })
    return false
  }
  return true
}
const superAdminOnly = (req, res, next) => {
  if (!requireSuperAdmin(req, res)) return;
  next();
};
async function generateTicketNumber(tx) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `TCK-${ym}-`;
  const last = await tx.itOslTicket.findFirst({
    where: { ticketNumber: { startsWith: prefix } },
    orderBy: { ticketNumber: 'desc' },
  });
  let seq = 1;
  if (last) {
    const parts = last.ticketNumber.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function isWorkHour(date) {
  // Mon-Fri 08:00-17:00, Sat 08:00-12:00, WIB
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const h = d.getHours() + d.getMinutes() / 60;
  if (day === 0) return false;
  if (day >= 1 && day <= 5) return h >= 8 && h < 17;
  if (day === 6) return h >= 8 && h < 12;
  return false;
}

async function auditLog({ tx, entityType, entityId, action, fieldName, oldValue, newValue, actorUserId, ticketId, req }) {
  const p = tx || prisma;
  try {
    await p.itOslAuditLog.create({
      data: {
        entityType,
        entityId,
        action,
        fieldName: fieldName || null,
        oldValue: oldValue != null ? String(oldValue).slice(0, 2000) : null,
        newValue: newValue != null ? String(newValue).slice(0, 2000) : null,
        actorUserId: actorUserId || null,
        ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
        userAgent: req?.headers?.['user-agent'] || null,
        ticketId: ticketId || null,
      },
    });
  } catch (e) {
    console.error('[IT-OSL audit]', e.message);
  }
}

// State machine per PRD §3.2
const ALLOWED = {
  NEW: ['IN_PROGRESS', 'DUPLICATE', 'CANCELLED'],
  IN_PROGRESS: ['PENDING', 'RESOLVED'],
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: [],
  DUPLICATE: [],
  REOPENED: ['IN_PROGRESS'],
};
function canTransition(from, to) {
  if (from === to) return false;
  // REOPENED is not stored as status? PRD says after CLOSED -> REOPENED -> IN_PROGRESS
  // We store REOPENED transient then immediately to IN_PROGRESS, but allow CLOSED -> REOPENED
  if (from === 'CLOSED' && to === 'REOPENED') return true;
  const list = ALLOWED[from];
  return Array.isArray(list) && list.includes(to);
}

// SLA helpers
function slaThresholdMinutes(severity) {
  if (severity === 'CRITICAL') return 15;
  if (severity === 'MEDIUM') return 60;
  return 240;
}

// ── RBAC Customer Scoping Helper ───────────────────────────────────────────
async function getCustomerScope(req) {
  // Actor sudah di-resolve oleh middleware (role dari DB, bukan header).
  const actor = req.itOslActor || (await rbac.resolveActor(req));
  const role = normalizeRole(actor.role);
  const userId = actor.id;

  // Super Admin & Admin punya akses global ke semua customer
  if (actor.verified && isGlobalRole(role)) {
    return { isGlobal: true, allowedCustomerIds: null };
  }

  if (!userId) {
    // Tanpa sesi valid: tidak ada akses data customer sama sekali
    return { isGlobal: false, allowedCustomerIds: [], userId: null, role };
  }

  // User lapangan hanya boleh mengakses customer yang di-assign ke dirinya
  const assignments = await prisma.itOslUserCustomer.findMany({
    where: { userId: String(userId) },
    select: { customerId: true }
  });
  const allowedCustomerIds = assignments.map(a => a.customerId);
  return { isGlobal: false, allowedCustomerIds, userId, role };
}

function applyCustomerFilter(where, scope, reqCustomerId, options = {}) {
  const includeShared = options.includeShared !== false;
  if (scope.isGlobal) {
    if (reqCustomerId) where.customerId = String(reqCustomerId);
    return;
  }

  const allowed = Array.isArray(scope.allowedCustomerIds) ? scope.allowedCustomerIds : [];

  // Data dengan customerId = null dianggap data bersama/legacy (mis. lokasi
  // gedung internal yang belum dipetakan ke customer). Untuk tiket, data
  // seperti ini TIDAK boleh terlihat lintas customer (includeShared: false).
  const sharedOrAllowed = [
    ...(allowed.length ? [{ customerId: { in: allowed } }] : []),
    ...(includeShared ? [{ customerId: null }] : []),
  ];

  if (reqCustomerId) {
    const cid = String(reqCustomerId);
    if (!allowed.includes(cid)) {
      where.customerId = '__NO_ACCESS_PERMITTED__';
    } else {
      where.customerId = cid;
    }
    return;
  }

  if (sharedOrAllowed.length === 0) {
    where.customerId = '__NO_ACCESS_PERMITTED__';
    return;
  }

  where.AND = [...(Array.isArray(where.AND) ? where.AND : []), { OR: sharedOrAllowed }];
}

// ── Ticket-level authorization (dipakai sub-resource: parts, notes, work items) ──
function ticketScopeAllowed(scope, ticket) {
  return Boolean(scope.isGlobal) || Boolean(ticket.customerId && scope.allowedCustomerIds.includes(ticket.customerId));
}

// Engineer/Staff boleh melihat tiket miliknya, tiket yang ia buat, dan antrean
// yang belum ditugaskan — sejalan dengan filter pada GET /tickets.
function ticketVisibleToActor(actor, ticket) {
  if (!isFieldRole(normalizeRole(actor.role)) || !actor.id) return true;
  return !ticket.assignedTo || ticket.assignedTo === actor.id || ticket.createdBy === actor.id;
}

// Untuk mutasi, engineer hanya boleh menyentuh tiket yang ditugaskan padanya
// atau tiket yang ia buat sendiri.
function ticketWritableByActor(actor, ticket) {
  if (!isFieldRole(normalizeRole(actor.role)) || !actor.id) return true;
  return ticket.assignedTo === actor.id || ticket.createdBy === actor.id;
}

async function loadTicketForActor(req, res, ticketId, options = {}) {
  const scope = await getCustomerScope(req);
  const ticket = await prisma.itOslTicket.findUnique({
    where: { id: String(ticketId) },
    select: { id: true, customerId: true, assignedTo: true, createdBy: true, status: true },
  });
  if (!ticket) {
    res.status(404).json({ message: 'Ticket not found' });
    return null;
  }
  if (!ticketScopeAllowed(scope, ticket)) {
    res.status(403).json({ message: 'Anda tidak memiliki akses ke tiket customer ini' });
    return null;
  }
  const actor = req.itOslActor || {};
  const allowed = options.write ? ticketWritableByActor(actor, ticket) : ticketVisibleToActor(actor, ticket);
  if (!allowed) {
    res.status(403).json({ message: 'Tiket ini ditugaskan ke teknisi lain' });
    return null;
  }
  return ticket;
}

// ── CUSTOMERS (Unified with Central Master Customer & RBAC Assignment) ──────
router.get('/customers', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { search, isActive } = req.query;
    
    // Only B2B (CORPORATE / not INDIVIDUAL)
    const where = {
      type: { not: 'INDIVIDUAL' }
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: String(search), mode: 'insensitive' } },
            { code: { contains: String(search), mode: 'insensitive' } },
            { phone: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
            { company: { contains: String(search), mode: 'insensitive' } },
          ]
        }
      ];
    }
    if (isActive !== undefined) where.isActive = isActive === 'true';

    if (!scope.isGlobal) {
      where.id = { in: scope.allowedCustomerIds };
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        itOslAssignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true } }
          }
        },
        pics: true,
        _count: {
          select: {
            itOslAssets: true,
            itOslTickets: true,
            itOslPics: true,
            itOslLocations: true,
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mapped = customers.map(c => ({
      ...c,
      assignedUsers: c.itOslAssignedUsers || [],
      _count: {
        assets: c._count?.itOslAssets || 0,
        tickets: c._count?.itOslTickets || 0,
        pics: (c._count?.itOslPics || 0) + (c.pics?.length || 0),
        locations: c._count?.itOslLocations || 0,
      }
    }));

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/customers/:id', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    if (!scope.isGlobal && !scope.allowedCustomerIds.includes(req.params.id)) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke customer ini' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        itOslLocations: { orderBy: { name: 'asc' } },
        itOslPics: { orderBy: { name: 'asc' } },
        pics: { orderBy: { name: 'asc' } },
        itOslAssets: { include: { location: true, pic: true }, orderBy: { name: 'asc' }, take: 50 },
        itOslAssignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true } }
          }
        },
        _count: {
          select: {
            itOslAssets: true,
            itOslTickets: true,
            itOslPics: true,
            itOslLocations: true,
          }
        }
      }
    });

    if (!customer) return res.status(404).json({ message: 'Customer tidak ditemukan' });

    const mapped = {
      ...customer,
      locations: customer.itOslLocations || [],
      pics: [...(customer.itOslPics || []), ...(customer.pics || [])],
      assets: customer.itOslAssets || [],
      assignedUsers: customer.itOslAssignedUsers || [],
      _count: {
        assets: customer._count?.itOslAssets || 0,
        tickets: customer._count?.itOslTickets || 0,
        pics: (customer._count?.itOslPics || 0) + (customer.pics?.length || 0),
        locations: customer._count?.itOslLocations || 0,
      }
    };

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/customers', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { code, name, type, company, phone, email, address, isActive, assignedUserIds } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama customer wajib diisi' });

    let custCode = (code || '').trim().toUpperCase();
    if (!custCode) {
      custCode = name.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || `CUST-${Date.now().toString().slice(-4)}`;
    }

    const existing = await prisma.customer.findUnique({ where: { code: custCode } });
    if (existing) {
      custCode = `${custCode}-${Date.now().toString().slice(-4)}`;
    }

    const customer = await prisma.customer.create({
      data: {
        code: custCode,
        name: name.trim(),
        type: type || 'CORPORATE',
        company: company ? company.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      }
    });

    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      for (const uid of assignedUserIds) {
        if (uid) {
          await prisma.itOslUserCustomer.create({
            data: { userId: uid, customerId: customer.id }
          }).catch(() => {});
        }
      }
    }

    const created = await prisma.customer.findUnique({
      where: { id: customer.id },
      include: {
        itOslAssignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        },
        _count: { select: { itOslAssets: true, itOslTickets: true, itOslPics: true, itOslLocations: true } }
      }
    });

    const mapped = {
      ...created,
      assignedUsers: created?.itOslAssignedUsers || [],
      _count: {
        assets: created?._count?.itOslAssets || 0,
        tickets: created?._count?.itOslTickets || 0,
        pics: created?._count?.itOslPics || 0,
        locations: created?._count?.itOslLocations || 0,
      }
    };

    res.status(201).json(mapped);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.put('/customers/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { code, name, type, company, phone, email, address, isActive, assignedUserIds } = req.body;
    const data = {};
    if (code !== undefined) data.code = code.trim().toUpperCase();
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (company !== undefined) data.company = company ? company.trim() : null;
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (email !== undefined) data.email = email ? email.trim() : null;
    if (address !== undefined) data.address = address ? address.trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    await prisma.customer.update({
      where: { id: req.params.id },
      data,
    });

    if (Array.isArray(assignedUserIds)) {
      await prisma.itOslUserCustomer.deleteMany({ where: { customerId: req.params.id } });
      for (const uid of assignedUserIds) {
        if (uid) {
          await prisma.itOslUserCustomer.create({
            data: { userId: uid, customerId: req.params.id }
          }).catch(() => {});
        }
      }
    }

    const updated = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        itOslAssignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        },
        _count: { select: { itOslAssets: true, itOslTickets: true, itOslPics: true, itOslLocations: true } }
      }
    });

    const mapped = {
      ...updated,
      assignedUsers: updated?.itOslAssignedUsers || [],
      _count: {
        assets: updated?._count?.itOslAssets || 0,
        tickets: updated?._count?.itOslTickets || 0,
        pics: updated?._count?.itOslPics || 0,
        locations: updated?._count?.itOslLocations || 0,
      }
    };

    res.json(mapped);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.post('/customers/:id/assign-technicians', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { assignedUserIds } = req.body;
    if (!Array.isArray(assignedUserIds)) {
      return res.status(400).json({ message: 'assignedUserIds harus berupa array' });
    }
    await prisma.itOslUserCustomer.deleteMany({ where: { customerId: req.params.id } });
    for (const uid of assignedUserIds) {
      if (uid) {
        await prisma.itOslUserCustomer.create({
          data: { userId: uid, customerId: req.params.id }
        }).catch(() => {});
      }
    }
    const updated = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        itOslAssignedUsers: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true } }
          }
        }
      }
    });
    res.json({ ok: true, assignedUsers: updated?.itOslAssignedUsers || [] });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.delete('/customers/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const assetCnt = await prisma.itOslAsset.count({ where: { customerId: req.params.id } });
    const ticketCnt = await prisma.itOslTicket.count({ where: { customerId: req.params.id } });
    if (assetCnt > 0 || ticketCnt > 0) {
      await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } });
      return res.json({ ok: true, message: 'Customer dinonaktifkan karena memiliki data aset/tiket terhubung' });
    }
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// ── USERS OPERASIONAL LIST FOR ASSIGNMENT ──────────────────────────────────
// Daftar user yang boleh dipilih sebagai penanggung jawab tiket (teknisi/lead).
// Tidak mengekspos data sensitif dan tidak memerlukan akses user-management.
router.get('/assignable-users', requirePermission('TICKET_CREATE'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['OPERATIONAL', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, name: true, role: true, department: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/users-operasional', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── LOCATIONS ──────────────────────────────────────────────────────────────
router.get('/locations', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { customerId } = req.query;
    const where = {};
    applyCustomerFilter(where, scope, customerId);

    const locs = await prisma.itOslLocation.findMany({
      where,
      include: { customer: true },
      orderBy: { name: 'asc' }
    });
    res.json(locs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/locations', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { code, name, address, customerId } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code & name wajib' });
    const loc = await prisma.itOslLocation.create({
      data: { code, name, address, customerId: customerId || null },
      include: { customer: true }
    });
    res.status(201).json(loc);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.put('/locations/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { code, name, address, customerId, isActive } = req.body;
    const data = {};
    if (code !== undefined) data.code = code;
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (customerId !== undefined) data.customerId = customerId || null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const loc = await prisma.itOslLocation.update({
      where: { id: req.params.id },
      data,
      include: { customer: true }
    });
    res.json(loc);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete('/locations/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try { await prisma.itOslLocation.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

// ── CATEGORIES ─────────────────────────────────────────────────────────────
router.get('/categories', requirePermission('VIEW'), async (req, res) => {
  try {
    const cats = await prisma.itOslCategory.findMany({ orderBy: [{ groupName: 'asc' }, { order: 'asc' }] });
    res.json(cats);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/categories', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { name, groupName, parentId, order } = req.body;
    if (!name || !groupName) return res.status(400).json({ message: 'name & groupName wajib' });
    const cat = await prisma.itOslCategory.create({ data: { name, groupName, parentId: parentId || null, order: order || 0 } });
    res.status(201).json(cat);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.put('/categories/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try { const cat = await prisma.itOslCategory.update({ where: { id: req.params.id }, data: req.body }); res.json(cat); }
  catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete('/categories/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try { await prisma.itOslCategory.delete({ where: { id: req.params.id } }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ message: e.message }); }
});

// ── PICS (Dedicated PIC Contact Directory) ─────────────────────────────────
router.get('/pics', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { search, locationId, department, isActive, customerId } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
        { department: { contains: String(search), mode: 'insensitive' } },
        { position: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (locationId) where.locationId = String(locationId);
    if (department) where.department = { contains: String(department), mode: 'insensitive' };
    if (isActive !== undefined) where.isActive = isActive === 'true';
    applyCustomerFilter(where, scope, customerId);

    const pics = await prisma.itOslPic.findMany({
      where,
      include: {
        location: true,
        customer: true,
        _count: { select: { assets: true, tickets: true } },
      },
      orderBy: [{ name: 'asc' }],
    });
    const enriched = pics.map(p => ({
      ...p,
      assetCount: p._count.assets,
      ticketCount: p._count.tickets,
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/pics/:id', requirePermission('VIEW'), async (req, res) => {
  try {
    const pic = await prisma.itOslPic.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        customer: true,
        assets: { include: { location: true }, orderBy: { name: 'asc' } },
        tickets: { include: { category: true, location: true }, orderBy: { createdAt: 'desc' }, take: 30 },
        _count: { select: { assets: true, tickets: true } },
      },
    });
    if (!pic) return res.status(404).json({ message: 'PIC not found' });
    res.json({ ...pic, assetCount: pic._count.assets, ticketCount: pic._count.tickets });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/pics', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { name, position, department, phone, email, locationId, customerId, notes, isActive } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Nama PIC wajib diisi' });
    const pic = await prisma.itOslPic.create({
      data: {
        name: name.trim(),
        position: position ? position.trim() : null,
        department: department ? department.trim() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        locationId: locationId || null,
        customerId: customerId || null,
        notes: notes ? notes.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: { location: true, customer: true },
    });
    res.status(201).json(pic);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put('/pics/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { name, position, department, phone, email, locationId, customerId, notes, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (position !== undefined) data.position = position ? position.trim() : null;
    if (department !== undefined) data.department = department ? department.trim() : null;
    if (phone !== undefined) data.phone = phone ? phone.trim() : null;
    if (email !== undefined) data.email = email ? email.trim() : null;
    if (locationId !== undefined) data.locationId = locationId || null;
    if (customerId !== undefined) data.customerId = customerId || null;
    if (notes !== undefined) data.notes = notes ? notes.trim() : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const pic = await prisma.itOslPic.update({
      where: { id: req.params.id },
      data,
      include: { location: true, customer: true },
    });
    res.json(pic);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.delete('/pics/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const assetCnt = await prisma.itOslAsset.count({ where: { picId: req.params.id } });
    const ticketCnt = await prisma.itOslTicket.count({ where: { picId: req.params.id } });
    if (assetCnt > 0 || ticketCnt > 0) {
      await prisma.itOslPic.update({ where: { id: req.params.id }, data: { isActive: false } });
      return res.json({ ok: true, message: 'PIC dinonaktifkan karena memiliki aset/tiket terhubung' });
    }
    await prisma.itOslPic.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.post('/pics/import', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { pics } = req.body;
    if (!Array.isArray(pics)) return res.status(400).json({ message: 'pics must be array' });
    let created = 0;
    for (const p of pics) {
      if (!p.name) continue;
      let locationId = p.locationId || null;
      if (!locationId && p.locationCode) {
        const loc = await prisma.itOslLocation.findUnique({ where: { code: p.locationCode } });
        if (loc) locationId = loc.id;
      }
      await prisma.itOslPic.create({
        data: {
          name: p.name.trim(),
          position: p.position || null,
          department: p.department || null,
          phone: p.phone || null,
          email: p.email || null,
          locationId,
          notes: p.notes || null,
          isActive: true,
        },
      });
      created++;
    }
    res.json({ created });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── ASSETS ─────────────────────────────────────────────────────────────────
router.get('/assets', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { search, status, locationId, picId, picUserId, assignedTo, customerId } = req.query;
    const where = {};
    if (search) where.OR = [{ name: { contains: String(search), mode: 'insensitive' } }, { assetCode: { contains: String(search), mode: 'insensitive' } }, { serialNumber: { contains: String(search), mode: 'insensitive' } }, { brandModel: { contains: String(search), mode: 'insensitive' } }];
    if (status) where.status = String(status);
    if (locationId) where.locationId = String(locationId);
    if (picId) where.picId = String(picId);
    const picUser = picUserId || assignedTo;
    if (picUser) where.picUserId = String(picUser);
    applyCustomerFilter(where, scope, customerId);

    const assets = await prisma.itOslAsset.findMany({
      where,
      include: {
        location: true,
        customer: true,
        pic: { select: { id: true, name: true, phone: true, department: true, position: true } },
        picUser: { select: { id: true, name: true, email: true } },
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    // Add recurring flag: ≥3 tickets same category 90d
    const enriched = await Promise.all(assets.map(async (a) => {
      const since = new Date(); since.setDate(since.getDate() - 90);
      const tickets = await prisma.itOslTicket.findMany({ where: { assetId: a.id, createdAt: { gte: since } }, select: { categoryId: true } });
      const byCat = {}; tickets.forEach(t => { byCat[t.categoryId] = (byCat[t.categoryId] || 0) + 1; });
      const recurring = Object.values(byCat).some(c => c >= 3);
      return { ...a, recurring, ticketCount: a._count.tickets };
    }));
    res.json(enriched);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.get('/assets/:id', requirePermission('VIEW'), async (req, res) => {
  try {
    const a = await prisma.itOslAsset.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        customer: true,
        pic: true,
        picUser: { select: { id: true, name: true } },
        tickets: { include: { category: true, location: true }, orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!a) return res.status(404).json({ message: 'Asset not found' });
    res.json(a);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/assets', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { assetCode, name, assetType, brandModel, serialNumber, locationId, customerId, purchaseDate, warrantyUntil, status, picId, picUserId, notes, photos } = req.body;
    if (!name) return res.status(400).json({ message: 'name wajib' });
    const code = assetCode || `AST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const asset = await prisma.itOslAsset.create({
      data: {
        assetCode: code,
        name, assetType: assetType || null, brandModel: brandModel || null, serialNumber: serialNumber || null,
        locationId: locationId || null,
        customerId: customerId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
        status: status || 'ACTIVE',
        picId: picId || null,
        picUserId: picUserId || null,
        notes: notes || null,
        photos: Array.isArray(photos) ? JSON.stringify(photos) : (typeof photos === 'string' ? photos : null),
      },
      include: { location: true, pic: true, customer: true },
    });
    await auditLog({ entityType: 'ASSET', entityId: asset.id, action: 'CREATE', newValue: name, actorUserId: req.headers['x-user-id'] || null, req });
    res.status(201).json(asset);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.put('/assets/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { name, assetType, brandModel, serialNumber, locationId, customerId, purchaseDate, warrantyUntil, status, notes, picId, picUserId, assetCode, photos } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (assetType !== undefined) data.assetType = assetType || null;
    if (brandModel !== undefined) data.brandModel = brandModel || null;
    if (serialNumber !== undefined) data.serialNumber = serialNumber || null;
    if (assetCode !== undefined) data.assetCode = assetCode;
    if (locationId !== undefined) data.locationId = locationId || null;
    if (customerId !== undefined) data.customerId = customerId || null;
    if (picId !== undefined) data.picId = picId || null;
    if (picUserId !== undefined) data.picUserId = picUserId || null;
    if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (warrantyUntil !== undefined) data.warrantyUntil = warrantyUntil ? new Date(warrantyUntil) : null;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (photos !== undefined) data.photos = Array.isArray(photos) ? JSON.stringify(photos) : (typeof photos === 'string' ? photos : null);
    const asset = await prisma.itOslAsset.update({
      where: { id: req.params.id },
      data,
      include: { location: true, pic: true, customer: true, picUser: { select: { id:true, name:true, email:true } } }
    });
    await auditLog({ entityType:'ASSET', entityId: asset.id, action:'UPDATE', newValue: JSON.stringify(data), actorUserId: req.headers['x-user-id']||null, req });
    res.json(asset);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete('/assets/:id', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    // prevent delete if has tickets
    const cnt = await prisma.itOslTicket.count({ where: { assetId: req.params.id } });
    if (cnt>0) return res.status(400).json({ message: `Aset dipakai ${cnt} tiket — ubah status jadi RETIRED saja, jangan hapus` });
    await prisma.itOslAsset.delete({ where: { id: req.params.id } });
    res.json({ ok:true });
  } catch(e){ res.status(400).json({ message:e.message }); }
});
router.post('/assets/import', requirePermission('MASTER_WRITE'), async (req, res) => {
  try {
    const { assets } = req.body; // array of {name, assetCode, assetType, brandModel, serialNumber, locationCode, ...}
    if (!Array.isArray(assets)) return res.status(400).json({ message: 'assets must be array' });
    let created = 0;
    for (const a of assets) {
      let locationId = a.locationId || null;
      if (!locationId && a.locationCode) {
        const loc = await prisma.itOslLocation.findUnique({ where: { code: a.locationCode } });
        if (loc) locationId = loc.id;
      }
      const code = a.assetCode || `AST-${Date.now()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
      await prisma.itOslAsset.upsert({
        where: { assetCode: code },
        update: { name: a.name, assetType: a.assetType, brandModel: a.brandModel, serialNumber: a.serialNumber, locationId, notes: a.notes },
        create: { assetCode: code, name: a.name || code, assetType: a.assetType, brandModel: a.brandModel, serialNumber: a.serialNumber || null, locationId, notes: a.notes },
      });
      created++;
    }
    res.json({ created });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── TICKETS ─────────────────────────────────────────────────────────────────
router.get('/tickets', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { status, severity, categoryId, locationId, assetId, picId, assignedTo, search, ticketType, from, to, pending, sla, customerId } = req.query;
    const where = {};
    if (status) where.status = String(status);
    if (severity) where.severity = String(severity);
    if (categoryId) where.categoryId = String(categoryId);
    if (locationId) where.locationId = String(locationId);
    if (assetId) where.assetId = String(assetId);
    if (picId) where.picId = String(picId);
    if (assignedTo) where.assignedTo = String(assignedTo);
    if (ticketType) where.ticketType = String(ticketType);
    applyCustomerFilter(where, scope, customerId, { includeShared: false });

    // PRD §2.2: Engineer/Staff hanya melihat tiket miliknya + antrean yang
    // belum ditugaskan. Lead/Admin/Manager melihat seluruh tiket.
    const actor = req.itOslActor || {};
    if (isFieldRole(normalizeRole(actor.role)) && actor.id) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: [{ assignedTo: actor.id }, { createdBy: actor.id }, { assignedTo: null }] },
      ];
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { summary: { contains: q, mode: 'insensitive' } },
        { reporterName: { contains: q, mode: 'insensitive' } },
        { location: { name: { contains: q, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: q, mode: 'insensitive' } } },
        { asset: { name: { contains: q, mode: 'insensitive' } } },
        { pic: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(String(from));
      if (to) where.createdAt.lte = new Date(String(to));
    }
    if (pending === 'true') where.status = 'PENDING';
    const limitNum = req.query.limit ? Math.min(Math.max(1, Number(req.query.limit)), 2000) : 1000;
    // sla filter: breach?
    const tickets = await prisma.itOslTicket.findMany({
      where,
      include: {
        location: true,
        category: true,
        customer: true,
        asset: { include: { location: true } },
        pic: { select: { id: true, name: true, phone: true, department: true, position: true } },
        assignedUser: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        pendings: { orderBy: { startedAt: 'desc' } },
        parts: true,
        attachments: true,
        _count: { select: { notes: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limitNum,
    });
    // enrich with SLA + duplicate hint
    const enriched = tickets.map(t => {
      const minutesSince = (Date.now() - new Date(t.createdAt).getTime()) / 60000;
      const thresh = slaThresholdMinutes(t.severity);
      let slaStatus = 'OK';
      if (t.status === 'NEW' && minutesSince > thresh) slaStatus = 'BREACH';
      else if (t.status !== 'CLOSED' && t.status !== 'CANCELLED' && t.status !== 'DUPLICATE') {
        if (t.acknowledgedAt) {
          const frt = (new Date(t.acknowledgedAt).getTime() - new Date(t.createdAt).getTime()) / 60000;
          if (frt > thresh) slaStatus = 'BREACH';
        } else if (minutesSince > thresh) slaStatus = 'BREACH';
      }
      return { ...t, slaStatus, frtMinutes: t.acknowledgedAt ? Math.round((new Date(t.acknowledgedAt).getTime() - new Date(t.createdAt).getTime()) / 60000) : null };
    });
    let filtered = enriched;
    if (sla === 'breach') filtered = enriched.filter(t => t.slaStatus === 'BREACH');
    res.json(filtered);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/tickets/:id', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const t = await prisma.itOslTicket.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        category: true,
        customer: true,
        asset: { include: { location: true } },
        pic: true,
        assignedUser: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        pendings: { orderBy: { startedAt: 'desc' } },
        parts: true,
        attachments: true,
        notes: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
        parentTicket: { select: { id: true, ticketNumber: true, summary: true } },
        childTickets: { select: { id: true, ticketNumber: true, summary: true, status: true } },
        workItems: { include: { attachments: true, creator: { select: { id:true, name:true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!t) return res.status(404).json({ message: 'Ticket not found' });
    if (!scope.isGlobal && (!t.customerId || !scope.allowedCustomerIds.includes(t.customerId))) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke tiket customer ini' });
    }
    if (!ticketVisibleToActor(req.itOslActor || {}, t)) {
      return res.status(403).json({ message: 'Tiket ini ditugaskan ke teknisi lain' });
    }
    res.json(t);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Quick-Log create (4 field wajib per PRD §4.2) + progressive disclosure
router.post('/tickets', requirePermission('TICKET_CREATE'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const {
      summary, locationId, categoryId, severity, ticketType, customerId,
      reporterName, reportChannel, reportedAt, assetId, picId,
      channel, // alias
      assignedTo, createdBy, clientTime,
    } = req.body;

    if (!summary || String(summary).trim().length < 5) return res.status(400).json({ message: 'Uraian minimal 5 karakter, contoh: Printer gudang tidak menyala' });
    if (String(summary).length > 150) return res.status(400).json({ message: 'Uraian maksimal 150 karakter' });
    if (!locationId) return res.status(400).json({ message: 'Lokasi wajib' });
    if (!categoryId) return res.status(400).json({ message: 'Kategori wajib' });

    // Validate location/category exist
    const loc = await prisma.itOslLocation.findUnique({ where: { id: locationId } });
    if (!loc) return res.status(400).json({ message: 'Lokasi tidak ditemukan' });
    const cat = await prisma.itOslCategory.findUnique({ where: { id: categoryId } });
    if (!cat) return res.status(400).json({ message: 'Kategori tidak ditemukan' });

    // Resolve customerId: lokasi adalah sumber kebenaran (mencegah tiket
    // ditempel ke customer lain dengan mengirim customerId palsu).
    let finalCustomerId = loc.customerId || customerId || null;
    if (!finalCustomerId && assetId) {
      const assetObj = await prisma.itOslAsset.findUnique({ where: { id: assetId }, select: { customerId: true } });
      if (assetObj?.customerId) finalCustomerId = assetObj.customerId;
    }

    if (!scope.isGlobal) {
      // `finalCustomerId` null = lokasi/data bersama (legacy), tetap boleh
      // dipakai engineer. Customer milik orang lain tetap ditolak.
      if (finalCustomerId && !scope.allowedCustomerIds.includes(finalCustomerId)) {
        return res.status(403).json({ message: 'Anda tidak memiliki hak akses untuk membuat tiket pada customer ini' });
      }
    }

    // Identitas pembuat selalu dari aktor terverifikasi, bukan body request.
    const actor = req.itOslActor || {};
    const createdByValue = actor.id || createdBy || null;
    // Engineer tidak boleh menugaskan tiket ke orang lain saat membuat tiket.
    let assignedToValue = assignedTo || createdByValue || null;
    if (isFieldRole(normalizeRole(actor.role)) && actor.id) {
      assignedToValue = actor.id;
    }

    // If picId provided, optionally lookup PIC name if reporterName is not provided
    let finalReporterName = reporterName || null;
    if (picId && !finalReporterName) {
      const picData = await prisma.itOslPic.findUnique({ where: { id: picId } });
      if (picData) finalReporterName = picData.name;
    }

    // duplicate hint check: same location+category within 2h active
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    const duplicate = await prisma.itOslTicket.findFirst({
      where: { locationId, categoryId, status: { in: ['NEW', 'IN_PROGRESS', 'PENDING', 'RESOLVED'] }, createdAt: { gte: twoHoursAgo } },
      select: { ticketNumber: true, id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const ticketNumber = await generateTicketNumber(tx);
      let sev = severity || 'MEDIUM';
      if (!['LOW','MEDIUM','CRITICAL'].includes(sev)) sev = 'MEDIUM';
      const reported = reportedAt ? new Date(reportedAt) : null;
      if (reported && reported > new Date()) throw new Error('Waktu Laporan tidak boleh > waktu sekarang');
      const t = await tx.itOslTicket.create({
        data: {
          ticketNumber,
          ticketType: ticketType || 'INCIDENT',
          summary: String(summary).trim(),
          reporterName: finalReporterName,
          reportChannel: reportChannel || channel || null,
          locationId,
          customerId: finalCustomerId,
          assetId: assetId || null,
          picId: picId || null,
          categoryId,
          severity: sev,
          status: 'NEW',
          assignedTo: assignedToValue,
          createdBy: createdByValue,
          reportedAt: reported,
          clientTime: clientTime ? new Date(clientTime) : null,
        },
        include: { location: true, category: true, asset: true, pic: true, customer: true },
      });
      await tx.itOslAuditLog.create({
        data: { entityType: 'TICKET', entityId: t.id, action: 'CREATE', newValue: summary, actorUserId: createdByValue, ticketId: t.id },
      });
      return t;
    });

    res.status(201).json({ ...result, duplicateHint: duplicate || null });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Generic status transition endpoint
router.patch('/tickets/:id/status', requirePermission('TICKET_EDIT'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { to, actorUserId: bodyActorUserId, reason, notes, externalParty, expectedResumeAt, rootCause, correctiveAction, solutionCategory, assetCondition, isPreventable } = req.body;
    const actor = req.itOslActor || {};
    const actorRole = normalizeRole(actor.role);
    const actorUserId = actor.id || null;
    const isAdmin = isGlobalRole(actorRole);
    const canManageAll = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(actorRole);
    const id = req.params.id;
    const ticket = await prisma.itOslTicket.findUnique({ where: { id }, include: { pendings: true } });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!scope.isGlobal && (!ticket.customerId || !scope.allowedCustomerIds.includes(ticket.customerId))) {
      return res.status(403).json({ message: 'Anda tidak memiliki hak akses memproses tiket customer ini' });
    }
    const from = ticket.status;
    const target = String(to).toUpperCase();
    // Allow REOPENED alias
    if (!canTransition(from, target)) {
      return res.status(400).json({ message: `Transisi ${from} → ${target} tidak diizinkan per state machine` });
    }
    // ── Otorisasi aksi per PRD §2.2 ──────────────────────────────────────────
    // Engineer/Staff hanya boleh memproses tiket miliknya / yang ditugaskan
    // padanya. Lead/Admin/Manager boleh memproses semua tiket.
    if (target === 'DUPLICATE' || target === 'CANCELLED') {
      if (!isAdmin) return res.status(403).json({ message: 'Hanya Lead/Admin dapat membatalkan/menandai duplikat' });
    }
    if (target === 'CLOSED' && !canManageAll) {
      // izin khusus: auto-close oleh pemegang tiket setelah 2x24 jam
      const age = Date.now() - new Date(ticket.resolvedAt || ticket.updatedAt).getTime();
      const twoDays = 2 * 24 * 3600 * 1000;
      if (!(age >= twoDays && ticket.assignedTo === actorUserId)) {
        return res.status(403).json({ message: 'Hanya Lead/Admin dapat menutup tiket' });
      }
    }
    if (!canManageAll) {
      const ownsTicket = !!actorUserId && (ticket.assignedTo === actorUserId || ticket.createdBy === actorUserId);
      if (ticket.assignedTo) {
        if (!ownsTicket) return res.status(403).json({ message: 'Tiket ini ditugaskan ke teknisi lain' });
      } else if (!(from === 'NEW' && target === 'IN_PROGRESS')) {
        return res.status(403).json({ message: 'Tiket belum ditugaskan kepada Anda' });
      }
    }
    if (from === 'CLOSED' && target === 'REOPENED' && !canManageAll) {
      const age = Date.now() - new Date(ticket.closedAt || ticket.updatedAt).getTime();
      if (age > 24 * 3600 * 1000) {
        return res.status(403).json({ message: 'Reopen oleh engineer dibatasi 24 jam; hubungi Lead/Admin' });
      }
      if (ticket.assignedTo !== actorUserId && ticket.createdBy !== actorUserId) {
        return res.status(403).json({ message: 'Hanya pemilik tiket yang dapat reopen' });
      }
    }

    const now = new Date();
    const data = { status: target, updatedAt: now };
    // timestamp mapping per §3.2
    if (target === 'IN_PROGRESS') {
      // Klaim tiket yang belum ditugaskan oleh engineer yang mengerjakan
      if (!ticket.assignedTo && actorUserId) data.assignedTo = actorUserId;
      if (!ticket.acknowledgedAt) data.acknowledgedAt = now;
      // if coming from PENDING, close pending cycle
      if (from === 'PENDING') {
        const openPend = await prisma.itOslTicketPending.findFirst({ where: { ticketId: id, endedAt: null }, orderBy: { startedAt: 'desc' } });
        if (openPend) {
          const sec = Math.round((now.getTime() - new Date(openPend.startedAt).getTime()) / 1000);
          await prisma.itOslTicketPending.update({ where: { id: openPend.id }, data: { endedAt: now } });
          // denormalize
          data.totalPendingSec = (ticket.totalPendingSec || 0) + sec;
        }
      }
      if (from === 'RESOLVED') data.reopenedCount = (ticket.reopenedCount || 0) + 1;
      if (from === 'CLOSED' && target === 'REOPENED') {
        // REOPENED then immediate IN_PROGRESS logic handled by caller sending REOPENED ? But we store REOPENED then next call
      }
    }
    if (target === 'PENDING') {
      if (!reason) return res.status(400).json({ message: 'Alasan Tertahan wajib' });
      if (!expectedResumeAt) return res.status(400).json({ message: 'Estimasi Tindak Lanjut wajib' });
      const exp = new Date(expectedResumeAt);
      if (exp <= now) return res.status(400).json({ message: 'Estimasi harus > waktu sekarang' });
      await prisma.itOslTicketPending.create({
        data: {
          ticketId: id,
          reason,
          externalParty: externalParty || null,
          notes: notes || null,
          expectedResumeAt: exp,
          startedAt: now,
          createdBy: actorUserId || null,
        },
      });
      data.totalPendingSec = ticket.totalPendingSec || 0;
    }
    if (target === 'RESOLVED') {
      if (!rootCause || String(rootCause).trim().length < 15) return res.status(400).json({ message: 'Akar Masalah minimal 15 karakter, jelaskan mengapa, contoh: Port RJ45 korosi akibat kelembapan' });
      if (!correctiveAction || String(correctiveAction).trim().length < 15) return res.status(400).json({ message: 'Tindakan Perbaikan minimal 15 karakter' });
      if (['error','rusak','sudah normal'].includes(String(rootCause).trim().toLowerCase())) return res.status(400).json({ message: 'Akar Masalah terlalu generik' });
      if (!assetCondition) return res.status(400).json({ message: 'Status Akhir Aset wajib' });
      if (!solutionCategory) return res.status(400).json({ message: 'Kategori Solusi wajib' });
      if (ticket.severity === 'CRITICAL') {
        const attachCount = await prisma.itOslTicketAttachment.count({ where: { ticketId: id } });
        if (attachCount === 0) return res.status(400).json({ message: 'Bukti Dokumentasi wajib untuk Critical' });
      }
      data.rootCause = rootCause;
      data.correctiveAction = correctiveAction;
      data.solutionCategory = solutionCategory;
      data.assetCondition = assetCondition;
      data.isPreventable = isPreventable != null ? !!isPreventable : null;
      data.resolvedAt = now;
      // if BROKEN -> auto create follow-up? We'll create child REQUEST ticket
      if (assetCondition === 'BROKEN' && ticket.assetId) {
        // create follow-up procurement REQUEST (async after update)
      }
    }
    if (target === 'CLOSED' || target === 'CANCELLED' || target === 'DUPLICATE') {
      data.closedAt = now;
    }
    if (target === 'REOPENED') {
      data.reopenedCount = (ticket.reopenedCount || 0) + 1;
      // REOPENED is transient: immediately set to IN_PROGRESS? For audit, keep REOPENED then client should call IN_PROGRESS next.
      // We'll store REOPENED and require next transition.
    }

    const updated = await prisma.itOslTicket.update({ where: { id }, data });
    await auditLog({ entityType: 'TICKET', entityId: id, action: 'STATUS_CHANGE', fieldName: 'status', oldValue: from, newValue: target, actorUserId: actorUserId || null, ticketId: id, req });

    // Auto follow-up for BROKEN
    if (target === 'RESOLVED' && assetCondition === 'BROKEN' && ticket.assetId) {
      try {
        const ticketNumber = await prisma.$transaction(async (tx) => generateTicketNumber(tx));
        await prisma.itOslTicket.create({
          data: {
            ticketNumber,
            ticketType: 'REQUEST',
            summary: `Pengadaan pengganti aset ${ticket.assetId} — tindak lanjut ${ticket.ticketNumber}`,
            locationId: ticket.locationId,
            customerId: ticket.customerId || null,
            categoryId: ticket.categoryId,
            severity: 'MEDIUM',
            status: 'NEW',
            parentTicketId: id,
            createdBy: actorUserId || null,
          },
        });
      } catch (e) { console.error('follow-up create failed', e.message); }
    }

    res.json(updated);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Update ticket details (limited fields before closed)
router.put('/tickets/:id', requirePermission('TICKET_EDIT'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const t = await prisma.itOslTicket.findUnique({ where: { id: req.params.id } });
    if (!t) return res.status(404).json({ message: 'Ticket not found' });
    if (!scope.isGlobal && (!t.customerId || !scope.allowedCustomerIds.includes(t.customerId))) {
      return res.status(403).json({ message: 'Anda tidak memiliki izin mengubah tiket customer ini' });
    }
    if (['CLOSED','CANCELLED','DUPLICATE'].includes(t.status)) return res.status(403).json({ message: 'Tiket terminal read-only' });
    const actor = req.itOslActor || {};
    const actorRole = normalizeRole(actor.role);
    const canManageAll = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(actorRole);
    if (!canManageAll) {
      const ownsTicket = !!actor.id && (t.assignedTo === actor.id || t.createdBy === actor.id);
      if (!ownsTicket) return res.status(403).json({ message: 'Hanya pemilik/pemegang tiket yang dapat mengubah detail' });
    }
    const allowed = ['summary','severity','categoryId','locationId','assetId','picId','assignedTo','reporterName','reportChannel'];
    const data = {};
    for (const k of allowed) if (req.body[k] !== undefined) data[k] = req.body[k];
    // Hanya Lead/Admin/Manager yang boleh memindahkan penanggung jawab tiket
    if (!canManageAll) delete data.assignedTo;
    const updated = await prisma.itOslTicket.update({
      where: { id: req.params.id },
      data,
      include: { location: true, category: true, asset: true, pic: true, assignedUser: { select: { id: true, name: true, email: true } } }
    });
    await auditLog({ entityType: 'TICKET', entityId: t.id, action: 'UPDATE', newValue: JSON.stringify(data), actorUserId: actor.id || null, ticketId: t.id, req });
    res.json(updated);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Delete ticket (admin only)
router.delete('/tickets/:id', requirePermission('TICKET_DELETE'), async (req, res) => {
  if(!requireAdmin(req,res)) return
  try{
    await prisma.itOslTicket.delete({ where:{ id: req.params.id }})
    await prisma.itOslAuditLog.create({ data:{ entityType:'TICKET', entityId:req.params.id, action:'DELETE', actorUserId: req.headers['x-user-id'] || null }})
    res.json({ ok:true })
  }catch(e){ res.status(400).json({ message:e.message })}
});
// Bulk delete (admin) — body {ids: string[]} or ?all=true for trial wipe
router.post('/tickets/bulk-delete', requirePermission('TICKET_DELETE'), async (req,res)=>{
  if(!requireAdmin(req,res)) return
  try{
    const { ids, all } = req.body || {}
    let count=0
    if(all){
      const del = await prisma.itOslTicket.deleteMany({})
      count = del.count
    } else if(Array.isArray(ids) && ids.length){
      const del = await prisma.itOslTicket.deleteMany({ where:{ id:{ in: ids }}})
      count = del.count
    } else return res.status(400).json({ message:'ids[] atau all=true wajib' })
    res.json({ ok:true, count })
  }catch(e){ res.status(400).json({ message:e.message })}
});

// Parts
router.post('/tickets/:id/parts', requirePermission('TICKET_EDIT'), async (req, res) => {
  try {
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const part = await prisma.itOslTicketPart.create({ data: { ticketId: ticket.id, partName: req.body.partName, quantity: Number(req.body.quantity) || 1, unit: req.body.unit || 'pcs', notes: req.body.notes || null } });
    res.status(201).json(part);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.delete('/tickets/:ticketId/parts/:partId', requirePermission('TICKET_EDIT'), async (req, res) => {
  if(!requireAdmin(req,res)) return
  try {
    const part = await prisma.itOslTicketPart.findUnique({ where: { id: req.params.partId }, select: { ticketId: true } });
    if (!part || part.ticketId !== req.params.ticketId) return res.status(404).json({ message: 'Part not found pada tiket ini' });
    await prisma.itOslTicketPart.delete({ where: { id: req.params.partId } }); res.json({ ok: true });
  }
  catch (e) { res.status(400).json({ message: e.message }); }
});

// Attachments (expects url already uploaded via /api/upload generic)
router.post('/tickets/:id/attachments', requirePermission('TICKET_EDIT'), async (req, res) => {
  try {
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const { url, fileName, mimeType, type } = req.body;
    if (!url) return res.status(400).json({ message: 'url wajib' });
    const att = await prisma.itOslTicketAttachment.create({ data: { ticketId: ticket.id, url, fileName, mimeType, type: type || 'INITIAL' } });
    res.status(201).json(att);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Notes
router.post('/tickets/:id/notes', requirePermission('TICKET_EDIT'), async (req, res) => {
  try {
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const actor = req.itOslActor || {};
    const note = await prisma.itOslTicketNote.create({ data: { ticketId: ticket.id, content: req.body.content, userId: actor.id || null } });
    res.status(201).json(note);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Reassign
router.post('/tickets/:id/reassign', requirePermission('TICKET_ASSIGN'), async (req, res) => {
  try {
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const { toUserId, reason } = req.body;
    const actor = req.itOslActor || {};
    const previousAssignee = ticket.assignedTo;
    const t = await prisma.itOslTicket.update({ where: { id: ticket.id }, data: { assignedTo: toUserId } });
    await auditLog({ entityType: 'TICKET', entityId: t.id, action: 'REASSIGN', oldValue: previousAssignee, newValue: toUserId, actorUserId: actor.id || null, ticketId: t.id, req });
    if (reason) await prisma.itOslTicketNote.create({ data: { ticketId: t.id, content: `Dialihkan: ${reason}`, userId: actor.id || null } });
    res.json(t);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── WORK ITEMS (Item Pekerjaan per Fase: ANALISA, PENGERJAAN, HASIL) ──────
// 1 tiket bisa punya banyak item per fase, tiap item bisa lampirkan >1 foto
router.post('/upload', requirePermission('TICKET_CREATE'), uploadMem.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const url = await processItOslImage(req.file);
    res.json({ url });
  } catch(e){ res.status(500).json({ message:e.message })}
});
router.post('/upload-multi', requirePermission('TICKET_CREATE'), uploadMem.array('photos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length===0) return res.status(400).json({ message:'No files' });
    const urls = [];
    for(const f of req.files){ urls.push(await processItOslImage(f)); }
    res.json({ urls });
  } catch(e){ res.status(500).json({ message:e.message })}
});

router.get('/tickets/:id/work-items', requirePermission('VIEW'), async (req,res)=>{
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id);
    if (!ticket) return;
    const { phase } = req.query;
    const where = { ticketId: ticket.id };
    if(phase) where.phase = String(phase).toUpperCase();
    const items = await prisma.itOslTicketWorkItem.findMany({ where, include:{ attachments:true, creator:{ select:{ id:true, name:true }}}, orderBy:{ createdAt:'asc'}});
    res.json(items);
  }catch(e){ res.status(500).json({ message:e.message })}
});

router.post('/tickets/:id/work-items', requirePermission('TICKET_EDIT'), async (req,res)=>{
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const { phase, title, description } = req.body;
    const p = String(phase||'ANALISA').toUpperCase();
    if(!['ANALISA','PENGERJAAN','HASIL'].includes(p)) return res.status(400).json({ message:'phase harus ANALISA/PENGERJAAN/HASIL' });
    if(!description || String(description).trim().length<5) return res.status(400).json({ message:'Uraian item minimal 5 karakter' });
    if(['CLOSED','CANCELLED','DUPLICATE'].includes(ticket.status)) return res.status(403).json({ message:'Tiket terminal read-only' });
    const actor = req.itOslActor || {};
    const item = await prisma.itOslTicketWorkItem.create({
      data:{ ticketId: ticket.id, phase:p, title: title||null, description: String(description).trim(), status:'OPEN', createdBy: actor.id || null },
      include:{ attachments:true }
    });
    await auditLog({ entityType:'TICKET', entityId: ticket.id, action:'WORKITEM_CREATE', fieldName:p, newValue: description, actorUserId: actor.id || null, ticketId: ticket.id, req });
    res.status(201).json(item);
  }catch(e){ res.status(400).json({ message:e.message })}
});

router.put('/tickets/:id/work-items/:workItemId', requirePermission('TICKET_EDIT'), async (req,res)=>{
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const existing = await prisma.itOslTicketWorkItem.findUnique({ where:{ id:req.params.workItemId }, select:{ ticketId:true } });
    if (!existing || existing.ticketId !== ticket.id) return res.status(404).json({ message:'Work item tidak ditemukan pada tiket ini' });
    const { title, description, status, phase } = req.body;
    const data = {};
    if(title!==undefined) data.title = title||null;
    if(description!==undefined) data.description = String(description);
    if(status!==undefined) data.status = status;
    if(phase!==undefined) data.phase = String(phase).toUpperCase();
    const item = await prisma.itOslTicketWorkItem.update({ where:{ id:req.params.workItemId }, data, include:{ attachments:true }});
    res.json(item);
  }catch(e){ res.status(400).json({ message:e.message })}
});

router.delete('/tickets/:id/work-items/:workItemId', requirePermission('TICKET_EDIT'), async (req,res)=>{
  if(!requireAdmin(req,res)) return
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const existing = await prisma.itOslTicketWorkItem.findUnique({ where:{ id:req.params.workItemId }, select:{ ticketId:true } });
    if (!existing || existing.ticketId !== ticket.id) return res.status(404).json({ message:'Work item tidak ditemukan pada tiket ini' });
    await prisma.itOslTicketWorkItem.delete({ where:{ id:req.params.workItemId }});
    await prisma.itOslAuditLog.create({ data:{ entityType:'TICKET', entityId:ticket.id, action:'WORKITEM_DELETE', actorUserId: req.itOslActor?.id || null, ticketId: ticket.id }})
    res.json({ ok:true });
  }catch(e){ res.status(400).json({ message:e.message })}
});

router.post('/tickets/:id/work-items/:workItemId/attachments', requirePermission('TICKET_EDIT'), async (req,res)=>{
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const existing = await prisma.itOslTicketWorkItem.findUnique({ where:{ id:req.params.workItemId }, select:{ ticketId:true } });
    if (!existing || existing.ticketId !== ticket.id) return res.status(404).json({ message:'Work item tidak ditemukan pada tiket ini' });
    const { url, fileName, mimeType } = req.body;
    if(!url) return res.status(400).json({ message:'url wajib' });
    const att = await prisma.itOslTicketWorkItemAttachment.create({ data:{ workItemId: req.params.workItemId, url, fileName: fileName||null, mimeType: mimeType||null }});
    res.status(201).json(att);
  }catch(e){ res.status(400).json({ message:e.message })}
});

router.post('/tickets/:id/work-items/:workItemId/photos', requirePermission('TICKET_EDIT'), uploadMem.array('photos', 10), async (req,res)=>{
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const existing = await prisma.itOslTicketWorkItem.findUnique({ where:{ id:req.params.workItemId }, select:{ ticketId:true } });
    if (!existing || existing.ticketId !== ticket.id) return res.status(404).json({ message:'Work item tidak ditemukan pada tiket ini' });
    if(!req.files || req.files.length===0) return res.status(400).json({ message:'No files' });
    const created = [];
    for(const f of req.files){
      const url = await processItOslImage(f);
      const att = await prisma.itOslTicketWorkItemAttachment.create({ data:{ workItemId: req.params.workItemId, url, fileName: f.originalname, mimeType: f.mimetype }});
      created.push(att);
    }
    res.status(201).json(created);
  }catch(e){ res.status(500).json({ message:e.message })}
});

router.delete('/tickets/:id/work-items/:workItemId/attachments/:attachmentId', requirePermission('TICKET_EDIT'), async (req,res)=>{
  if(!requireAdmin(req,res)) return
  try{
    const ticket = await loadTicketForActor(req, res, req.params.id, { write: true });
    if (!ticket) return;
    const existing = await prisma.itOslTicketWorkItem.findUnique({ where:{ id:req.params.workItemId }, select:{ ticketId:true } });
    if (!existing || existing.ticketId !== ticket.id) return res.status(404).json({ message:'Work item tidak ditemukan pada tiket ini' });
    const att = await prisma.itOslTicketWorkItemAttachment.findUnique({ where:{ id:req.params.attachmentId }, select:{ workItemId:true } });
    if (!att || att.workItemId !== req.params.workItemId) return res.status(404).json({ message:'Lampiran tidak ditemukan pada work item ini' });
    await prisma.itOslTicketWorkItemAttachment.delete({ where:{ id:req.params.attachmentId }});
    res.json({ ok:true });
  }catch(e){ res.status(400).json({ message:e.message })}
});

// ── DASHBOARD KPIs ───────────────────────────────────────────────────────────
router.get('/dashboard', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { from, to, customerId } = req.query;
    const start = from ? new Date(String(from)) : new Date(new Date().setHours(0,0,0,0));
    const end = to ? new Date(String(to)) : new Date();
    
    const whereRange = { createdAt: { gte: start, lte: end } };
    applyCustomerFilter(whereRange, scope, customerId, { includeShared: false });

    const wherePending = { status: 'PENDING' };
    applyCustomerFilter(wherePending, scope, customerId, { includeShared: false });

    const whereCritical = { severity: 'CRITICAL', status: { in: ['NEW','IN_PROGRESS','PENDING'] } };
    applyCustomerFilter(whereCritical, scope, customerId, { includeShared: false });

    const whereResolved = { status: { in: ['RESOLVED','CLOSED'] }, resolvedAt: { not: null }, acknowledgedAt: { not: null }, ticketType: { not: 'REQUEST' } };
    applyCustomerFilter(whereResolved, scope, customerId, { includeShared: false });

    const [total, byStatus, bySeverity, pendingOver, criticalBreach, recent] = await Promise.all([
      prisma.itOslTicket.count({ where: whereRange }),
      prisma.itOslTicket.groupBy({ by: ['status'], where: whereRange, _count: { _all: true } }),
      prisma.itOslTicket.groupBy({ by: ['severity'], where: whereRange, _count: { _all: true } }),
      prisma.itOslTicket.count({ where: wherePending }),
      // critical breach >15m
      prisma.itOslTicket.findMany({ where: whereCritical, select: { createdAt: true, acknowledgedAt: true, ticketNumber: true, summary: true, id: true } }),
      prisma.itOslTicket.findMany({ where: whereRange, include: { location: true, category: true, customer: true }, orderBy: { updatedAt: 'desc' }, take: 10 }),
    ]);
    const breachCritical = criticalBreach.filter(t => {
      const thresh = 15;
      if (t.acknowledgedAt) { const frt = (new Date(t.acknowledgedAt).getTime() - new Date(t.createdAt).getTime())/60000; return frt > thresh; }
      const mins = (Date.now() - new Date(t.createdAt).getTime())/60000; return mins > thresh;
    });
    // MTTR avg
    const resolved = await prisma.itOslTicket.findMany({ where: whereResolved, select: { acknowledgedAt: true, resolvedAt: true, totalPendingSec: true } });
    let avgMttrMin = 0;
    if (resolved.length >= 1) {
      const sum = resolved.reduce((s, r) => {
        const raw = (new Date(r.resolvedAt).getTime() - new Date(r.acknowledgedAt).getTime())/60000;
        const waiting = (r.totalPendingSec||0)/60;
        return s + (raw - waiting);
      }, 0);
      avgMttrMin = Math.round(sum / resolved.length);
    }
    const whereActive = { status: { in: ['NEW','IN_PROGRESS','PENDING'] } };
    applyCustomerFilter(whereActive, scope, customerId, { includeShared: false });
    const active = await prisma.itOslTicket.count({ where: whereActive });
    res.json({
      total, active, pendingOver, avgMttrMin,
      byStatus: Object.fromEntries(byStatus.map(b => [b.status, b._count._all])),
      bySeverity: Object.fromEntries(bySeverity.map(b => [b.severity, b._count._all])),
      breachCritical: breachCritical.length,
      breachList: breachCritical.slice(0,5),
      recent,
      slaCompliance: total ? Math.round(((total - breachCritical.length)/ total)*100) : 100,
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── REPORTS ──────────────────────────────────────────────────────────────────
router.get('/reports/daily', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { date, customerId } = req.query;
    const dateStr = date ? String(date) : new Date().toISOString().slice(0,10);
    const d = new Date(dateStr + 'T00:00:00');
    const next = new Date(d); next.setDate(d.getDate()+1);
    
    const where = { createdAt: { gte: d, lt: next } };
    applyCustomerFilter(where, scope, customerId, { includeShared: false });

    const tickets = await prisma.itOslTicket.findMany({
      where,
      include: { category: true, location: true, customer: true, parts: true },
      orderBy: { createdAt: 'asc' },
    });
    const done = tickets.filter(t => ['RESOLVED','CLOSED'].includes(t.status)).length;
    const pending = tickets.filter(t => t.status === 'PENDING').length;
    let avgFrt = 0;
    const withFrt = tickets.filter(t => t.acknowledgedAt);
    if (withFrt.length) avgFrt = Math.round(withFrt.reduce((s,t)=> s + (new Date(t.acknowledgedAt).getTime()- new Date(t.createdAt).getTime())/60000,0)/withFrt.length);
    const partsAgg = {};
    tickets.forEach(t => t.parts.forEach(p => { const k = p.partName; partsAgg[k] = (partsAgg[k]||0)+ p.quantity; }));

    const whereAsset = {};
    applyCustomerFilter(whereAsset, scope, customerId, { includeShared: false });
    const recurring = await prisma.itOslAsset.findMany({ where: whereAsset, include: { tickets: { where: { createdAt: { gte: new Date(Date.now()-90*24*3600*1000) } }, select: { categoryId: true } } } });
    const recurringList = recurring.filter(a => {
      const m = {}; a.tickets.forEach(t=>{ m[t.categoryId]=(m[t.categoryId]||0)+1}); return Object.values(m).some(c=>c>=3);
    }).map(a=> ({ id:a.id, name:a.name, assetCode:a.assetCode }));
    // Generate text report ready to copy (per PRD §8.1)
    const dayName = d.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    let text = `📋 LAPORAN HARIAN IT SUPPORT\n📅 ${dayName}\n─────────────────────────────\n• Total insiden ditangani : ${tickets.length}\n• Selesai                 : ${done}\n• Masih tertahan          : ${pending}\n• Rata-rata waktu respon  : ${avgFrt} menit\n\n🔧 RINGKASAN PEKERJAAN\n`;
    tickets.forEach((t,i)=>{
      const st = t.status === 'PENDING' ? 'PENDING' : (['RESOLVED','CLOSED'].includes(t.status) ? 'Selesai' : t.status);
      text += `${i+1}. [${st}] ${t.category.groupName || t.category.name} — ${t.summary}\n`;
      if (t.correctiveAction) text += `   → ${t.correctiveAction}\n`;
    });
    if (Object.keys(partsAgg).length) {
      text += `\n🔩 SUKU CADANG TERPAKAI\n`;
      Object.entries(partsAgg).forEach(([k,v])=> text += `• ${k} — ${v} pcs\n`);
    }
    if (recurringList.length) {
      text += `\n⚠️ PERLU PERHATIAN\n`;
      recurringList.slice(0,3).forEach(a=> text += `• ${a.name} (${a.assetCode}) sering bermasalah\n`);
    }
    res.json({ date: dateStr, tickets, done, pending, avgFrt, partsAgg, recurringList, text });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

router.get('/reports/monthly', requirePermission('REPORT_FULL'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { ym: reqYm, customerId } = req.query;
    const ym = reqYm ? String(reqYm) : new Date().toISOString().slice(0,7); // YYYY-MM
    const [y,m] = ym.split('-').map(Number);
    const start = new Date(y, m-1, 1);
    const end = new Date(y, m, 1);
    
    const where = { createdAt: { gte: start, lt: end } };
    applyCustomerFilter(where, scope, customerId, { includeShared: false });

    const tickets = await prisma.itOslTicket.findMany({ where, include: { category: true, location: true, customer: true, asset: true } });
    const byCategory = {};
    tickets.forEach(t => { const k = t.category.groupName || t.category.name; byCategory[k]=(byCategory[k]||0)+1; });
    const bySeverity = {};
    tickets.forEach(t => { bySeverity[t.severity]=(bySeverity[t.severity]||0)+1; });
    const byStatus = {};
    tickets.forEach(t => { byStatus[t.status]=(byStatus[t.status]||0)+1; });
    // SLA compliance per severity
    const breach = tickets.filter(t => {
      const thresh = t.severity === 'CRITICAL' ? 15 : t.severity === 'MEDIUM' ? 60 : 240;
      if (t.acknowledgedAt) { const frt=(new Date(t.acknowledgedAt).getTime()- new Date(t.createdAt).getTime())/60000; return frt>thresh; }
      const mins=(Date.now()- new Date(t.createdAt).getTime())/60000; return t.status==='NEW' && mins>thresh;
    }).length;
    res.json({ ym, total: tickets.length, byCategory, bySeverity, byStatus, breach, tickets });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PM SCHEDULES ─────────────────────────────────────────────────────────────
router.get('/pm/schedules', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const { customerId } = req.query;
    const where = {};
    applyCustomerFilter(where, scope, customerId);

    const list = await prisma.itOslPmSchedule.findMany({
      where,
      include: { location: true, asset: true, customer: true, checkItems: true, _count: { select: { executions: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/pm/schedules', requirePermission('PM_PLAN'), async (req, res) => {
  try {
    const { title, description, frequency, locationId, assetId, customerId, checkItems } = req.body;
    if (!title) return res.status(400).json({ message: 'title wajib' });
    const actor = req.itOslActor || {};
    const s = await prisma.itOslPmSchedule.create({
      data: {
        title, description: description || null, frequency: frequency || 'WEEKLY',
        locationId: locationId || null, assetId: assetId || null, customerId: customerId || null, createdBy: actor.id || null,
        checkItems: checkItems && Array.isArray(checkItems) ? { create: checkItems.map((n,i)=>({ name: String(n.name||n), order: i })) } : undefined,
      },
      include: { checkItems: true, customer: true },
    });
    res.status(201).json(s);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.post('/pm/schedules/:id/execute', requirePermission('PM_EXECUTE'), async (req, res) => {
  try {
    const schedule = await prisma.itOslPmSchedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) return res.status(404).json({ message: 'Jadwal PM tidak ditemukan' });
    const scope = await getCustomerScope(req);
    if (!ticketScopeAllowed(scope, { customerId: schedule.customerId })) {
      return res.status(403).json({ message: 'Anda tidak memiliki akses ke jadwal PM customer ini' });
    }
    const actor = req.itOslActor || {};
    const { notes, items } = req.body; // items: [{checkItemId,name,result,notes}]
    const exec = await prisma.itOslPmExecution.create({
      data: {
        scheduleId: schedule.id,
        executedBy: actor.id || null,
        notes: notes || null,
        status: (items||[]).some(i=> i.result==='ISSUE') ? 'ISSUE_FOUND' : 'COMPLETED',
        items: { create: (items||[]).map(it=> ({ checkItemId: it.checkItemId || null, name: it.name, result: it.result || 'NORMAL', notes: it.notes || null })) },
      },
      include: { items: true },
    });
    // auto-create incident tickets for ISSUE items
    const issues = (items||[]).filter(i=> i.result==='ISSUE');
    for (const iss of issues) {
      const cat = await prisma.itOslCategory.findFirst({ where: { groupName: { contains: 'Infrastruktur', mode: 'insensitive' } } });
      if (!cat) continue;
      const locationId = schedule.locationId || (schedule.customerId
        ? (await prisma.itOslLocation.findFirst({ where: { customerId: schedule.customerId }, select: { id: true } }))?.id
        : null);
      if (!locationId) continue;
      const ticketNumber = await prisma.$transaction(async (tx)=> generateTicketNumber(tx));
      await prisma.itOslTicket.create({
        data: {
          ticketNumber,
          ticketType: 'PM',
          summary: `PM Temuan: ${iss.name} — ${schedule.title}`,
          locationId,
          categoryId: cat.id,
          customerId: schedule.customerId || null,
          severity: 'MEDIUM',
          status: 'NEW',
          createdBy: actor.id || null,
          assignedTo: isFieldRole(normalizeRole(actor.role)) ? (actor.id || null) : null,
        },
      });
    }
    res.status(201).json(exec);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.get('/pm/executions', requirePermission('VIEW'), async (req, res) => {
  try {
    const scope = await getCustomerScope(req);
    const where = {};
    if (!scope.isGlobal) {
      const or = [];
      if (scope.allowedCustomerIds.length) or.push({ customerId: { in: scope.allowedCustomerIds } });
      or.push({ customerId: null });
      where.schedule = { OR: or };
    }
    const list = await prisma.itOslPmExecution.findMany({ where, include: { schedule: true, executor: { select: { id:true, name:true } }, items: true }, orderBy: { executedAt: 'desc' }, take: 100 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── HANDOVERS / SHIFT ───────────────────────────────────────────────────────
router.get('/handovers', requirePermission('HANDOVER'), async (req, res) => {
  try {
    const list = await prisma.itOslHandover.findMany({ include: { user: { select: { id:true, name:true, email:true } } }, orderBy: { date: 'desc' }, take: 100 });
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
router.post('/handovers/opening', requirePermission('HANDOVER'), async (req, res) => {
  try {
    const { notes } = req.body;
    // Identitas shift selalu dari aktor terverifikasi.
    const userId = req.itOslActor?.id;
    if (!userId) return res.status(400).json({ message: 'userId wajib' });
    const today = new Date(); today.setHours(0,0,0,0);
    const existing = await prisma.itOslHandover.findFirst({ where: { userId, date: { gte: today } } });
    if (existing && existing.openingAt) return res.status(400).json({ message: 'Sudah opening hari ini' });
    let handover;
    if (existing) handover = await prisma.itOslHandover.update({ where: { id: existing.id }, data: { openingAt: new Date(), openingNotes: notes || null } });
    else handover = await prisma.itOslHandover.create({ data: { userId, openingAt: new Date(), openingNotes: notes || null, date: new Date() } });
    res.status(201).json(handover);
  } catch (e) { res.status(400).json({ message: e.message }); }
});
router.post('/handovers/closing', requirePermission('HANDOVER'), async (req, res) => {
  try {
    const { notes, handoverNotes } = req.body;
    const userId = req.itOslActor?.id;
    if (!userId) return res.status(400).json({ message: 'userId wajib' });
    const today = new Date(); today.setHours(0,0,0,0);
    const existing = await prisma.itOslHandover.findFirst({ where: { userId, date: { gte: today } }, orderBy: { date: 'desc' } });
    if (!existing) return res.status(400).json({ message: 'Belum opening' });
    const updated = await prisma.itOslHandover.update({ where: { id: existing.id }, data: { closingAt: new Date(), closingNotes: notes || null, handoverNotes: handoverNotes || null } });
    res.json(updated);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ── AUDIT LOGS ───────────────────────────────────────────────────────────────
router.get('/audit-logs', requirePermission('AUDIT_VIEW'), async (req, res) => {
  try {
    const { ticketId, entityType, limit } = req.query;
    const where = {};
    if (ticketId) where.ticketId = String(ticketId);
    if (entityType) where.entityType = String(entityType);
    const logs = await prisma.itOslAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit)||50, include: { actor: { select: { id:true, name:true } } } });
    res.json(logs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SEARCH ──────────────────────────────────────────────────────────────────
router.get('/search', requirePermission('VIEW'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const scope = await getCustomerScope(req);
    const where = {
      OR: [
        { summary: { contains: q, mode: 'insensitive' } },
        { rootCause: { contains: q, mode: 'insensitive' } },
        { correctiveAction: { contains: q, mode: 'insensitive' } },
        { ticketNumber: { contains: q, mode: 'insensitive' } },
      ],
    };
    applyCustomerFilter(where, scope, undefined, { includeShared: false });
    const actor = req.itOslActor || {};
    if (isFieldRole(normalizeRole(actor.role)) && actor.id) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: [{ assignedTo: actor.id }, { createdBy: actor.id }, { assignedTo: null }] },
      ];
    }
    const tickets = await prisma.itOslTicket.findMany({
      where,
      include: { location: true, category: true, asset: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    res.json(tickets);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Auto-close cron-friendly endpoint (called by frontend or cron)
router.post('/cron/auto-close', superAdminOnly, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 2*24*3600*1000);
    const toClose = await prisma.itOslTicket.findMany({ where: { status: 'RESOLVED', resolvedAt: { lte: cutoff } } });
    let closed = 0;
    for (const t of toClose) {
      await prisma.itOslTicket.update({ where: { id: t.id }, data: { status: 'CLOSED', closedAt: new Date() } });
      await auditLog({ entityType: 'TICKET', entityId: t.id, action: 'AUTO_CLOSE', oldValue: 'RESOLVED', newValue: 'CLOSED', ticketId: t.id, req });
      closed++;
    }
    res.json({ closed });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
