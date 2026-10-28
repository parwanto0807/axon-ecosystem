'use strict';

/**
 * RBAC untuk modul IT-OSL.
 *
 * Sumber kebenaran role adalah database (User.role), bukan header
 * `x-user-role` yang dikirim klien. Header hanya dipakai sebagai fallback
 * untuk request tanpa `x-user-id` (mis. tool internal), dan request seperti
 * itu TIDAK dianggap terverifikasi sehingga tidak boleh melakukan mutasi.
 *
 * Matriks mengikuti PRD-IT-OSL-v2 §2.2:
 *  - Engineer  -> OPERATIONAL / STAFF
 *  - Lead/Admin-> ADMIN / SUPER_ADMIN (SUPER_ADMIN = pemilik sistem)
 *  - Viewer    -> USER (tidak punya akses ke modul IT-OSL)
 *  - MANAGER   -> pemantau / lead operasional (read + assign + close)
 */

const PERMISSIONS = Object.freeze({
  // Akses baca modul
  VIEW: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'],

  // Master data: customer, lokasi, kategori, PIC, aset, PM plan
  MASTER_WRITE: ['SUPER_ADMIN', 'ADMIN'],
  // Registri aset: teknisi/engineer boleh menambah & mengubah data aset,
  // tetapi tetap tidak boleh menghapus aset atau mengubah master data lain.
  ASSET_WRITE: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'],
  // Direktori PIC: teknisi/engineer boleh menambah & mengubah PIC.
  // Hapus/nonaktifkan PIC tetap khusus admin.
  PIC_WRITE: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'],
  PM_PLAN: ['SUPER_ADMIN', 'ADMIN'],

  // Tiket
  TICKET_CREATE: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'],
  TICKET_EDIT: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'],
  TICKET_ASSIGN: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  TICKET_CLOSE: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  TICKET_CANCEL: ['SUPER_ADMIN', 'ADMIN'],
  // PRD §2.2: tidak ada peran bisnis yang boleh hard-delete tiket.
  // Hanya SUPER_ADMIN (pemilik sistem) untuk keperluan cleanup darurat.
  TICKET_DELETE: ['SUPER_ADMIN'],

  // Operasional lapangan
  PM_EXECUTE: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL'],
  HANDOVER: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL', 'STAFF'],

  // Laporan & audit
  REPORT_FULL: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  AUDIT_VIEW: ['SUPER_ADMIN', 'ADMIN'],
});

function normalizeRole(value) {
  return String(value || '').trim().toUpperCase();
}

function isGlobalRole(role) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

function isFieldRole(role) {
  return role === 'OPERATIONAL' || role === 'STAFF';
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
function buildRbac(prisma) {
  async function resolveActor(req) {
    if (req.itOslActor) return req.itOslActor;

    const headerRole = normalizeRole(req.headers['x-user-role']);
    const userId = req.headers['x-user-id'] ? String(req.headers['x-user-id']).trim() : '';

    let user = null;
    if (userId) {
      user = await prisma.user
        .findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, role: true, department: true },
        })
        .catch(() => null);
    }

    const actor = user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.role),
          department: user.department,
          verified: true,
          headerRole,
        }
      : {
          id: null,
          name: null,
          email: null,
          role: headerRole,
          department: null,
          verified: false,
          headerRole,
        };

    req.itOslActor = actor;
    return actor;
  }

  /** Middleware: resolve actor sekali per request. */
  const attachActor = async (req, res, next) => {
    try {
      await resolveActor(req);
      next();
    } catch (e) {
      console.error('[IT-OSL RBAC]', e);
      res.status(500).json({ message: 'Gagal memverifikasi hak akses' });
    }
  };

  /**
   * Middleware factory. Menolak request tanpa sesi valid (401) atau role
   * yang tidak berhak (403).
   */
  function requirePermission(permission) {
    const allowed = PERMISSIONS[permission] || [];
    return async (req, res, next) => {
      try {
        const actor = await resolveActor(req);
        if (!actor.role) {
          return res.status(401).json({ message: 'Unauthorized: role tidak ditemukan' });
        }
        if (!actor.verified) {
          return res.status(401).json({ message: 'Unauthorized: sesi tidak valid, silakan login ulang' });
        }
        if (!allowed.includes(actor.role)) {
          return res.status(403).json({
            message: `Forbidden: role ${actor.role} tidak memiliki izin ${permission}`,
          });
        }
        next();
      } catch (e) {
        console.error('[IT-OSL RBAC]', e);
        res.status(500).json({ message: 'Gagal memverifikasi hak akses' });
      }
    };
  }

  return { resolveActor, attachActor, requirePermission };
}

module.exports = { PERMISSIONS, buildRbac, normalizeRole, isGlobalRole, isFieldRole };
