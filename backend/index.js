const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

dotenv.config();

const app = express();
app.set('trust proxy', true);
const prisma = new PrismaClient();
const cron = require('node-cron');
const { postJournalFromSystemKey } = require('./utils/accountingUtils');
const PORT = process.env.PORT || 5003;
const { encrypt, decrypt } = require('./utils/encryption');
const { testMikrotikConnection } = require('./utils/mikrotik');

// Global memory for traffic calculation
let lastTrafficStats = {};

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

// --- RBAC MIDDLEWARE ---
const checkRole = (allowedRoles) => (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  const userDept = req.headers['x-user-dept'];
  const userName = req.headers['x-user-name'];
  
  if (!userRole) {
    return res.status(401).json({ message: 'Unauthorized: No role provided' });
  }
  
  // Attach contexts to req for later use in route handlers
  req.userRole = userRole;
  req.userDept = userDept;
  req.userName = userName;

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
  }
  next();
};

const uploadDir = path.join(__dirname, 'public/product');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const soUploadDir = path.join(__dirname, 'public/sales-order');
if (!fs.existsSync(soUploadDir)) fs.mkdirSync(soUploadDir, { recursive: true });

const meetingUploadDir = path.join(__dirname, 'public/meetings');
if (!fs.existsSync(meetingUploadDir)) fs.mkdirSync(meetingUploadDir, { recursive: true });

// Multer config for temporary storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

const processImage = async (file) => {
  const fileName = `prod-${Date.now()}.webp`;
  const filePath = path.join(uploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/product/${fileName}`;
};

const processSOImage = async (file) => {
  const fileName = `so-proof-${Date.now()}.webp`;
  const filePath = path.join(soUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/sales-order/${fileName}`;
};

const purchasingUploadDir = path.join(__dirname, 'public/purchasing');
if (!fs.existsSync(purchasingUploadDir)) fs.mkdirSync(purchasingUploadDir, { recursive: true });

const processPurchasingImage = async (file) => {
  const fileName = `bill-receipt-${Date.now()}.webp`;
  const filePath = path.join(purchasingUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/purchasing/${fileName}`;
};

const reportUploadDir = path.join(__dirname, 'public/work-order-reports');
if (!fs.existsSync(reportUploadDir)) fs.mkdirSync(reportUploadDir, { recursive: true });

const processReportImage = async (file) => {
  const fileName = `wo-report-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
  const filePath = path.join(reportUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/work-order-reports/${fileName}`;
};

const expenseUploadDir = path.join(__dirname, 'public/expenses');
if (!fs.existsSync(expenseUploadDir)) fs.mkdirSync(expenseUploadDir, { recursive: true });

const processExpenseImage = async (file) => {
  const fileName = `expense-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
  const filePath = path.join(expenseUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/expenses/${fileName}`;
};

const operasionalUploadDir = path.join(__dirname, 'public/operasional');
if (!fs.existsSync(operasionalUploadDir)) fs.mkdirSync(operasionalUploadDir, { recursive: true });

const processOperasionalImage = async (file) => {
  const fileName = `ops-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
  const filePath = path.join(operasionalUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/operasional/${fileName}`;
};

const attendanceUploadDir = path.join(__dirname, 'public/attendance');
if (!fs.existsSync(attendanceUploadDir)) fs.mkdirSync(attendanceUploadDir, { recursive: true });

const processAttendanceImage = async (file) => {
  const fileName = `att-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
  const filePath = path.join(attendanceUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/attendance/${fileName}`;
};

const maintenanceUploadDir = path.join(__dirname, 'public/maintenance');
if (!fs.existsSync(maintenanceUploadDir)) fs.mkdirSync(maintenanceUploadDir, { recursive: true });

const processMaintenanceImage = async (file) => {
  const fileName = `maint-${Date.now()}-${Math.round(Math.random() * 1000)}.webp`;
  const filePath = path.join(maintenanceUploadDir, fileName);
  await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);
  return `/public/maintenance/${fileName}`;
};

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371e3; // meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

app.get('/', (req, res) => {
  res.send('API AXON ECOSYSTEM RUNNING...');
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log(`[AUTH] User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if the password matches (either hashed or legacy plain-text)
    let isMatch = false;
    let isLegacy = false;

    // First attempt: Compare using bcrypt (for hashed passwords)
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      isMatch = false;
    }

    // Second attempt: Fallback for legacy plain-text passwords
    if (!isMatch && user.password === password) {
      isMatch = true;
      isLegacy = true;
    }

    console.log(`[AUTH] Login attempt for: ${email}, Match: ${isMatch}`);

    if (isMatch) {
      console.log(`[AUTH] Login success for: ${email}`);
      
      // Record Login Log
      try {
        await prisma.userLoginLog.create({
          data: {
            userId: user.id,
            ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          }
        });
      } catch (logError) {
        console.error('[AUTH] Failed to record login log:', logError);
      }

      // If it was a legacy plain-text password, migrate it to hashed now
      if (isLegacy) {
        try {
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
          });
          console.log(`[AUTH] Migrated legacy password for user: ${email}`);
        } catch (updateError) {
          console.error('[AUTH] Failed to migrate legacy password:', updateError);
          // We still allow login even if migration update fails once
        }
      }

      // Don't send the password back
      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    }

    return res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Activity Pulse: Record that a user opened/is active in the app
app.post('/api/auth/activity-pulse', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'Missing userId' });

    await prisma.userLoginLog.create({
      data: {
        userId,
        ipAddress: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Pulse Error:', e);
    res.status(500).json({ success: false });
  }
});

// --- MIKROTIK INFRASTRUCTURE ---

app.get('/api/infrastructure/mikrotik', async (req, res) => {
  try {
    const devices = await prisma.mikrotikDevice.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // Don't send real passwords in list
    const safeDevices = devices.map(d => ({ ...d, password: '••••••••' }));
    res.json(safeDevices);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/infrastructure/mikrotik', async (req, res) => {
  const { name, ip, port, username, password } = req.body;
  try {
    const device = await prisma.mikrotikDevice.create({
      data: {
        name,
        ip,
        port: parseInt(port) || 8728,
        username,
        password: encrypt(password)
      }
    });
    res.json(device);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/infrastructure/mikrotik/:id', async (req, res) => {
  const { id } = req.params;
  const { name, ip, port, username, password } = req.body;
  try {
    const updateData = { name, ip, port: parseInt(port) || 8728, username };
    // Only update password if it's not the masked placeholder
    if (password && password !== '••••••••') {
      updateData.password = encrypt(password);
    }
    
    const device = await prisma.mikrotikDevice.update({
      where: { id },
      data: updateData
    });
    res.json(device);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/infrastructure/mikrotik/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.mikrotikDevice.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/infrastructure/mikrotik/:id/test', async (req, res) => {
  const { id } = req.params;
  try {
    const device = await prisma.mikrotikDevice.findUnique({ where: { id } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    const password = decrypt(device.password);
    const result = await testMikrotikConnection(device.ip, device.port, device.username, password);
    
    if (result) {
      await prisma.mikrotikLog.create({
        data: {
          deviceId: id,
          event: "CONNECTION_SUCCESS",
          details: "Successfully connected to MikroTik API"
        }
      });
      res.json({ success: true });
    }
  } catch (e) {
    await prisma.mikrotikLog.create({
      data: {
        deviceId: id,
        event: "CONNECTION_FAILED",
        details: e.message
      }
    });
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/infrastructure/mikrotik/:id/monitor', async (req, res) => {
  const { id } = req.params;
  console.log(`[MikroTik Trace] Requesting MONITOR for device: ${id}`);
  const { executeMikrotikCommand } = require('./utils/mikrotik');
  
  try {
    const device = await prisma.mikrotikDevice.findUnique({ where: { id } });
    if (!device) {
      console.warn(`[MikroTik Trace] Device ${id} NOT FOUND`);
      return res.status(404).json({ error: "Device not found" });
    }

    const password = decrypt(device.password);
    
    // Fetch sequentially to avoid MikroTik API concurrency limits
    console.log(`[MikroTik Trace] Fetching system resources...`);
    const resources = await executeMikrotikCommand(device.ip, device.port, device.username, password, '/system/resource/print');
    
    console.log(`[MikroTik Trace] Fetching hotspot active count...`);
    const hotspotUsers = await executeMikrotikCommand(device.ip, device.port, device.username, password, '/ip/hotspot/active/print').catch(() => []);

    const stats = resources[0] || {};
    console.log(`[MikroTik Trace] MONITOR SUCCESS for ${id}`);
    
    res.json({
      cpu: stats['cpu-load'] || 0,
      memory: stats['free-memory'] || 0,
      totalMemory: stats['total-memory'] || 0,
      uptime: stats['uptime'] || 'N/A',
      activeUsers: Array.isArray(hotspotUsers) ? hotspotUsers.length : 0
    });
  } catch (e) {
    console.error(`[MikroTik Trace] MONITOR FAILED: ${e.message}`);
    // Return empty stats instead of error to keep UI alive
    res.json({ cpu: 0, memory: 0, activeUsers: 0, uptime: 'Offline' });
  }
});

app.get('/api/infrastructure/mikrotik/:id/traffic', async (req, res) => {
  const { id } = req.params;
  const { executeMikrotikCommand } = require('./utils/mikrotik');
  
  try {
    const device = await prisma.mikrotikDevice.findUnique({ where: { id } });
    if (!device) return res.status(404).json({ error: "Device not found" });

    const password = decrypt(device.password);
    
    // Fetch all interfaces to dynamically find active ones
    const results = await executeMikrotikCommand(device.ip, device.port, device.username, password, '/interface/print', {
      '.proplist': 'name,rx-byte,tx-byte,running,disabled,type'
    });

    const now = Date.now();
    const currentStats = {};
    const calculatedTraffic = [];

    results.forEach(iface => {
      // Monitor if it's an ethernet interface and it's running (active)
      // Or if it's a PPPoE/VLAN that might be WAN
      const isPhysical = iface.type === 'ether' || iface.type === 'pppoe-out' || iface.type === 'vlan';
      const isActive = iface.running === 'true' && iface.disabled === 'false';
      
      if (isPhysical && isActive) {
        currentStats[iface.name] = {
          rx: parseInt(iface['rx-byte'] || 0),
          tx: parseInt(iface['tx-byte'] || 0),
          time: now
        };

        // Calculate delta if previous stats exist
        let rxBps = 0;
        let txBps = 0;
        const prev = lastTrafficStats[id]?.[iface.name];
        
        if (prev) {
          const timeDiff = (now - prev.time) / 1000; // in seconds
          if (timeDiff > 0) {
            rxBps = Math.max(0, (currentStats[iface.name].rx - prev.rx) * 8 / timeDiff);
            txBps = Math.max(0, (currentStats[iface.name].tx - prev.tx) * 8 / timeDiff);
          }
        }

        calculatedTraffic.push({
          name: iface.name,
          'rx-bits-per-second': rxBps,
          'tx-bits-per-second': txBps
        });
      }
    });

    // Update memory
    lastTrafficStats[id] = currentStats;

    console.log(`[MikroTik Trace] TRAFFIC CALCULATED for ${id}`);
    res.json(calculatedTraffic);
  } catch (e) {
    console.error(`[MikroTik Trace] TRAFFIC FAILED: ${e.message}`);
    res.json([]);
  }
});

// --- PRODUCT ROUTES ---

app.get('/api/products', async (req, res) => {
  try {
    const { businessCategoryId, categoryId } = req.query;
    const products = await prisma.product.findMany({
      where: {
        ...(businessCategoryId ? { businessCategories: { some: { id: businessCategoryId } } } : {}),
        ...(categoryId ? { categoryId } : {})
      },
      include: {
        category: true,
        businessCategories: true,
        skus: {
          include: {
            unit: true,
            purchaseUnit: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products' });
  }
});

app.get('/api/product-skus', async (req, res) => {
  try {
    const skus = await prisma.productSKU.findMany({
      include: {
        product: true,
        unit: true,
        purchaseUnit: true
      },
      orderBy: { createdAt: 'desc' },
      where: { isActive: true }
    });
    res.json(skus);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product SKUs' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

app.get('/api/units', async (req, res) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching units' });
  }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
  try {
    console.log(`[BACKEND] POST /api/products - Received body:`, Object.keys(req.body));
    if (req.file) console.log(`[BACKEND] Received file:`, req.file.originalname);
    
    const { category, businessCategory, businessCategoryIds: bizIdsRaw, priceHistory, skus: skusRaw, ...masterData } = req.body;
    
    let skus = [];
    if (skusRaw) {
      skus = typeof skusRaw === 'string' ? JSON.parse(skusRaw) : skusRaw;
    }

    let businessCategoryIds = [];
    if (bizIdsRaw) {
      businessCategoryIds = typeof bizIdsRaw === 'string' ? JSON.parse(bizIdsRaw) : bizIdsRaw;
    } else if (masterData.businessCategoryId) {
      // Fallback for legacy frontend
      businessCategoryIds = [masterData.businessCategoryId];
    }

    if (req.file) {
      masterData.image = await processImage(req.file);
    }

    // Clean master data from fields that no longer exist on Product
    const cleanMasterData = {
      code: masterData.code,
      name: masterData.name,
      brand: masterData.brand || null,
      type: masterData.type,
      categoryId: masterData.categoryId || null,
      image: masterData.image || null
    };

    const product = await prisma.product.create({
      data: {
        ...cleanMasterData,
        businessCategories: {
          connect: businessCategoryIds.map(id => ({ id }))
        },
        skus: {
          create: skus.map(sku => ({
            code: sku.code,
            name: sku.name || null,
            unitId: sku.unitId || 'pcs',
            purchaseUnitId: sku.purchaseUnitId || null,
            purchasePrice: Number(sku.purchasePrice) || 0,
            salePrice: Number(sku.salePrice) || 0,
            stock: Number(sku.stock) || 0,
            minStock: Number(sku.minStock) || 0,
            stockLocation: sku.stockLocation || null,
            usage: sku.usage || null,
            specifications: sku.specifications || null,
            barcode: sku.barcode || null,
            weight: Number(sku.weight) || null,
            isActive: sku.isActive !== undefined ? (sku.isActive === 'true' || sku.isActive === true) : true
          }))
        }
      },
      include: {
        category: true,
        businessCategories: true,
        skus: {
          include: {
            unit: true,
            purchaseUnit: true
          }
        }
      }
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[BACKEND] PUT /api/products/${id} - Received body:`, Object.keys(req.body));
    if (req.file) console.log(`[BACKEND] Received file:`, req.file.originalname);

    const { id: _, priceHistory, createdAt, updatedAt, category, businessCategoryIds: bizIdsRaw, skus: skusRaw, ...masterData } = req.body;
    
    let skus = [];
    if (skusRaw) {
      skus = typeof skusRaw === 'string' ? JSON.parse(skusRaw) : skusRaw;
    }

    let businessCategoryIds = null;
    if (bizIdsRaw) {
      businessCategoryIds = typeof bizIdsRaw === 'string' ? JSON.parse(bizIdsRaw) : bizIdsRaw;
    } else if (masterData.businessCategoryId) {
      businessCategoryIds = [masterData.businessCategoryId];
    }

    if (req.file) {
      masterData.image = await processImage(req.file);
    }

    // Clean master data
    const cleanMasterData = {};
    if (masterData.code !== undefined) cleanMasterData.code = masterData.code;
    if (masterData.name !== undefined) cleanMasterData.name = masterData.name;
    if (masterData.brand !== undefined) cleanMasterData.brand = masterData.brand || null;
    if (masterData.type !== undefined) cleanMasterData.type = masterData.type;
    if (masterData.categoryId !== undefined) cleanMasterData.categoryId = masterData.categoryId || null;
    if (masterData.image !== undefined) cleanMasterData.image = masterData.image;

    // Handle businessCategories separately because it's many-to-many
    if (businessCategoryIds !== null) {
      cleanMasterData.businessCategories = {
        set: businessCategoryIds.map(id => ({ id }))
      };
    }

    const original = await prisma.product.findUnique({
      where: { id },
      include: { skus: true }
    });

    if (!original) return res.status(404).json({ message: 'Product not found' });

    const product = await prisma.$transaction(async (tx) => {
      // 1. Update Product Master
      const updatedProduct = await tx.product.update({
        where: { id },
        data: cleanMasterData,
        include: { skus: true }
      });

      // 2. Handle SKUs
      if (skus && skus.length > 0) {
        // Keep track of which SKUs to keep
        const incomingIds = skus.filter(s => s.id).map(s => s.id);
        
        // Delete SKUs that are not in the new list
        await tx.productSKU.deleteMany({
          where: {
            productId: id,
            id: { notIn: incomingIds }
          }
        });

        // Update or Create SKUs
        for (const skuData of skus) {
          const { id: skuId, unit, purchaseUnit, priceHistory: _, productId: __, createdAt: ___, updatedAt: ____, ...skuDetails } = skuData;
          
          // Parse numeric fields for SKU — only include valid update fields
          const parsedSkuDetails = {
            code: skuDetails.code,
            name: skuDetails.name || null,
            unitId: skuDetails.unitId || 'pcs',
            purchaseUnitId: skuDetails.purchaseUnitId || null,
            purchasePrice: Number(skuDetails.purchasePrice) || 0,
            salePrice: Number(skuDetails.salePrice) || 0,
            stock: Number(skuDetails.stock) || 0,
            minStock: Number(skuDetails.minStock) || 0,
            stockLocation: skuDetails.stockLocation || null,
            usage: skuDetails.usage || null,
            specifications: skuDetails.specifications || null,
            barcode: skuDetails.barcode || null,
            weight: Number(skuDetails.weight) || null,
            isActive: skuDetails.isActive !== undefined ? (skuDetails.isActive === 'true' || skuDetails.isActive === true) : true
          };

          if (skuId) {
            // Check for price changes
            const oldSku = original.skus.find(s => s.id === skuId);
            if (oldSku) {
              if (parsedSkuDetails.purchasePrice !== oldSku.purchasePrice) {
                await tx.productPriceHistory.create({
                  data: {
                    productSKUId: skuId,
                    productId: id,
                    type: 'PURCHASE',
                    oldPrice: oldSku.purchasePrice,
                    newPrice: parsedSkuDetails.purchasePrice,
                    changeReason: 'Manual Update'
                  }
                });
              }
              if (parsedSkuDetails.salePrice !== oldSku.salePrice) {
                await tx.productPriceHistory.create({
                  data: {
                    productSKUId: skuId,
                    productId: id,
                    type: 'SALE',
                    oldPrice: oldSku.salePrice,
                    newPrice: parsedSkuDetails.salePrice,
                    changeReason: 'Manual Update'
                  }
                });
              }
            }

            await tx.productSKU.update({
              where: { id: skuId },
              data: parsedSkuDetails
            });
          } else {
            // Create new SKU
            await tx.productSKU.create({
              data: {
                ...parsedSkuDetails,
                productId: id
              }
            });
          }
        }
      }

      return await tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          businessCategories: true,
          skus: {
            include: {
              unit: true,
              purchaseUnit: true
            }
          }
        }
      });
    });

    res.json(product);
  } catch (error) {
    console.error('SERVER_ERROR [PUT /api/products]:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to update product',
      code: error.code,
      meta: error.meta,
      detail: error.toString()
    });
  }
});

app.get('/api/skus/:id/price-history', async (req, res) => {
  try {
    const history = await prisma.productPriceHistory.findMany({
      where: { productSKUId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching price history' });
  }
});

app.get('/api/products/:id/price-history', async (req, res) => {
  try {
    const history = await prisma.productPriceHistory.findMany({
      where: {
        productSKU: {
          productId: req.params.id
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    console.error('SERVER_ERROR [GET /api/products/:id/price-history]:', error);
    res.status(500).json({ message: 'Error fetching product price history' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting product' });
  }
});

// --- HELPER: REUSABLE BILL GENERATOR ---
async function processContractBilling(contractId) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId }
  });

  if (!contract) return { success: false, message: 'Contract not found' };

  // Check if already billed this month
  const today = new Date();
  if (contract.lastBillingDate) {
    const last = new Date(contract.lastBillingDate);
    if (last.getMonth() === today.getMonth() && last.getFullYear() === today.getFullYear()) {
      return { success: false, message: 'Already billed this month' };
    }
  }

  const billingMonthLabel = today.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  
  // Calculate Invoice Date (based on billingDay)
  const invDate = new Date(today.getFullYear(), today.getMonth(), contract.billingDay || today.getDate());
  
  // Calculate Due Date (based on dueDay)
  let invDueDate = new Date(today.getFullYear(), today.getMonth(), contract.dueDay || (today.getDate() + 7));
  
  // If dueDay is <= billingDay, it means it's due next month
  if (contract.dueDay && contract.billingDay && contract.dueDay <= contract.billingDay) {
    invDueDate.setMonth(invDueDate.getMonth() + 1);
  }

  let result;
  if (contract.vendorId) {
    const count = await prisma.purchaseInvoice.count();
    const number = `PI-AUTO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    result = await prisma.purchaseInvoice.create({
      data: {
        number,
        date: invDate,
        dueDate: invDueDate,
        status: 'DRAFT',
        vendorId: contract.vendorId,
        contractId: contract.id,
        grandTotal: contract.amount,
        subtotal: contract.amount,
        notes: `Auto-generated from Contract ${contract.number} for ${billingMonthLabel}`,
        items: {
          create: [{ no: 1, description: `${contract.subject} - ${billingMonthLabel}`, qty: 1, unit: 'month', unitPrice: contract.amount, amount: contract.amount }]
        }
      }
    });
  } else if (contract.customerId) {
    const count = await prisma.invoice.count();
    const number = `INV-AUTO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    result = await prisma.invoice.create({
      data: {
        number,
        date: invDate,
        dueDate: invDueDate,
        status: 'DRAFT',
        customerId: contract.customerId,
        projectId: contract.projectId,
        contractId: contract.id,
        grandTotal: contract.amount,
        subtotal: contract.amount,
        notes: `Auto-generated from Contract ${contract.number} for ${billingMonthLabel}`,
        items: {
          create: [{ no: 1, description: `${contract.subject} - ${billingMonthLabel}`, qty: 1, unit: 'month', unitPrice: contract.amount, amount: contract.amount }]
        }
      }
    });
  }

  // Update lastBillingDate
  await prisma.contract.update({
    where: { id: contract.id },
    data: { lastBillingDate: new Date() }
  });

  return { success: true, result };
}

// --- CRON JOB: DAILY AT 00:01 ---
cron.schedule('1 0 * * *', async () => {
  const today = new Date();
  const currentDay = today.getDate();
  console.log(`[CRON] Starting ISP Auto Billing Check: Day ${currentDay}`);

  try {
    const contracts = await prisma.contract.findMany({
      where: {
        autoBilling: true,
        billingDay: currentDay,
        status: 'ACTIVE'
      }
    });

    console.log(`[CRON] Found ${contracts.length} contracts to process`);

    for (const c of contracts) {
      const res = await processContractBilling(c.id);
      if (res.success) console.log(`[CRON] Success generating bill for ${c.number}`);
      else console.log(`[CRON] Skipped/Failed ${c.number}: ${res.message}`);
    }
  } catch (e) {
    console.error('[CRON] Error in auto-billing job:', e);
  }
});

// --- CRON JOB: ASSET SERVICE REMINDER (DAILY AT 01:00) ---
cron.schedule('0 1 * * *', async () => {
  console.log(`[CRON] Starting Asset Service Reminder Check`);
  try {
    const today = new Date();
    const reminderThreshold = new Date();
    reminderThreshold.setDate(today.getDate() + 7); // 7 days notice

    const assetsDue = await prisma.customerAsset.findMany({
      where: {
        status: 'ACTIVE',
        nextServiceDate: {
          lte: reminderThreshold,
          gte: today // Not yet overdue or just due
        }
      },
      include: { customer: true }
    });

    console.log(`[CRON] Found ${assetsDue.length} assets due for service soon`);
    
    // In a real system, you might send emails here. 
    // For now, we'll log it or create a "Notification" if such a model exists.
    // Based on the schema, we don't have a Notification model yet, 
    // so we'll just log it for now.
    for (const asset of assetsDue) {
      console.log(`[REMINDER] Asset ${asset.name} (SN: ${asset.serialNumber}) for ${asset.customer.name} is due on ${asset.nextServiceDate}`);
    }
  } catch (e) {
    console.error('[CRON] Error in asset reminder job:', e);
  }
});

// --- CUSTOMER ROUTES ---

app.get('/api/customers', async (req, res) => {
  try {
    const { businessCategoryId } = req.query;
    const customers = await prisma.customer.findMany({
      where: {
        ...(businessCategoryId ? { businessCategories: { some: { id: businessCategoryId } } } : {})
      },
      include: { pics: true, businessCategories: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customers' });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { pics, businessCategory, businessCategoryId: _, businessCategoryIds: bizIdsRaw, ...data } = req.body;

    let businessCategoryIds = [];
    if (bizIdsRaw) {
      businessCategoryIds = Array.isArray(bizIdsRaw) ? bizIdsRaw : (typeof bizIdsRaw === 'string' ? JSON.parse(bizIdsRaw) : [bizIdsRaw]);
    } else if (data.businessCategoryId) {
      businessCategoryIds = [data.businessCategoryId];
    }

    const customer = await prisma.customer.create({
      data: {
        ...data,
        businessCategories: {
          connect: businessCategoryIds.map(id => ({ id }))
        },
        pics: pics ? {
          create: pics.map(pic => ({
            name: pic.name,
            department: pic.department,
            email: pic.email,
            phone: pic.phone
          }))
        } : undefined
      },
      include: { pics: true, businessCategories: true }
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: 'Error creating customer' });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { pics, businessCategory, businessCategoryId: _, businessCategoryIds: bizIdsRaw, id: __, createdAt, updatedAt, ...data } = req.body;

    let businessCategoryIds = null;
    if (bizIdsRaw) {
      businessCategoryIds = Array.isArray(bizIdsRaw) ? bizIdsRaw : (typeof bizIdsRaw === 'string' ? JSON.parse(bizIdsRaw) : [bizIdsRaw]);
    } else if (data.businessCategoryId) {
      businessCategoryIds = [data.businessCategoryId];
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        ...(businessCategoryIds !== null ? {
          businessCategories: {
            set: businessCategoryIds.map(id => ({ id }))
          }
        } : {}),
        pics: pics ? {
          deleteMany: {},
          create: pics.map(pic => ({
            name: pic.name,
            department: pic.department,
            email: pic.email,
            phone: pic.phone
          }))
        } : undefined
      },
      include: { pics: true, businessCategories: true }
    });
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: 'Error updating customer' });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting customer' });
  }
});

// --- CUSTOMER ASSET ROUTES ---

app.get('/api/customer-assets', async (req, res) => {
  try {
    const { customerId, category, businessCategoryId } = req.query;
    const assets = await prisma.customerAsset.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(category ? { category } : {}),
        ...(businessCategoryId ? { businessCategoryId } : {})
      },
      include: { customer: true, businessCategory: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assets' });
  }
});

app.get('/api/customer-assets/:id', async (req, res) => {
  try {
    const asset = await prisma.customerAsset.findUnique({
      where: { id: req.params.id },
      include: { customer: true, businessCategory: true, workOrders: { orderBy: { createdAt: 'desc' }, take: 5 } }
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching asset' });
  }
});

app.post('/api/customer-assets', async (req, res) => {
  try {
    const { businessCategory, ...data } = req.body;
    const asset = await prisma.customerAsset.create({
      data: {
        ...data,
        installationDate: data.installationDate ? new Date(data.installationDate) : null,
        lastServiceDate: data.lastServiceDate ? new Date(data.lastServiceDate) : null,
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : null,
      },
      include: { customer: true, businessCategory: true }
    });
    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ message: 'Error creating asset', error: error.message });
  }
});

app.put('/api/customer-assets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id: _, createdAt, updatedAt, customer, businessCategory, ...data } = req.body;
    const asset = await prisma.customerAsset.update({
      where: { id },
      data: {
        ...data,
        installationDate: data.installationDate ? new Date(data.installationDate) : undefined,
        lastServiceDate: data.lastServiceDate ? new Date(data.lastServiceDate) : undefined,
        nextServiceDate: data.nextServiceDate ? new Date(data.nextServiceDate) : undefined,
      },
      include: { customer: true, businessCategory: true }
    });
    res.json(asset);
  } catch (error) {
    res.status(400).json({ message: 'Error updating asset' });
  }
});

app.delete('/api/customer-assets/:id', async (req, res) => {
  try {
    await prisma.customerAsset.delete({ where: { id: req.params.id } });
    res.json({ message: 'Asset deleted' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting asset' });
  }
});

// --- COMPANY PROFILE ROUTES ---

app.get('/api/company', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'OPERATIONAL', 'USER']), async (req, res) => {
  try {
    let company = await prisma.companyProfile.findUnique({ where: { id: 'main' } });
    if (!company) {
      company = await prisma.companyProfile.upsert({
        where: { id: 'main' },
        update: {},
        create: { id: 'main' }
      });
    }
    res.json(company);
  } catch (error) {
    console.error('Error fetching company profile:', error);
    res.status(500).json({ message: 'Error fetching company profile' });
  }
});

app.put('/api/company', checkRole(['SUPER_ADMIN', 'ADMIN']), upload.single('logo'), async (req, res) => {
  try {
    const { id: _, updatedAt, ...data } = req.body;
    let logoPath = undefined;
    if (req.file) {
      logoPath = await processImage(req.file);
    }
    const company = await prisma.companyProfile.upsert({
      where: { id: 'main' },
      update: { ...data, ...(logoPath ? { logo: logoPath } : {}) },
      create: { id: 'main', ...data, ...(logoPath ? { logo: logoPath } : {}) }
    });
    res.json(company);
  } catch (error) {
    console.error('Error updating company profile:', error);
    res.status(500).json({ message: error.message || 'Error updating company profile' });
  }
});

// --- QUOTATION ROUTES ---

// Auto-number generator: QUO-YYYY-NNN
async function generateQuotationNumber() {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  const lastQuo = await prisma.quotation.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' }
  });
  const lastNum = lastQuo ? parseInt(lastQuo.number.split('-')[2]) : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

function calcTotals(items, discountPct, taxPct) {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const discountAmt = subtotal * (discountPct / 100);
  const taxable = subtotal - discountAmt;
  const taxAmt = taxable * (taxPct / 100);
  const grandTotal = taxable + taxAmt;
  return { subtotal, discountAmt, taxAmt, grandTotal };
}

app.get('/api/quotations', async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: { customer: true, items: true, project: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(quotations);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/quotations/:id', async (req, res) => {
  try {
    const q = await prisma.quotation.findUnique({
      where: { id: req.params.id },
      include: { customer: { include: { pics: true } }, items: { orderBy: { no: 'asc' } } }
    });
    if (!q) return res.status(404).json({ message: 'Not found' });
    res.json(q);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/quotations', async (req, res) => {
  try {
    const { items = [], discount = 0, tax = 11, ...data } = req.body;
    const number = await generateQuotationNumber();
    const parsedItems = items.map((it, idx) => ({
      no: idx + 1,
      description: it.description,
      qty: Number(it.qty) || 1,
      unit: it.unit || 'pcs',
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      amount: Number(it.amount) || 0,
      skuId: it.skuId || null,
      costPrice: Number(it.costPrice) || 0
    }));
    const { subtotal, discountAmt, taxAmt, grandTotal } = calcTotals(parsedItems, Number(discount), Number(tax));
    const q = await prisma.quotation.create({
      data: {
        ...data,
        number,
        discount: Number(discount),
        tax: Number(tax),
        subtotal, discountAmt, taxAmt, grandTotal,
        date: data.date ? new Date(data.date) : new Date(),
        validUntil: new Date(data.validUntil),
        projectId: data.projectId || null,
        items: { create: parsedItems }
      },
      include: { customer: true, items: { orderBy: { no: 'asc' } }, project: true }
    });
    if (data.projectId) {
      await prisma.preSalesProject.update({
        where: { id: data.projectId },
        data: { status: 'QUOTATION_STAGE' }
      }).catch(() => {});
    }
    res.status(201).json(q);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.put('/api/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], discount = 0, tax = 11, id: _, createdAt, updatedAt, customer, ...data } = req.body;
    const parsedItems = items.map((it, idx) => ({
      no: idx + 1,
      description: it.description,
      qty: Number(it.qty) || 1,
      unit: it.unit || 'pcs',
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      amount: Number(it.amount) || 0,
      skuId: it.skuId || null,
      costPrice: Number(it.costPrice) || 0
    }));
    const { subtotal, discountAmt, taxAmt, grandTotal } = calcTotals(parsedItems, Number(discount), Number(tax));
    const q = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      const updated = await tx.quotation.update({
        where: { id },
        data: {
          ...data,
          discount: Number(discount), tax: Number(tax),
          subtotal, discountAmt, taxAmt, grandTotal,
          date: data.date ? new Date(data.date) : undefined,
          validUntil: new Date(data.validUntil),
          projectId: data.projectId || undefined,
          items: { create: parsedItems }
        },
        include: { customer: true, items: { orderBy: { no: 'asc' } }, project: true }
      });
      if (data.projectId) {
        await tx.preSalesProject.update({
          where: { id: data.projectId },
          data: { status: 'QUOTATION_STAGE' }
        }).catch(() => {});
      }
      return updated;
    });
    res.json(q);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.patch('/api/quotations/:id/status', async (req, res) => {
  try {
    const q = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    res.json(q);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    await prisma.quotation.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});
// --- SALES ORDER ROUTES ---

async function generateSalesOrderNumber() {
  const year = new Date().getFullYear();
  const prefix = `SO-${year}-`;
  const lastSO = await prisma.salesOrder.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' }
  });
  const lastNum = lastSO ? parseInt(lastSO.number.split('-')[2]) : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

const SO_STATUS_RANK = { DRAFT: 0, PENDING: 1, PROCESSING: 2, PARTIAL: 3, SHIPPED: 4, DELIVERED: 5, INVOICED: 6, PAID: 7, COMPLETED: 8 };

async function advanceSalesOrderStatus(tx, salesOrderId, nextStatus) {
  if (!salesOrderId) return;
  const so = await tx.salesOrder.findUnique({
    where: { id: salesOrderId },
    select: { status: true }
  });
  if (!so || so.status === 'CANCELLED') return;
  if ((SO_STATUS_RANK[nextStatus] ?? -1) > (SO_STATUS_RANK[so.status] ?? -1)) {
    await tx.salesOrder.update({ where: { id: salesOrderId }, data: { status: nextStatus } });
  }
}

const DO_STATUS_RANK = { DRAFT: 0, SHIPPED: 1, DELIVERED: 2, INVOICED: 3, PAID: 4 };

async function advanceDeliveryOrderStatus(tx, deliveryOrderId, nextStatus) {
  if (!deliveryOrderId) return;
  const d = await tx.deliveryOrder.findUnique({
    where: { id: deliveryOrderId },
    select: { status: true }
  });
  if (!d || d.status === 'CANCELLED') return;
  if ((DO_STATUS_RANK[nextStatus] ?? -1) > (DO_STATUS_RANK[d.status] ?? -1)) {
    await tx.deliveryOrder.update({ where: { id: deliveryOrderId }, data: { status: nextStatus } });
  }
}

async function resolveDeliveryOrder(tx, salesOrderId, deliveryOrderId) {
  if (deliveryOrderId) return deliveryOrderId;
  if (!salesOrderId) return null;
  const d = await tx.deliveryOrder.findFirst({
    where: { salesOrderId, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true }
  });
  return d ? d.id : null;
}

app.post('/api/orders/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = await processSOImage(req.file);
    res.json({ url });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = await processPurchasingImage(req.file);
    res.json({ url });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { businessCategoryId } = req.query;
    const orders = await prisma.salesOrder.findMany({
      where: {
        ...(businessCategoryId ? { businessCategoryId } : {})
      },
      include: { customer: true, items: true, quotation: true, project: true, businessCategory: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const o = await prisma.salesOrder.findUnique({
      where: { id: req.params.id },
      include: { 
        customer: { include: { pics: true } }, 
        items: { orderBy: { no: 'asc' } },
        quotation: true,
        project: true,
        businessCategory: true
      }
    });
    if (!o) return res.status(404).json({ message: 'Not found' });
    res.json(o);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items = [], discount = 0, tax = 11, businessCategory, quotation, customer, ...data } = req.body;
    const number = await generateSalesOrderNumber();
    const parsedItems = items.map((it, idx) => ({
      no: idx + 1,
      description: it.description,
      qty: Number(it.qty) || 1,
      unit: it.unit || 'pcs',
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      amount: Number(it.amount) || 0
    }));
    const { subtotal, discountAmt, taxAmt, grandTotal } = calcTotals(parsedItems, Number(discount), Number(tax));
    const o = await prisma.salesOrder.create({
      data: {
        ...data,
        number,
        discount: Number(discount),
        tax: Number(tax),
        subtotal, discountAmt, taxAmt, grandTotal,
        date: data.date ? new Date(data.date) : new Date(),
        poProof: data.poProof || null,
        projectId: data.projectId || null,
        businessCategoryId: data.businessCategoryId || null,
        quotationId: data.quotationId || null,
        items: { create: parsedItems }
      },
      include: { customer: true, items: { orderBy: { no: 'asc' } }, project: true, businessCategory: true }
    });
    res.status(201).json(o);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], discount = 0, tax = 11, id: _, createdAt, updatedAt, customer, quotation, businessCategory, ...data } = req.body;
    const parsedItems = items.map((it, idx) => ({
      no: idx + 1,
      description: it.description,
      qty: Number(it.qty) || 1,
      unit: it.unit || 'pcs',
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      amount: Number(it.amount) || 0
    }));
    const { subtotal, discountAmt, taxAmt, grandTotal } = calcTotals(parsedItems, Number(discount), Number(tax));
    const o = await prisma.$transaction(async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
      return tx.salesOrder.update({
        where: { id },
        data: {
          ...data,
          discount: Number(discount), tax: Number(tax),
          subtotal, discountAmt, taxAmt, grandTotal,
          date: data.date ? new Date(data.date) : undefined,
          poProof: data.poProof || undefined,
          projectId: data.projectId || null,
          businessCategoryId: data.businessCategoryId || null,
          quotationId: data.quotationId || null,
          items: { create: parsedItems }
        },
        include: { customer: true, items: { orderBy: { no: 'asc' } }, project: true, businessCategory: true }
      });
    });
    res.json(o);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const o = await prisma.salesOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    res.json(o);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await prisma.salesOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- PROJECT & SURVEY ROUTES ---

async function generateProjectNumber() {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;
  const last = await prisma.preSalesProject.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' }
  });
  const lastNum = last ? parseInt(last.number.split('-')[2]) : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

async function generateSurveyNumber() {
  const year = new Date().getFullYear();
  const prefix = `SRV-${year}-`;
  const last = await prisma.fieldSurvey.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' }
  });
  const lastNum = last ? parseInt(last.number.split('-')[2]) : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

app.get('/api/projects', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'OPERATIONAL', 'USER']), async (req, res) => {
  try {
    const { businessCategoryId } = req.query;
    const projects = await prisma.preSalesProject.findMany({
      where: {
        ...(businessCategoryId ? { businessCategoryId } : {})
      },
      include: { 
        customer: true, 
        businessCategory: true,
        surveys: { include: { expenses: true } }, 
        quotations: { include: { items: true } }, 
        salesOrders: true,
        purchaseOrders: { include: { vendor: true, items: true } },
        workOrders: {
          include: {
            items: true,
            surveyExpenses: true,
            stockMovements: { 
              include: { 
                items: { include: { sku: { include: { product: true } } } }, 
                warehouse: true 
              } 
            }
          }
        },
        basts: { include: { items: true } },
        deliveryOrders: { include: { items: true } },
        invoices: { include: { items: true } },
        surveyExpenses: true,
        operationalExpenses: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (e) {
    console.error("GET /api/projects error:", e);
    res.status(500).json([]);
  }
});

app.post('/api/projects', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), async (req, res) => {
  try {
    const number = await generateProjectNumber();
    const { deadline, ...rest } = req.body;
    
    const data = { ...rest };
    if (deadline === "") data.deadline = null;
    else if (deadline) data.deadline = new Date(deadline);

    const project = await prisma.preSalesProject.create({
      data: { ...data, number },
      include: { customer: true, businessCategory: true }
    });
    res.status(201).json(project);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/projects/:id', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      id: _, number: __, customer, surveys, quotations, salesOrders, 
      purchaseOrders, workOrders, basts, deliveryOrders, invoices, 
      surveyExpenses, createdAt, updatedAt, deadline, ...rest 
    } = req.body;
    
    const data = { ...rest };
    if (deadline === "") data.deadline = null;
    else if (deadline) data.deadline = new Date(deadline);

    const project = await prisma.preSalesProject.update({
      where: { id },
      data: data,
      include: { customer: true, businessCategory: true }
    });
    res.json(project);
  } catch (e) {
    console.error("PUT /api/projects/:id error:", e);
    res.status(400).json({ message: e.message });
  }
});

app.delete('/api/projects/:id', checkRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    // Check cascade — warn if project has child records
    const project = await prisma.preSalesProject.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            surveys: true,
            quotations: true,
            salesOrders: true,
            purchaseOrders: true,
            workOrders: true,
            proposals: true,
          }
        }
      }
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const childCount = project._count.surveys + project._count.quotations + project._count.salesOrders
      + project._count.purchaseOrders + project._count.workOrders + project._count.proposals;
    if (childCount > 0) {
      // Prisma cascades — confirm on frontend handles UX, backend just warns
      console.warn(`Deleting project ${req.params.id} with ${childCount} child records`);
    }

    await prisma.preSalesProject.delete({ where: { id: req.params.id } });
    res.json({ success: true, childRecordsRemoved: childCount });
  } catch (e) {
    console.error("DELETE /api/projects/:id error:", e);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/projects/:id', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'OPERATIONAL', 'USER']), async (req, res) => {
  try {
    const project = await prisma.preSalesProject.findUnique({
      where: { id: req.params.id },
      include: { 
        customer: true, 
        businessCategory: true,
        surveys: { include: { expenses: true } }, 
        quotations: { include: { items: true } }, 
        salesOrders: true,
        purchaseOrders: { include: { vendor: true, items: true } },
        workOrders: {
          include: {
            items: true,
            surveyExpenses: true,
            stockMovements: { 
              include: { 
                items: { include: { sku: { include: { product: true } } } }, 
                warehouse: true 
              } 
            }
          }
        },
        basts: { include: { items: true } },
        deliveryOrders: { include: { items: true } },
        invoices: { include: { items: true } }
      }
    });
    res.json(project);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/surveys', async (req, res) => {
  try {
    const surveys = await prisma.fieldSurvey.findMany({
      include: { customer: true, project: true, expenses: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(surveys);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/surveys', async (req, res) => {
  try {
    const number = await generateSurveyNumber();
    const { date, expenses = [], ...data } = req.body;
    const survey = await prisma.fieldSurvey.create({
      data: { 
        ...data, 
        number, 
        date: date ? new Date(date) : new Date(),
        projectId: data.projectId || undefined,
        expenses: {
          create: expenses.map(e => ({
            category: e.category,
            amount: Number(e.amount) || 0,
            description: e.description,
            status: e.status || 'PENDING'
          }))
        }
      },
      include: { customer: true, project: true, expenses: true }
    });
    res.status(201).json(survey);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/surveys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, customer, project, expenses = [], ...data } = req.body;
    
    const survey = await prisma.$transaction(async (tx) => {
      // Update survey
      await tx.fieldSurvey.update({
        where: { id },
        data: {
          ...data,
          date: date ? new Date(date) : undefined,
          projectId: data.projectId || null
        }
      });

      // Sync expenses
      const currentExpenses = await tx.surveyExpense.findMany({ where: { surveyId: id } });
      const incomingIds = expenses.filter(e => e.id).map(e => e.id);
      
      // Delete removed
      await tx.surveyExpense.deleteMany({
        where: {
          surveyId: id,
          id: { notIn: incomingIds }
        }
      });

      // Update / Create
      for (const e of expenses) {
        const payload = {
          category: e.category,
          amount: Number(e.amount) || 0,
          description: e.description,
          status: e.status || 'PENDING'
        };

        if (e.id) {
          await tx.surveyExpense.update({
            where: { id: e.id },
            data: payload
          });
        } else {
          await tx.surveyExpense.create({
            data: {
              ...payload,
              surveyId: id
            }
          });
        }
      }

      return tx.fieldSurvey.findUnique({
        where: { id },
        include: { customer: true, project: true, expenses: true }
      });
    });

    res.json(survey);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.delete('/api/surveys/:id', async (req, res) => {
  try {
    await prisma.fieldSurvey.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/surveys/:id/expenses', async (req, res) => {
  try {
    const survey = await prisma.fieldSurvey.findUnique({
      where: { id: req.params.id },
      select: { projectId: true }
    });

    const expense = await prisma.surveyExpense.create({
      data: { 
        ...req.body, 
        surveyId: req.params.id,
        projectId: req.body.projectId || survey?.projectId || null,
        amount: Number(req.body.amount) || 0
      }
    });
    res.status(201).json(expense);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/expenses', upload.single('receipt'), async (req, res) => {
  try {
    let receiptUrl = req.body.receiptImage || null;
    if (req.file) {
      receiptUrl = await processExpenseImage(req.file);
    }

    // 1. Destructuring & Konversi Tipe Data
    const { 
      staffName, 
      type, 
      category, 
      description, 
      date, 
      surveyId, 
      workOrderId,
      parentExpenseId,
      customerId
    } = req.body;

    const amount = Number(req.body.amount) || 0;
    
    // Konversi ke Date Object (PENTING: Prisma butuh Object, bukan String)
    const formattedDate = date ? new Date(date) : new Date();

    let extractedProjectId = req.body.projectId || null;
    let extractedWorkOrderId = workOrderId || null;

    if (!extractedProjectId) {
      if (workOrderId && workOrderId !== 'null') {
        const wo = await prisma.workOrder.findUnique({
          where: { id: workOrderId },
          select: { projectId: true }
        });
        extractedProjectId = wo?.projectId || null;
      } else if (surveyId && surveyId !== 'null') {
        const survey = await prisma.fieldSurvey.findUnique({
          where: { id: surveyId },
          select: { projectId: true }
        });
        extractedProjectId = survey?.projectId || null;
      }
    }

    // 2. Eksekusi Create dengan Validasi Relasi
    const expense = await prisma.surveyExpense.create({
      data: { 
        staffName,
        type: type || "SETTLEMENT",
        category,
        description: description || "",
        amount,
        date: formattedDate,
        receiptImage: receiptUrl,
        projectId: extractedProjectId,
        
        ...(surveyId && surveyId !== 'null' && { 
          survey: { connect: { id: surveyId } } 
        }),
        ...(extractedWorkOrderId && extractedWorkOrderId !== 'null' && { 
          workOrder: { connect: { id: extractedWorkOrderId } } 
        }),
        ...(parentExpenseId && parentExpenseId !== 'null' && { 
          parentExpense: { connect: { id: parentExpenseId } } 
        }),
        ...(customerId && customerId !== 'null' && { 
          customer: { connect: { id: customerId } } 
        }),
      }
    });

    res.status(201).json(expense);
  } catch (e) { 
    console.error('Expense Creation Error:', e);
    // Memberikan pesan error yang lebih user-friendly
    res.status(400).json({ 
      message: "Gagal menyimpan pengeluaran. Pastikan format data benar.",
      error: e.message 
    }); 
  }
});

app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await prisma.surveyExpense.findMany({
      include: { 
        survey: { 
          include: { 
            customer: true,
            project: true
          } 
        },
        workOrder: {
          include: {
            customer: true,
            project: true,
            salesOrder: { include: { customer: true } }
          }
        },
        project: { include: { customer: true } },
        purchaseOrder: {
          include: {
            vendor: true
          }
        },
        parentExpense: true,
        settlements: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.patch('/api/expenses/:id/status', async (req, res) => {
  try {
    const { status, approvedBy } = req.body;
    const expense = await prisma.surveyExpense.update({
      where: { id: req.params.id },
      data: { 
        status, 
        approvedBy, 
        approvedAt: status === 'APPROVED' ? new Date() : null 
      }
    });

    res.json(expense);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/expenses/:id/post', async (req, res) => {
  try {
    const expense = await prisma.$transaction(async (tx) => {
      const result = await tx.surveyExpense.update({
        where: { id: req.params.id },
        data: { status: 'POSTED' }
      });

      // 1. Resolve Required Accounts
      const { sourceAccountId } = req.body;
      let cashCoaId = sourceAccountId;

      const advanceAcc = await tx.systemAccount.findUnique({ where: { key: 'STAFF_ADVANCE' }, include: { coa: true } });
      if (!advanceAcc) throw new Error('Required System Account (STAFF_ADVANCE) not mapped');

      const expAcc = await tx.systemAccount.findUnique({ where: { key: 'EXPENSE' }, include: { coa: true } });
      if (!expAcc) throw new Error('Required System Account (EXPENSE) not mapped');

      let journalItems = [];

      if (result.type === 'SETTLEMENT') {
        // Settlement: Staff reports spending money already advanced to them
        // Debit: Operational Expense (Beban)
        // Credit: Staff Advance (Piutang Karyawan berkurang)
        
        // Detailed Category Mapping
        let targetCoaId = null;
        
        if (result.category === 'Beban Mobilisasi') {
          const acc = await tx.systemAccount.findUnique({ where: { key: 'PROJECT_MOBILIZATION' }, include: { coa: true } });
          targetCoaId = acc?.coaId;
        } else if (result.category === 'Bensin & Tol') {
          const coa = await tx.chartOfAccounts.findUnique({ where: { code: '6-10801-01' } });
          targetCoaId = coa?.id;
        } else if (result.category === 'Parkir') {
          const coa = await tx.chartOfAccounts.findUnique({ where: { code: '6-10803-01' } });
          targetCoaId = coa?.id;
        } else if (result.category === 'Makan & Akomodasi') {
          const coa = await tx.chartOfAccounts.findUnique({ where: { code: '6-11001-02' } });
          targetCoaId = coa?.id;
        } else if (result.category === 'Alat Tulis & Kantor') {
          const coa = await tx.chartOfAccounts.findUnique({ where: { code: '6-10204-01' } });
          targetCoaId = coa?.id;
        }

        // Fallback to general expense if no specific mapping found
        if (!targetCoaId) {
          const fallbackCoa = await tx.chartOfAccounts.findUnique({ where: { code: '6-11400' } });
          targetCoaId = fallbackCoa?.id;
          if (!targetCoaId) {
            // Last resort: use the generic EXPENSE system account (even if it's currently mapped to Water)
            targetCoaId = expAcc.coaId;
          }
        }

        journalItems = [
          {
            coaId: targetCoaId,
            description: `Settlement Expense (${result.category}): ${result.description} - Staff: ${result.staffName || 'N/A'}`,
            debit: result.amount,
            credit: 0
          },
          {
            coaId: advanceAcc.coaId,
            description: `Reduction of Advance: ${result.description} - Staff: ${result.staffName || 'N/A'}`,
            debit: 0,
            credit: result.amount
          }
        ];
      } else {
        // Fund Request (Default): Staff requests new money
        // Debit: Staff Advance (Piutang Karyawan bertambah)
        // Credit: Cash/Bank (Kas berkurang)
        if (!cashCoaId) {
          const cashAcc = await tx.systemAccount.findUnique({ where: { key: 'CASH' }, include: { coa: true } });
          if (!cashAcc) throw new Error('Required System Account (CASH) not mapped and no source account provided');
          cashCoaId = cashAcc.coaId;
        }

        journalItems = [
          {
            coaId: advanceAcc.coaId,
            description: `Uang Muka Kerja (Operasional): ${result.description} - Staff: ${result.staffName || 'N/A'}`,
            debit: result.amount,
            credit: 0
          },
          {
            coaId: cashCoaId,
            description: `Pengeluaran Kas/Bank: ${result.description}`,
            debit: 0,
            credit: result.amount
          }
        ];
      }

      const count = await tx.journalEntry.count();
      const jvNumber = `JV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

      await tx.journalEntry.create({
        data: {
          number: jvNumber,
          date: new Date(),
          description: `Posted ${result.type}: ${result.description}`,
          reference: result.id,
          type: 'EXPENSE',
          items: { create: journalItems }
        }
      });

      return result;
    });

    res.json(expense);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/projects/:id/status', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF']), async (req, res) => {
  try {
    const project = await prisma.preSalesProject.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });
    res.json(project);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- PROPOSAL ROUTES ---

async function generateProposalNumber() {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}-`;
  const last = await prisma.proposal.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' }
  });
  const lastNum = last ? parseInt(last.number.split('-')[2]) : 0;
  return `${prefix}${String(lastNum + 1).padStart(3, '0')}`;
}

app.get('/api/proposals', async (req, res) => {
  try {
    const proposals = await prisma.proposal.findMany({
      include: { customer: true, project: true, options: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(proposals);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/proposals/:id', async (req, res) => {
  try {
    const p = await prisma.proposal.findUnique({
      where: { id: req.params.id },
      include: { customer: true, project: true, options: true }
    });
    if (!p) return res.status(404).json({ message: 'Not found' });
    res.json(p);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/proposals', async (req, res) => {
  try {
    const { options = [], date, ...data } = req.body;
    const number = await generateProposalNumber();
    
    // Sanitize optional relations - Prisma expects undefined or null for optional fields
    // Using delete or setting to undefined is safer with cuid/uuid fields
    // Sanitize optional relations - more robust check
    if (data.customerId === "" || data.customerId === "null" || !data.customerId) delete data.customerId;
    if (data.projectId === "" || data.projectId === "null" || !data.projectId) delete data.projectId;

    const p = await prisma.proposal.create({
      data: {
        ...data,
        number,
        date: date ? new Date(date) : new Date(),
        options: {
          create: options.map(opt => ({
            name: opt.name,
            provider: opt.provider,
            description: opt.description,
            estimatedCost: Number(opt.estimatedCost) || 0,
            details: opt.details
          }))
        }
      },
      include: { customer: true, project: true, options: true }
    });
    res.status(201).json(p);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.put('/api/proposals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { options = [], date, customer, project, id: _, createdAt, updatedAt, ...data } = req.body;
    
    // Sanitize optional relations
    if (data.customerId === "" || !data.customerId) data.customerId = null;
    if (data.projectId === "" || !data.projectId) data.projectId = null;

    const p = await prisma.$transaction(async (tx) => {
      await tx.proposalOption.deleteMany({ where: { proposalId: id } });
      return tx.proposal.update({
        where: { id },
        data: {
          ...data,
          date: date ? new Date(date) : undefined,
          options: {
            create: options.map(opt => ({
              name: opt.name,
              provider: opt.provider,
              description: opt.description,
              estimatedCost: Number(opt.estimatedCost) || 0,
              details: opt.details
            }))
          }
        },
        include: { customer: true, project: true, options: true }
      });
    });
    res.json(p);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.delete('/api/proposals/:id', async (req, res) => {
  try {
    await prisma.proposal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});


// ─── INVENTORY: WAREHOUSES ────────────────────────────────────────────────────

app.get('/api/warehouses', async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: req.query.businessCategoryId ? { businessCategoryId: req.query.businessCategoryId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        stocks: { include: { sku: { include: { product: true } } } },
        _count: { select: { stocks: true } },
        businessCategory: true
      }
    });
    res.json(warehouses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/warehouses', async (req, res) => {
  try {
    const { businessCategory, ...data } = req.body;
    const warehouse = await prisma.warehouse.create({ 
      data: data,
      include: { businessCategory: true }
    });
    res.status(201).json(warehouse);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/warehouses/:id', async (req, res) => {
  try {
    const { id: _, businessCategory, ...data } = req.body;
    const warehouse = await prisma.warehouse.update({
      where: { id: req.params.id },
      data: data,
      include: { businessCategory: true }
    });
    res.json(warehouse);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/warehouses/:id', async (req, res) => {
  try {
    await prisma.warehouse.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ─── INVENTORY: STOCK MONITORING ──────────────────────────────────────────────

app.get('/api/inventory/stock', async (req, res) => {
  try {
    const skus = await prisma.productSKU.findMany({
      where: { isActive: true },
      include: {
        product: { include: { category: true } },
        warehouseStocks: { include: { warehouse: true } },
        stockMovementItems: {
          where: { movement: { status: 'CONFIRMED' } },
          include: { movement: true }
        }
      },
      orderBy: { code: 'asc' }
    });
    
    const result = skus.map(sku => {
      let totalIn = 0;
      let totalOut = 0;
      
      sku.stockMovementItems.forEach(item => {
        if (item.movement.type === 'IN' || item.movement.type === 'BEGINNING') totalIn += item.qty;
        else if (item.movement.type === 'OUT') totalOut += item.qty;
      });

      const { stockMovementItems, ...rest } = sku;
      
      return {
        ...rest,
        totalQty: sku.warehouseStocks.reduce((s, ws) => s + ws.quantity, 0),
        isLowStock: sku.warehouseStocks.reduce((s, ws) => s + ws.quantity, 0) <= sku.minStock,
        totalIn,
        totalOut
      };
    });
    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/inventory/stock/:skuId/movements', async (req, res) => {
  try {
    const { skuId } = req.params;
    const movements = await prisma.stockMovementItem.findMany({
      where: {
        skuId,
        movement: { status: 'CONFIRMED' }
      },
      include: {
        movement: {
          include: {
            warehouse: true,
            toWarehouse: true
          }
        }
      },
      orderBy: { movement: { date: 'desc' } }
    });
    res.json(movements);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const skus = await prisma.productSKU.findMany({
      where: { isActive: true },
      include: {
        product: true,
        warehouseStocks: { include: { warehouse: true } }
      }
    });
    const lowStock = skus
      .map(sku => ({
        ...sku,
        totalQty: sku.warehouseStocks.reduce((s, ws) => s + ws.quantity, 0)
      }))
      .filter(sku => sku.totalQty <= sku.minStock);
    res.json(lowStock);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ─── INVENTORY: STOCK MOVEMENTS ───────────────────────────────────────────────

const generateMovementNumber = async (type) => {
  const prefix = { IN: 'SIN', OUT: 'SOUT', TRANSFER: 'TRF', ADJUSTMENT: 'ADJ', BEGINNING: 'BGN', OPNAME: 'OPN' }[type] || 'MOV';
  const year = new Date().getFullYear();
  const count = await prisma.stockMovement.count({ where: { type } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
};

app.get('/api/stock-movements', async (req, res) => {
  try {
    const { type, status } = req.query;
    const movements = await prisma.stockMovement.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(status ? { status } : {})
      },
      include: {
        warehouse: true,
        toWarehouse: true,
        workOrder: {
          include: {
            project: true,
            customer: true
          }
        },
        items: { include: { sku: { include: { product: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/stock-movements/:id', async (req, res) => {
  try {
    const movement = await prisma.stockMovement.findUnique({
      where: { id: req.params.id },
      include: {
        warehouse: true,
        toWarehouse: true,
        items: { include: { sku: { include: { product: true, unit: true } } } }
      }
    });
    res.json(movement);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/stock-movements', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const number = await generateMovementNumber(data.type);
    const movement = await prisma.stockMovement.create({
      data: {
        ...data,
        number,
        date: data.date ? new Date(data.date) : new Date(),
        items: {
          create: items.map(i => ({
            skuId: i.skuId,
            qty: Number(i.qty) || 0,
            systemQty: i.systemQty !== undefined ? Number(i.systemQty) : null,
            unitCost: Number(i.unitCost) || 0,
            notes: i.notes
          }))
        }
      },
      include: {
        warehouse: true,
        toWarehouse: true,
        workOrder: true,
        items: { include: { sku: { include: { product: true } } } }
      }
    });
    res.status(201).json(movement);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/stock-movements/:id', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const movement = await prisma.$transaction(async (tx) => {
      await tx.stockMovement.update({
        where: { id: req.params.id },
        data: { ...data, date: data.date ? new Date(data.date) : undefined }
      });
      // Resync items
      await tx.stockMovementItem.deleteMany({ where: { movementId: req.params.id } });
      await tx.stockMovementItem.createMany({
        data: items.map(i => ({
          movementId: req.params.id,
          skuId: i.skuId,
          qty: Number(i.qty) || 0,
          systemQty: i.systemQty !== undefined ? Number(i.systemQty) : null,
          unitCost: Number(i.unitCost) || 0,
          notes: i.notes
        }))
      });
      return tx.stockMovement.findUnique({
        where: { id: req.params.id },
        include: { warehouse: true, toWarehouse: true, workOrder: true, items: { include: { sku: { include: { product: true } } } } }
      });
    });
    res.json(movement);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Confirm a movement — atomically apply stock changes
app.post('/api/stock-movements/:id/confirm', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findUnique({
        where: { id: req.params.id },
        include: { items: true }
      });
      if (!movement) throw new Error('Movement not found');
      if (movement.status !== 'DRAFT') throw new Error('Already confirmed or cancelled');

      const upsertStock = async (warehouseId, skuId, delta) => {
        await tx.warehouseStock.upsert({
          where: { warehouseId_skuId: { warehouseId, skuId } },
          create: { warehouseId, skuId, quantity: Math.max(0, delta) },
          update: { quantity: { increment: delta } }
        });
      };

      for (const item of movement.items) {
        if (movement.type === 'IN' || movement.type === 'BEGINNING') {
          await upsertStock(movement.warehouseId, item.skuId, item.qty);
        } else if (movement.type === 'OUT') {
          await upsertStock(movement.warehouseId, item.skuId, -item.qty);
        } else if (movement.type === 'TRANSFER') {
          await upsertStock(movement.warehouseId, item.skuId, -item.qty);
          if (movement.toWarehouseId) {
            await upsertStock(movement.toWarehouseId, item.skuId, item.qty);
          }
        } else if (movement.type === 'ADJUSTMENT' || movement.type === 'OPNAME') {
          // qty is the new target, systemQty is old — apply delta
          const delta = item.qty - (item.systemQty || 0);
          await upsertStock(movement.warehouseId, item.skuId, delta);
        }
      }

      const result = await tx.stockMovement.update({
        where: { id: req.params.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: req.body.confirmedBy || 'System' },
        include: { warehouse: true, toWarehouse: true, items: { include: { sku: { include: { product: true } } } } }
      });

      // Automated Journaling and Price Sync
      for (const item of result.items) {
        const amount = (Number(item.unitCost) || 0) * item.qty;
        
        // 1. Update Product SKU Purchase Price (Refinement)
        if (result.type === 'IN' || result.type === 'BEGINNING') {
          await tx.productSKU.update({
            where: { id: item.skuId },
            data: { purchasePrice: Number(item.unitCost) || 0 }
          });
        }

        if (amount <= 0) continue;

        // 2. Journaling
        if (result.type === 'IN' || result.type === 'BEGINNING') {
           await postJournalFromSystemKey({
             systemKey: 'INVENTORY_PUSAT',
             counterSystemKey: 'UNBILLED_RECEIPT',
             amount,
             description: `Stock IN: ${result.number} - ${item.sku.name}`,
             reference: result.number,
             type: 'STOCK_MOVEMENT',
             prismaTx: tx
           });
        } else if (result.type === 'OUT') {
           // Fallback or handle based on other keys if necessary
           await postJournalFromSystemKey({
             systemKey: 'COGS', // Ensure COGS key exists or handle fallback
             counterSystemKey: 'INVENTORY_PUSAT',
             amount,
             description: `Stock OUT: ${result.number} - ${item.sku.name}`,
             reference: result.number,
             type: 'INVENTORY',
             prismaTx: tx
           });
        }
      }

      return result;
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/stock-movements/:id/cancel', async (req, res) => {
  try {
    const movement = await prisma.stockMovement.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' }
    });
    res.json(movement);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// Revert confirmed movement back to DRAFT (also reverses warehouse stock changes)
app.patch('/api/stock-movements/:id/revert', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findUnique({
        where: { id: req.params.id },
        include: { items: true }
      });
      if (!movement) throw new Error('Movement not found');
      if (movement.status !== 'CONFIRMED') throw new Error('Only confirmed movements can be reverted');

      // Reverse warehouse stock changes
      const reverseStock = async (warehouseId, skuId, delta) => {
        const existing = await tx.warehouseStock.findUnique({
          where: { warehouseId_skuId: { warehouseId, skuId } }
        });
        if (existing) {
          await tx.warehouseStock.update({
            where: { warehouseId_skuId: { warehouseId, skuId } },
            data: { quantity: Math.max(0, existing.quantity + delta) }
          });
        }
      };

      for (const item of movement.items) {
        if (movement.type === 'IN' || movement.type === 'BEGINNING') {
          await reverseStock(movement.warehouseId, item.skuId, -item.qty);
        } else if (movement.type === 'OUT') {
          await reverseStock(movement.warehouseId, item.skuId, item.qty);
        } else if (movement.type === 'TRANSFER') {
          await reverseStock(movement.warehouseId, item.skuId, item.qty);
          if (movement.toWarehouseId) {
            await reverseStock(movement.toWarehouseId, item.skuId, -item.qty);
          }
        }
      }

      return tx.stockMovement.update({
        where: { id: req.params.id },
        data: { status: 'DRAFT', confirmedAt: null, confirmedBy: null }
      });
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// ─── WORK ORDERS ──────────────────────────────────────────────────────────────

const generateWONumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.workOrder.count();
  return `WO-${year}-${String(count + 1).padStart(4, '0')}`;
};

const WO_INCLUDE = {
  project: true,
  businessCategory: true,
  salesOrder: { include: { customer: true, items: true } },
  customer: true,
  asset: true,
  items: { 
    include: { sku: { include: { product: true } } }, 
    orderBy: { sortOrder: 'asc' } 
  },
  tasks: { orderBy: { sortOrder: 'asc' } },
  stockMovements: { include: { items: true }, orderBy: { createdAt: 'desc' } },
  surveyExpenses: { orderBy: { createdAt: 'desc' } },
  reports: { include: { photos: true, task: { select: { id: true, title: true } } }, orderBy: { date: 'desc' } }
};

app.get('/api/work-orders', async (req, res) => {
  try {
    const { type, status, priority, search, businessCategoryId } = req.query;
    const userRole = req.headers['x-user-role'];
    const userDept = req.headers['x-user-dept'];
    const userName = req.headers['x-user-name'];

    const whereClause = {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? {
        OR: [
          { number: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { assignedTo: { contains: search, mode: 'insensitive' } },
        ]
      } : {}),
      ...(businessCategoryId ? { businessCategoryId } : {}),
      // Restriction: Operational department users only see their own assigned work orders
      ...(userDept === 'OPERATIONAL' ? { assignedTo: userName } : {})
    };

    const workOrders = await prisma.workOrder.findMany({
      where: whereClause,
      include: WO_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    
    // Map surveyExpenses to expenses for frontend compatibility
    const mappedWos = workOrders.map(wo => {
      const { surveyExpenses, ...rest } = wo;
      return { ...rest, expenses: surveyExpenses };
    });
    
    res.json(mappedWos);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/work-orders/:id', async (req, res) => {
  try {
    const wo = await prisma.workOrder.findUnique({ where: { id: req.params.id }, include: WO_INCLUDE });
    if (!wo) return res.status(404).json({ message: 'Not found' });
    
    // Map surveyExpenses to expenses for frontend compatibility
    const { surveyExpenses, ...rest } = wo;
    res.json({ ...rest, expenses: surveyExpenses });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/operator/dashboard', async (req, res) => {
  try {
    const { user } = req.query;
    if (!user) return res.status(400).json({ message: 'User parameter is required' });

    const stats = await prisma.workOrder.groupBy({
      by: ['status'],
      where: { assignedTo: user },
      _count: { _all: true }
    });

    const myTasks = await prisma.workOrder.findMany({
      where: { 
        assignedTo: user,
        status: { in: ['CONFIRMED', 'IN_PROGRESS', 'ON_HOLD'] }
      },
      include: WO_INCLUDE,
      orderBy: { priority: 'asc' },
      take: 10
    });

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const serviceReminders = await prisma.customerAsset.findMany({
      where: {
        nextServiceDate: { lte: nextWeek },
        status: 'ACTIVE'
      },
      include: { customer: true },
      take: 10
    });

    const recentReports = await prisma.workOrderReport.findMany({
      where: { reportedBy: user },
      include: { workOrder: true },
      orderBy: { date: 'desc' },
      take: 5
    });

    // Add formatted mapped tasks for consistency
    const mappedTasks = myTasks.map(wo => {
      const { surveyExpenses, ...rest } = wo;
      return { ...rest, expenses: surveyExpenses };
    });

    res.json({
      stats: stats.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count._all }), {}),
      myTasks: mappedTasks,
      serviceReminders,
      recentReports
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/work-orders', async (req, res) => {
  try {
    const { items = [], tasks = [], assetId, businessCategory, ...data } = req.body;
    const number = await generateWONumber();
    const result = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          ...data,
          number,
          assetId,
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
          items: {
            create: items.map((item, idx) => ({
              type: item.type || 'MATERIAL',
              source: item.source || 'STOCK',
              description: item.description,
              skuId: item.skuId || null,
              qty: Number(item.qty) || 1,
              unit: item.unit || 'unit',
              unitCost: Number(item.unitCost) || 0,
              totalCost: (Number(item.qty) || 1) * (Number(item.unitCost) || 0),
              notes: item.notes,
              sortOrder: idx
            }))
          },
          tasks: {
            create: tasks.map((task, idx) => ({
              title: task.title,
              description: task.description,
              sortOrder: idx
            }))
          }
        },
        include: WO_INCLUDE
      });

      // Update Sales Order status to PROCESSING if linked
      if (data.salesOrderId) {
        await tx.salesOrder.update({
          where: { id: data.salesOrderId },
          data: { status: 'PROCESSING' }
        });
      }

      return wo;
    });

    res.status(201).json(result);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.put('/api/work-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items = [], tasks = [], businessCategory, ...data } = req.body;
    const wo = await prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id },
        data: {
          ...data,
          scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : null,
          scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : null,
          actualStart: data.actualStart ? new Date(data.actualStart) : null,
          actualEnd: data.actualEnd ? new Date(data.actualEnd) : null,
        }
      });
      // Fetch existing items to preserve their isReleased status
      const existingItems = await tx.workOrderItem.findMany({ where: { workOrderId: id } });
      // Use map to easily look up by description/sku since IDs might change if generated on frontend vs backend
      // But ideally we should use ID if the frontend provides it.
      
      // Resync items
      await tx.workOrderItem.deleteMany({ where: { workOrderId: id } });
      if (items.length > 0) {
        await tx.workOrderItem.createMany({
          data: items.map((item, idx) => {
            // Check if this item was already released in the database
            const existing = existingItems.find(ei => 
              (item.id && ei.id === item.id) || 
              (ei.description === item.description && ei.skuId === item.skuId)
            );
            
            return {
              workOrderId: id,
              type: item.type || 'MATERIAL',
              source: item.source || 'STOCK',
              description: item.description,
              skuId: item.skuId || null,
              qty: Number(item.qty) || 1,
              unit: item.unit || 'unit',
              unitCost: Number(item.unitCost) || 0,
              totalCost: (Number(item.qty) || 1) * (Number(item.unitCost) || 0),
              isReleased: item.isReleased !== undefined ? item.isReleased : (existing ? existing.isReleased : false),
              notes: item.notes,
              sortOrder: idx
            };
          })
        });
      }
      // Resync tasks (preserve isDone state if same title)
      await tx.workOrderTask.deleteMany({ where: { workOrderId: id } });
      if (tasks.length > 0) {
        await tx.workOrderTask.createMany({
          data: tasks.map((task, idx) => ({
            workOrderId: id,
            title: task.title,
            description: task.description,
            isDone: task.isDone || false,
            doneAt: task.isDone ? (task.doneAt ? new Date(task.doneAt) : new Date()) : null,
            sortOrder: idx
          }))
        });
      }
      return tx.workOrder.findUnique({ where: { id }, include: WO_INCLUDE });
    });
    res.json(wo);
  } catch (e) { console.error(e); res.status(400).json({ message: e.message }); }
});

app.patch('/api/work-orders/:id/status', async (req, res) => {
  try {
    const { status, actualStart, actualEnd, actualHours, completionNotes } = req.body;
    const updateData = { status };
    if (status === 'IN_PROGRESS' && !actualStart) updateData.actualStart = new Date();
    if (actualStart) updateData.actualStart = new Date(actualStart);
    if (status === 'COMPLETED' || status === 'CLOSED') {
      if (!actualEnd) updateData.actualEnd = new Date();
      if (actualEnd) updateData.actualEnd = new Date(actualEnd);
    }
    if (actualHours) updateData.actualHours = Number(actualHours);
    if (completionNotes) updateData.completionNotes = completionNotes;

    const wo = await prisma.$transaction(async (tx) => {
      const updatedWo = await tx.workOrder.update({
        where: { id: req.params.id },
        data: updateData,
        include: { salesOrder: true }
      });

      if (status === 'IN_PROGRESS' && updatedWo.salesOrderId) {
        await tx.salesOrder.update({
          where: { id: updatedWo.salesOrderId },
          data: { status: 'PROCESSING' }
        });
      }

      // If WO is COMPLETED and linked to an asset, update asset service dates
      if ((status === 'COMPLETED' || status === 'CLOSED') && updatedWo.assetId) {
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 3); // Default to 3 months for AC/General
        
        await tx.customerAsset.update({
          where: { id: updatedWo.assetId },
          data: {
            lastServiceDate: new Date(),
            nextServiceDate: nextDate
          }
        });
      }

      return updatedWo;
    });

    res.json(wo);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/work-orders/:id/tasks/:taskId', async (req, res) => {
  try {
    const { isDone } = req.body;
    const task = await prisma.workOrderTask.update({
      where: { id: req.params.taskId },
      data: { isDone, doneAt: isDone ? new Date() : null }
    });
    res.json(task);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/work-orders/:id', async (req, res) => {
  try {
    const wo = await prisma.workOrder.findUnique({ where: { id: req.params.id }, select: { status: true } });
    if (!wo) return res.status(404).json({ message: 'Not found' });
    if (wo.status !== 'DRAFT' && wo.status !== 'CANCELLED') {
      return res.status(400).json({ message: 'Only DRAFT or CANCELLED work orders can be deleted' });
    }
    await prisma.workOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/work-orders/:id/expenses', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, description, status = 'PENDING' } = req.body;
    
    const expense = await prisma.surveyExpense.create({
      data: {
        workOrderId: id,
        category,
        amount: Number(amount) || 0,
        description,
        status
      }
    });
    
    res.status(201).json(expense);
  } catch (e) { 
    res.status(400).json({ message: e.message }); 
  }
});

app.post('/api/work-orders/:id/release-materials', async (req, res) => {
  try {
    const { id } = req.params;
    const { warehouseId, notes } = req.body;
    if (!warehouseId) return res.status(400).json({ message: 'Pilih gudang asal material' });
    const result = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({
        where: { id },
        include: { items: { where: { type: 'MATERIAL', isReleased: false, skuId: { not: null } } } }
      });
      if (!wo) throw new Error('Work Order tidak ditemukan');
      if (wo.items.length === 0) throw new Error('Tidak ada material baru yang perlu dirilis');
      const movementNumber = await generateMovementNumber('OUT');
      const movement = await tx.stockMovement.create({
        data: {
          number: movementNumber,
          type: 'OUT',
          status: 'DRAFT',
          date: new Date(),
          warehouseId,
          referenceType: 'WORK_ORDER',
          referenceNumber: wo.number,
          workOrderId: wo.id,
          notes: notes || `Pengeluaran material untuk WO ${wo.number}`,
          items: {
            create: wo.items.map(it => ({
              skuId: it.skuId,
              qty: it.qty,
              unitCost: it.unitCost,
              notes: it.notes
            }))
          }
        }
      });
      await tx.workOrderItem.updateMany({
        where: { id: { in: wo.items.map(it => it.id) } },
        data: { isReleased: true }
      });
      return movement;
    });
    res.status(201).json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- WORK ORDER REPORTS ---

app.get('/api/reports', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const userDept = req.headers['x-user-dept'];
    const userName = req.headers['x-user-name'];

    const reports = await prisma.workOrderReport.findMany({
      where: {
        ...((userRole === 'OPERATIONAL' || userDept === 'OPERATIONAL') ? { reportedBy: userName } : {})
      },
      include: { 
        photos: true,
        task: { select: { id: true, title: true } },
        workOrder: {
          select: {
            id: true,
            number: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(reports);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/work-orders/:id/reports', async (req, res) => {
  try {
    const reports = await prisma.workOrderReport.findMany({
      where: { workOrderId: req.params.id },
      include: { photos: true, task: { select: { id: true, title: true } } },
      orderBy: { date: 'desc' }
    });
    res.json(reports);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/work-orders/:id/reports', upload.array('photos', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { description, progress, reportedBy, date, taskId, checklist: checklistRaw } = req.body;
    
    let checklist = null;
    if (checklistRaw) {
      checklist = typeof checklistRaw === 'string' ? JSON.parse(checklistRaw) : checklistRaw;
    }
    
    const photoUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await processReportImage(file);
        photoUrls.push(url);
      }
    }

    const report = await prisma.$transaction(async (tx) => {
      const r = await tx.workOrderReport.create({
        data: {
          workOrderId: id,
          taskId: taskId || null,
          description: description || '',
          progress: Number(progress) || 0,
          reportedBy: reportedBy || null,
          date: date ? new Date(date) : new Date(),
          checklist: checklist || undefined,
          photos: {
            create: photoUrls.map(url => ({ url }))
          }
        },
        include: { photos: true, task: true }
      });

      // Auto-complete task if progress is 100%
      if (taskId && Number(progress) >= 100) {
        await tx.workOrderTask.update({
          where: { id: taskId },
          data: { isDone: true, doneAt: new Date() }
        });
      }

      return r;
    }, { maxWait: 10000, timeout: 30000 });

    res.status(201).json(report);
  } catch (e) { 
    console.error('Error creating report:', e);
    res.status(400).json({ message: e.message }); 
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    await prisma.workOrderReport.delete({ where: { id: req.params.id } });
    res.json({ message: 'Report deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- DELIVERY ORDERS (BAST) ───────────────────────────────────────────────────

const generateDONumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.deliveryOrder.count();
  return `DO-${year}-${String(count + 1).padStart(4, '0')}`;
};

const DO_INCLUDE = {
  customer: true,
  project: true,
  salesOrder: true,
  workOrder: true,
  items: { orderBy: { no: 'asc' } }
};

app.get('/api/delivery-orders', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const userName = req.headers['x-user-name'];
    const { status, projectId, customerId } = req.query;

    const dos = await prisma.deliveryOrder.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(customerId ? { customerId } : {}),
        ...(userRole === 'OPERATIONAL' ? { workOrder: { assignedTo: userName } } : {})
      },
      include: DO_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    res.json(dos);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/delivery-orders/:id', async (req, res) => {
  try {
    const doRec = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.id },
      include: DO_INCLUDE
    });
    if (!doRec) return res.status(404).json({ message: 'Not found' });
    res.json(doRec);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/delivery-orders', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const number = await generateDONumber();
    const doRec = await prisma.$transaction(async (tx) => {
      const rec = await tx.deliveryOrder.create({
        data: {
          ...data,
          number,
          date: data.date ? new Date(data.date) : new Date(),
          items: {
            create: items.map((it, idx) => ({
              no: idx + 1,
              description: it.description,
              qty: Number(it.qty) || 1,
              unit: it.unit || 'pcs'
            }))
          }
        },
        include: DO_INCLUDE
      });
      await advanceSalesOrderStatus(tx, data.salesOrderId, 'SHIPPED');
      return rec;
    });
    res.status(201).json(doRec);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/delivery-orders/:id', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined
        }
      });
      await advanceSalesOrderStatus(tx, data.salesOrderId, 'SHIPPED');
      await tx.deliveryOrderItem.deleteMany({ where: { deliveryOrderId: id } });
      if (items.length > 0) {
        await tx.deliveryOrderItem.createMany({
          data: items.map((it, idx) => ({
            deliveryOrderId: id,
            no: idx + 1,
            description: it.description,
            qty: Number(it.qty) || 1,
            unit: it.unit || 'pcs'
          }))
        });
      }
      return tx.deliveryOrder.findUnique({ where: { id }, include: DO_INCLUDE });
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/delivery-orders/:id', async (req, res) => {
  try {
    await prisma.deliveryOrder.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/delivery-orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const doRec = await tx.deliveryOrder.findUnique({
        where: { id: req.params.id },
        select: { id: true, salesOrderId: true }
      });
      if (!doRec) throw new Error('Not found');
      const updated = await tx.deliveryOrder.update({
        where: { id: req.params.id },
        data: { status },
        include: DO_INCLUDE
      });
      const soStatus = status === 'DELIVERED' ? 'DELIVERED' : status === 'SHIPPED' ? 'SHIPPED' : null;
      if (soStatus) await advanceSalesOrderStatus(tx, doRec.salesOrderId, soStatus);
      return updated;
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- BAST (BERITA ACARA SERAH TERIMA) ──────────────────────────────────────────

const generateBASTNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.bAST.count();
  return `BAST-${year}-${String(count + 1).padStart(4, '0')}`;
};

const BAST_INCLUDE = {
  customer: true,
  project: true,
  salesOrder: true,
  workOrder: true,
  items: { orderBy: { no: 'asc' } }
};

app.get('/api/basts', async (req, res) => {
  try {
    const { status, projectId, customerId } = req.query;
    const basts = await prisma.bAST.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(customerId ? { customerId } : {})
      },
      include: BAST_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    res.json(basts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/basts/:id', async (req, res) => {
  try {
    const bast = await prisma.bAST.findUnique({
      where: { id: req.params.id },
      include: BAST_INCLUDE
    });
    if (!bast) return res.status(404).json({ message: 'Not found' });
    res.json(bast);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/basts', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const number = await generateBASTNumber();
    const bast = await prisma.bAST.create({
      data: {
        ...data,
        number,
        date: data.date ? new Date(data.date) : new Date(),
        items: {
          create: items.map((it, idx) => ({
            no: idx + 1,
            description: it.description,
            qty: Number(it.qty) || 1,
            unit: it.unit || 'pcs'
          }))
        }
      },
      include: BAST_INCLUDE
    });
    res.status(201).json(bast);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/basts/:id', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      await tx.bAST.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined
        }
      });
      await tx.bASTItem.deleteMany({ where: { bastId: id } });
      if (items.length > 0) {
        await tx.bASTItem.createMany({
          data: items.map((it, idx) => ({
            bastId: id,
            no: idx + 1,
            description: it.description,
            qty: Number(it.qty) || 1,
            unit: it.unit || 'pcs'
          }))
        });
      }
      return tx.bAST.findUnique({ where: { id }, include: BAST_INCLUDE });
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/basts/:id', async (req, res) => {
  try {
    await prisma.bAST.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- INVOICES ──────────────────────────────────────────────────────────────────

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

const INV_INCLUDE = {
  customer: true,
  project: true,
  salesOrder: true,
  deliveryOrder: true,
  bast: true,
  contract: true,
  bankAccount: true,
  items: { orderBy: { no: 'asc' } },
  payments: { orderBy: { date: 'asc' } }
};

app.get('/api/invoices', async (req, res) => {
  try {
    const { status, projectId, customerId } = req.query;
    const invoices = await prisma.invoice.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(customerId ? { customerId } : {})
      },
      include: INV_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    
    // Alias grandTotal to totalAmount for frontend dashboard compatibility
    const mappedInvoices = invoices.map(inv => ({
      ...inv,
      totalAmount: inv.grandTotal
    }));

    res.json(mappedInvoices);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const inv = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: INV_INCLUDE
    });
    if (!inv) return res.status(404).json({ message: 'Not found' });
    
    // Alias grandTotal to totalAmount
    res.json({
      ...inv,
      totalAmount: inv.grandTotal
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { items = [], ...data } = req.body;
    const number = await generateInvoiceNumber();
    const inv = await prisma.$transaction(async (tx) => {
      const rec = await tx.invoice.create({
        data: {
          ...data,
          number,
          status: 'DRAFT',
          date: data.date ? new Date(data.date) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          subtotal: Number(data.subtotal) || 0,
          tax: Number(data.tax) || 11,
          discount: Number(data.discount) || 0,
          discountAmt: Number(data.discountAmt) || 0,
          taxAmt: Number(data.taxAmt) || 0,
          grandTotal: Number(data.grandTotal) || 0,
          contractId: data.contractId || null,
          bankAccountId: data.bankAccountId || null,
          signerName: data.signerName || null,
          signerPosition: data.signerPosition || null,
          items: {
            create: items.map((it, idx) => ({
              no: idx + 1,
              description: it.description,
              qty: Number(it.qty) || 1,
              unit: it.unit || 'pcs',
              unitPrice: Number(it.unitPrice) || 0,
              discount: Number(it.discount) || 0,
              amount: Number(it.amount) || 0
            }))
          }
        },
        include: INV_INCLUDE
      });
      await advanceSalesOrderStatus(tx, data.salesOrderId, 'INVOICED');
      await advanceDeliveryOrderStatus(tx, await resolveDeliveryOrder(tx, data.salesOrderId, data.deliveryOrderId), 'INVOICED');
      return rec;
    });
    res.status(201).json(inv);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/invoices/:id/post', async (req, res) => {
  try {
    const { id } = req.params;
    const inv = await prisma.$transaction(async (tx) => {
      const result = await tx.invoice.update({
        where: { id },
        data: { status: 'POSTED' },
        include: INV_INCLUDE
      });

      await advanceSalesOrderStatus(tx, result.salesOrderId, 'INVOICED');
      await advanceDeliveryOrderStatus(tx, await resolveDeliveryOrder(tx, result.salesOrderId, result.deliveryOrderId), 'INVOICED');

      // 1. Resolve Required System Accounts
      const [arAcc, revAcc, vatAcc] = await Promise.all([
        tx.systemAccount.findUnique({ where: { key: 'ACCOUNTS_RECEIVABLE' }, include: { coa: true } }),
        tx.systemAccount.findUnique({ where: { key: 'SALES_REVENUE' }, include: { coa: true } }),
        tx.systemAccount.findUnique({ where: { key: 'VAT_OUT' }, include: { coa: true } })
      ]);

      if (!arAcc || !revAcc) throw new Error('Required System Accounts (AR/Revenue) not mapped');

      const journalItems = [];
      
      // AR (Total Grand Total) -> DEBIT
      journalItems.push({
        coaId: arAcc.coaId,
        description: `Piutang Usaha: ${result.number} - ${result.customer?.name || ''}`,
        debit: result.grandTotal,
        credit: 0
      });

      // Revenue (Granular per item) -> CREDIT
      if (result.items && result.items.length > 0) {
        const totalDiscount = result.discountAmt || 0;
        const totalSubtotal = result.subtotal || 1; // prevent division by zero
        
        result.items.forEach(item => {
          const proratedDiscount = (item.amount / totalSubtotal) * totalDiscount;
          const itemRevenue = item.amount - proratedDiscount;
          
          if (Math.abs(itemRevenue) > 0.01) {
            journalItems.push({
              coaId: revAcc.coaId,
              description: `Revenue: ${item.description}`,
              debit: 0,
              credit: itemRevenue
            });
          }
        });
      } else {
        // Fallback for invoices without item records
        journalItems.push({
          coaId: revAcc.coaId,
          description: `Pendapatan Jasa: ${result.number}`,
          debit: 0,
          credit: result.subtotal - result.discountAmt
        });
      }

      // VAT (If any) -> CREDIT

      // VAT (If any) -> CREDIT
      if (result.taxAmt > 0 && vatAcc) {
        journalItems.push({
          coaId: vatAcc.coaId,
          description: `PPN Keluaran: ${result.number}`,
          debit: 0,
          credit: result.taxAmt
        });
      }

      // Create Journal Entry
      const count = await tx.journalEntry.count();
      const jvNumber = `JV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

      await tx.journalEntry.create({
        data: {
          number: jvNumber,
          date: result.date,
          description: `Posted Invoice: ${result.number} - ${result.customer?.name || ''}`,
          reference: result.number,
          type: 'INVOICE',
          items: { create: journalItems }
        }
      });

      return result;
    });
    res.json(inv);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/invoices/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { bankAccountId, amount } = req.body;

    const inv = await prisma.$transaction(async (tx) => {
      // 1. Get the invoice and ensure it can be paid
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: { ...INV_INCLUDE, payments: true }
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'PAID') throw new Error('Invoice already fully paid');

      const currentPaid = invoice.payments ? invoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
      const paymentAmount = amount ? Number(amount) : (invoice.grandTotal - currentPaid);

      if (paymentAmount <= 0) throw new Error('Payment amount must be greater than 0');

      const totalPaid = currentPaid + paymentAmount;
      const newStatus = totalPaid >= invoice.grandTotal ? 'PAID' : 'PARTIAL';

      // 2. Resolve Bank and AR Accounts
      let targetCoaId = null;
      if (bankAccountId) {
        const bank = await tx.bankAccount.findUnique({
          where: { id: bankAccountId },
          include: { coa: true }
        });
        if (bank?.coaId) {
          targetCoaId = bank.coaId;
        }
      }

      // If no bank provided or bank has no COA, fallback to system CASH account
      if (!targetCoaId) {
        const cashAcc = await tx.systemAccount.findUnique({
          where: { key: 'CASH' },
          include: { coa: true }
        });
        if (!cashAcc) throw new Error('CASH system account not mapped and no bank provided');
        targetCoaId = cashAcc.coaId;
      }

      const arAcc = await tx.systemAccount.findUnique({
        where: { key: 'ACCOUNTS_RECEIVABLE' },
        include: { coa: true }
      });
      if (!arAcc) throw new Error('AR system account not mapped');

      // 3. Create InvoicePayment and Update Invoice Status
      const result = await tx.invoice.update({
        where: { id },
        data: { 
          status: newStatus,
          bankAccountId: bankAccountId || invoice.bankAccountId 
        },
        include: { ...INV_INCLUDE, payments: true }
      });

      await advanceSalesOrderStatus(tx, result.salesOrderId, newStatus === 'PAID' ? 'PAID' : 'PARTIAL');
      await advanceDeliveryOrderStatus(tx, await resolveDeliveryOrder(tx, result.salesOrderId, result.deliveryOrderId), newStatus === 'PAID' ? 'PAID' : 'INVOICED');

      const paymentRecord = await tx.invoicePayment.create({
        data: {
          invoiceId: id,
          amount: paymentAmount,
          date: new Date(),
          paymentMethod: 'TRANSFER',
          status: 'SUCCESS',
          notes: `Ref: PAY-${result.number}-${result.payments.length + 1}`
        }
      });

      // 4. Create Journal Entry
      const journalItems = [
        {
          coaId: targetCoaId,
          description: `Penerimaan Pembayaran (${newStatus}): ${result.number} - ${result.customer?.name || ''}`,
          debit: paymentAmount,
          credit: 0
        },
        {
          coaId: arAcc.coaId,
          description: `Pelunasan Piutang (${newStatus}): ${result.number}`,
          debit: 0,
          credit: paymentAmount
        }
      ];

      const lastJE = await tx.journalEntry.findFirst({
        where: { number: { startsWith: `JV-${new Date().getFullYear()}-` } },
        orderBy: { number: 'desc' }
      });
      const nextNum = lastJE ? parseInt(lastJE.number.split('-')[2] || '0') + 1 : 1;
      const jvNumber = `JV-${new Date().getFullYear()}-${nextNum.toString().padStart(4, '0')}`;

      await tx.journalEntry.create({
        data: {
          number: jvNumber,
          date: new Date(),
          description: `Payment for Invoice: ${result.number}`,
          reference: result.number,
          type: 'RECEIPT',
          items: { create: journalItems }
        }
      });

      return result;
    });

    res.json(inv);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    // BUG FIX: Destructure `status` out of req.body so it can't be maliciously updated via PUT
    const { items = [], status, ...data } = req.body;
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          subtotal: Number(data.subtotal) || 0,
          tax: Number(data.tax) || 11,
          discount: Number(data.discount) || 0,
          discountAmt: Number(data.discountAmt) || 0,
          taxAmt: Number(data.taxAmt) || 0,
          grandTotal: Number(data.grandTotal) || 0,
          contractId: data.contractId || null,
          bankAccountId: data.bankAccountId || null,
          signerName: data.signerName || null,
          signerPosition: data.signerPosition || null,
        }
      });
      await advanceSalesOrderStatus(tx, data.salesOrderId, 'INVOICED');
      await advanceDeliveryOrderStatus(tx, await resolveDeliveryOrder(tx, data.salesOrderId, data.deliveryOrderId), 'INVOICED');
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      if (items.length > 0) {
        await tx.invoiceItem.createMany({
          data: items.map((it, idx) => ({
            invoiceId: id,
            no: idx + 1,
            description: it.description,
            qty: Number(it.qty) || 1,
            unit: it.unit || 'pcs',
            unitPrice: Number(it.unitPrice) || 0,
            discount: Number(it.discount) || 0,
            amount: Number(it.amount) || 0
          }))
        });
      }
      return tx.invoice.findUnique({ where: { id }, include: INV_INCLUDE });
    });
    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- BANK ACCOUNT ROUTES ---

app.get('/api/banks', async (req, res) => {
  try {
    const banks = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(banks);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/banks', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.coaId === '') data.coaId = null;
    const bank = await prisma.bankAccount.create({ data });
    res.status(201).json(bank);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/banks/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.coaId === '') data.coaId = null;
    const bank = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data
    });
    res.json(bank);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/banks/:id', async (req, res) => {
  try {
    await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- CHART OF ACCOUNTS (COA) ---

app.get('/api/coa', async (req, res) => {
  try {
    const { type, search } = req.query;
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(search ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ]
        } : {})
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        _count: { select: { children: true } }
      },
      orderBy: { code: 'asc' }
    });
    res.json(accounts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/coa/:id', async (req, res) => {
  try {
    const account = await prisma.chartOfAccounts.findUnique({
      where: { id: req.params.id },
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: { orderBy: { code: 'asc' } }
      }
    });
    if (!account) return res.status(404).json({ message: 'Not found' });
    res.json(account);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/coa', async (req, res) => {
  try {
    const account = await prisma.chartOfAccounts.create({
      data: req.body
    });
    res.status(201).json(account);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/coa/:id', async (req, res) => {
  try {
    const account = await prisma.chartOfAccounts.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(account);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/coa/:id', async (req, res) => {
  try {
    // Check if has children
    const childCount = await prisma.chartOfAccounts.count({
      where: { parentId: req.params.id }
    });
    if (childCount > 0) {
      return res.status(400).json({ message: 'Cannot delete account with children' });
    }
    await prisma.chartOfAccounts.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- BANK ACCOUNTS ---
app.get('/api/bank-accounts', async (req, res) => {
  try {
    const banks = await prisma.bankAccount.findMany({
      include: { coa: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(banks);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/bank-accounts', async (req, res) => {
  try {
    const bank = await prisma.bankAccount.create({
      data: req.body,
      include: { coa: true }
    });
    res.status(201).json(bank);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/bank-accounts/:id', async (req, res) => {
  try {
    const bank = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: req.body,
      include: { coa: true }
    });
    res.json(bank);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/bank-accounts/:id', async (req, res) => {
  try {
    await prisma.bankAccount.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- SYSTEM ACCOUNT MAPPINGS ---

app.get('/api/system-accounts', async (req, res) => {
  try {
    const accounts = await prisma.systemAccount.findMany({
      include: {
        coa: { select: { id: true, code: true, name: true } }
      },
      orderBy: { key: 'asc' }
    });
    res.json(accounts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/system-accounts/:id', async (req, res) => {
  try {
    const { coaId, description } = req.body;
    const account = await prisma.systemAccount.update({
      where: { id: req.params.id },
      data: { coaId, description }
    });
    res.json(account);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/system-accounts', async (req, res) => {
  try {
    const account = await prisma.systemAccount.create({
      data: req.body
    });
    res.status(201).json(account);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/system-accounts/:id', async (req, res) => {
  try {
    await prisma.systemAccount.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- FINANCIAL REPORTS ---

// 1. Ledger (Buku Besar)
app.get('/api/reports/ledger', async (req, res) => {
  try {
    const { coaId, startDate, endDate } = req.query;
    const where = {};
    if (coaId) where.coaId = coaId;
    if (startDate || endDate) {
      where.journalEntry = {
        date: {
          ...(startDate && { gte: new Date(startDate + 'T00:00:00') }),
          ...(endDate && { lte: new Date(endDate + 'T23:59:59.999') })
        }
      };
    }

    const items = await prisma.journalItem.findMany({
      where,
      include: {
        journalEntry: true,
        coa: { select: { code: true, name: true, normalBalance: true, type: true } }
      },
      orderBy: [
        { journalEntry: { date: 'asc' } },
        { journalEntry: { number: 'asc' } },
        { coa: { code: 'asc' } },
        { debit: 'desc' }
      ]
    });

    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 2. Trial Balance (Neraca Saldo)
app.get('/api/reports/trial-balance', async (req, res) => {
  try {
    const { date } = req.query;
    const endDate = date ? new Date(date + 'T23:59:59.999') : new Date();

    const coas = await prisma.chartOfAccounts.findMany({
      where: { postingType: 'POSTING' },
      include: {
        _count: { select: { children: true } }
      }
    });

    const items = await prisma.journalItem.groupBy({
      by: ['coaId'],
      where: {
        journalEntry: { date: { lte: endDate } }
      },
      _sum: { debit: true, credit: true }
    });

    const report = coas.map(coa => {
      const movement = items.find(i => i.coaId === coa.id) || { _sum: { debit: 0, credit: 0 } };
      const debit = movement._sum.debit || 0;
      const credit = movement._sum.credit || 0;
      
      let balance = 0;
      if (coa.normalBalance === 'DEBIT') {
        balance = debit - credit;
      } else {
        balance = credit - debit;
      }

      return {
        id: coa.id,
        code: coa.code,
        name: coa.name,
        type: coa.type,
        normalBalance: coa.normalBalance,
        debit,
        credit,
        balance
      };
    });

    res.json(report);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 3. Balance Sheet (Neraca)
app.get('/api/reports/balance-sheet', async (req, res) => {
  try {
    const { date } = req.query;
    const endDate = date ? new Date(date + 'T23:59:59.999') : new Date();

    const assets = await getAccountTypeBalance(['ASET'], endDate);
    const liabilities = await getAccountTypeBalance(['LIABILITAS'], endDate);
    const equity = await getAccountTypeBalance(['EKUITAS'], endDate);

    // Calculate Net Profit (Laba Tahun Berjalan) for the period until endDate
    // Note: This usually covers from start of year until endDate
    const startOfYear = new Date(new Date(endDate).getFullYear(), 0, 1);
    const revenues = await getAccountTypeBalance(['PENDAPATAN', 'PENDAPATAN_LAIN'], endDate, startOfYear);
    const cogs = await getAccountTypeBalance(['HPP'], endDate, startOfYear);
    const expenses = await getAccountTypeBalance(['BEBAN', 'BEBAN_LAIN'], endDate, startOfYear);

    const totalRevenue = revenues.reduce((sum, r) => sum + r.balance, 0);
    const totalCOGS = cogs.reduce((sum, c) => sum + c.balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    if (netProfit !== 0) {
      equity.push({
        id: 'NET_PROFIT',
        code: '3-99999',
        name: 'Laba Tahun Berjalan',
        balance: netProfit
      });
    }

    res.json({ assets, liabilities, equity });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 4. Profit & Loss (Laba Rugi)
app.get('/api/reports/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate + 'T23:59:59.999') : new Date();

    const operatingRevenue = await getAccountTypeBalance(['PENDAPATAN'], end, start);
    const cogs = await getAccountTypeBalance(['HPP'], end, start);
    const operatingExpenses = await getAccountTypeBalance(['BEBAN'], end, start);
    const otherIncome = await getAccountTypeBalance(['PENDAPATAN_LAIN'], end, start);
    const otherExpenses = await getAccountTypeBalance(['BEBAN_LAIN'], end, start);

    const totalOperatingRevenue = operatingRevenue.reduce((sum, r) => sum + r.balance, 0);
    const totalCOGS = cogs.reduce((sum, c) => sum + c.balance, 0);
    const grossProfit = totalOperatingRevenue - totalCOGS;

    const totalOperatingExpenses = operatingExpenses.reduce((sum, e) => sum + e.balance, 0);
    const operatingIncome = grossProfit - totalOperatingExpenses;

    const totalOtherIncome = otherIncome.reduce((sum, r) => sum + r.balance, 0);
    const totalOtherExpenses = otherExpenses.reduce((sum, e) => sum + e.balance, 0);
    const netProfit = operatingIncome + totalOtherIncome - totalOtherExpenses;

    res.json({ 
      operatingRevenue, 
      cogs, 
      operatingExpenses,
      otherIncome,
      otherExpenses,
      totalOperatingRevenue,
      totalCOGS,
      grossProfit,
      totalOperatingExpenses,
      operatingIncome,
      totalOtherIncome,
      totalOtherExpenses,
      netProfit
    });
  } catch (e) { 
    console.error('Error in profit-loss report:', e);
    res.status(500).json({ message: e.message }); 
  }
});

// 4.1 Sales by Business Category
app.get('/api/reports/sales-by-category', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate + 'T23:59:59.999') : new Date();

    const invoices = await prisma.invoice.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { not: 'CANCELLED' }
      },
      include: {
        salesOrder: { include: { businessCategory: true } },
        project: { include: { businessCategory: true } }
      }
    });

    const categoryAggregation = {};

    invoices.forEach(inv => {
      let categoryName = 'Uncategorized';
      
      // Try to get category from Sales Order first, then Project
      if (inv.salesOrder?.businessCategory?.name) {
        categoryName = inv.salesOrder.businessCategory.name;
      } else if (inv.project?.businessCategory?.name) {
        categoryName = inv.project.businessCategory.name;
      }

      categoryAggregation[categoryName] = (categoryAggregation[categoryName] || 0) + (inv.grandTotal || 0);
    });

    const result = Object.keys(categoryAggregation).map(category => ({
      category,
      amount: categoryAggregation[category]
    })).sort((a, b) => b.amount - a.amount);

    res.json(result);
  } catch (e) { 
    console.error('Error in sales-by-category report:', e);
    res.status(500).json({ message: e.message }); 
  }
});

// Helper for aggregation
async function getAccountTypeBalance(types, endDate, startDate = null) {
  const coas = await prisma.chartOfAccounts.findMany({
    where: { type: { in: types }, postingType: 'POSTING' }
  });

  const items = await prisma.journalItem.groupBy({
    by: ['coaId'],
    where: {
      journalEntry: {
        date: {
          lte: endDate,
          ...(startDate && { gte: startDate })
        }
      }
    },
    _sum: { debit: true, credit: true }
  });

  return coas.map(coa => {
    const movement = items.find(i => i.coaId === coa.id) || { _sum: { debit: 0, credit: 0 } };
    const debit = movement._sum.debit || 0;
    const credit = movement._sum.credit || 0;
    
    // Default group behavior
    const isDebitType = ['ASET', 'BEBAN', 'BEBAN_LAIN', 'HPP'].includes(coa.type);
    const balance = isDebitType ? (debit - credit) : (credit - debit);

    return { id: coa.id, code: coa.code, name: coa.name, balance };
  }).filter(a => a.balance !== 0);
}

// 5. Cash Flow (Arus Kas)
app.get('/api/reports/cash-flow', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate + 'T23:59:59.999') : new Date();

    const systemCash = await prisma.systemAccount.findMany({ 
      where: { key: { in: ['PETTY_CASH', 'CASH'] } } 
    });

    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: { 
        type: 'ASET',
        OR: [
          { name: { contains: 'Kas', mode: 'insensitive' } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { id: { in: systemCash.map(a => a.coaId) } }
        ]
      }
    });

    const items = await prisma.journalItem.findMany({
      where: {
        coaId: { in: cashAccounts.map(a => a.id) },
        journalEntry: {
          date: { gte: start, lte: end }
        }
      },
      include: { coa: true }
    });

    const report = {
      operating: { total: 0, items: [] },
      investing: { total: 0, items: [] },
      financing: { total: 0, items: [] }
    };

    items.forEach(item => {
      const amount = item.debit - item.credit;
      const type = item.coa.cashflowType.toLowerCase();
      if (report[type]) {
        report[type].total += amount;
        report[type].items.push({
          id: item.id,
          description: item.description,
          amount
        });
      }
    });

    res.json(report);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 6. Cash Flow Forecast (Proyeksi Arus Kas)
app.get('/api/reports/cash-flow-forecast', async (req, res) => {
  try {
    const monthsAhead = 6;
    const today = new Date();
    const endForecast = new Date(today.getFullYear(), today.getMonth() + monthsAhead + 1, 0);

    // ── 1. Identify Cash/Bank Accounts ───────────────────────────────────────
    const systemCash = await prisma.systemAccount.findMany({
      where: { key: { in: ['PETTY_CASH', 'CASH'] } }
    });
    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        type: 'ASET',
        OR: [
          { name: { contains: 'Kas', mode: 'insensitive' } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { id: { in: systemCash.map(a => a.coaId) } }
        ],
        postingType: 'POSTING'
      }
    });
    const cashAccountIds = cashAccounts.map(a => a.id);

    // ── 2. Opening Balance (all journal items before current month) ───────────
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const balancesAtStart = await prisma.journalItem.groupBy({
      by: ['coaId'],
      where: {
        coaId: { in: cashAccountIds },
        journalEntry: { date: { lt: startOfCurrentMonth } }
      },
      _sum: { debit: true, credit: true }
    });
    let openingBalance = 0;
    balancesAtStart.forEach(b => {
      openingBalance += (b._sum.debit || 0) - (b._sum.credit || 0);
    });

    // ── 3. Current Balance (all journal items to date) ────────────────────────
    const balancesNow = await prisma.journalItem.groupBy({
      by: ['coaId'],
      where: { coaId: { in: cashAccountIds } },
      _sum: { debit: true, credit: true }
    });
    let currentBalance = 0;
    balancesNow.forEach(b => {
      currentBalance += (b._sum.debit || 0) - (b._sum.credit || 0);
    });

    // ── 4. Outstanding Invoices (Inflow) — exclude PAID & CANCELLED ───────────
    // Include invoices with null dueDate (treated as overdue) + within forecast range
    const outstandingInvoices = await prisma.invoice.findMany({
      where: {
        status: { notIn: ['PAID', 'CANCELLED'] },
        OR: [
          { dueDate: { lte: endForecast } },
          { dueDate: null }  // No due date — treated as overdue/pending
        ]
      },
      select: { grandTotal: true, dueDate: true, number: true, status: true }
    });

    // ── 5. Outstanding Purchase Invoices/Bills (Outflow) ─────────────────────
    const outstandingBills = await prisma.purchaseInvoice.findMany({
      where: {
        status: { notIn: ['PAID', 'CANCELLED'] },
        paymentType: { not: 'CASH' }, // Cash purchases are settled on posting
        OR: [
          { dueDate: { lte: endForecast } },
          { dueDate: null }
        ]
      },
      select: { grandTotal: true, dueDate: true, number: true, status: true }
    });

    // ── 6. Unpaid Operational Expenses (Outflow Projection) ───────────────────
    // These are recurring costs (utilities, rent, etc.) not captured as purchase invoices
    // ExpenseStatus valid values: DRAFT, PENDING, APPROVED, REJECTED, POSTED, PAID
    // NOTE: `date` field = creation timestamp (@default(now())), NOT the planned month.
    //       Use `month` + `year` integer fields for correct scheduling.
    const endForecastYear = endForecast.getFullYear();
    const endForecastMonth = endForecast.getMonth() + 1; // 1-indexed
    const unpaidOpex = await prisma.operationalExpense.findMany({
      where: {
        status: { notIn: ['PAID', 'REJECTED'] },  // REJECTED = void/cancelled, DRAFT = projection
        // Filter to within the 7-month forecast window using month/year integers
        OR: [
          { year: { lt: endForecastYear } },
          { year: endForecastYear, month: { lte: endForecastMonth } }
        ]
      },
      select: { amount: true, month: true, year: true, name: true, category: true, status: true }
    });

    const unpaidPayroll = await prisma.payrollRun.findMany({
      where: {
        status: { notIn: ['PAID'] },
        OR: [
          { year: { lt: endForecastYear } },
          { year: endForecastYear, month: { lte: endForecastMonth } }
        ]
      },
      select: { totalAmount: true, month: true, year: true, type: true, status: true, id: true }
    });

    // ── 7. Build monthly forecast ─────────────────────────────────────────────
    const forecast = [];
    let runningBalance = openingBalance;

    for (let i = 0; i <= monthsAhead; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthLabel = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const isPast = monthEnd < today;
      const isCurrent = i === 0;

      // A. Actuals: Real cash movements (journal entries) for past/current months
      let actualIn = 0;
      let actualOut = 0;
      if (monthStart <= today) {
        const cutoff = monthEnd > today ? today : monthEnd;
        const actualItems = await prisma.journalItem.findMany({
          where: {
            coaId: { in: cashAccountIds },
            journalEntry: { date: { gte: monthStart, lte: cutoff } }
          }
        });
        actualItems.forEach(item => {
          if (item.debit > 0) actualIn += item.debit;
          if (item.credit > 0) actualOut += item.credit;
        });
      }

      // B. Projected Inflows: Outstanding invoices due this month
      let projectedInvoices = outstandingInvoices.filter(inv =>
        inv.dueDate && inv.dueDate >= monthStart && inv.dueDate <= monthEnd
      );

      // C. Projected Outflows: Outstanding bills due this month
      let projectedBills = outstandingBills.filter(bill =>
        bill.dueDate && bill.dueDate >= monthStart && bill.dueDate <= monthEnd
      );

      // D. Projected Outflows: Operational expenses planned for this month
      // Compare using month (1-indexed) and year integers — NOT the `date` creation timestamp
      const currentMonthNum = d.getMonth() + 1; // 1-indexed
      const currentYearNum = d.getFullYear();
      let projectedOpex = unpaidOpex.filter(exp =>
        exp.year === currentYearNum && exp.month === currentMonthNum
      );
      let projectedPayroll = unpaidPayroll.filter(p =>
        p.year === currentYearNum && p.month === currentMonthNum
      );

      // E. Overdue items — push all to first month (month index 0)
      if (isCurrent) {
        const overdueInvoices = outstandingInvoices.filter(inv =>
          !inv.dueDate || inv.dueDate < monthStart
        );
        const overdueBills = outstandingBills.filter(bill =>
          !bill.dueDate || bill.dueDate < monthStart
        );
        // Overdue opex: planned month/year is before current month
        const overdueOpex = unpaidOpex.filter(exp =>
          exp.year < currentYearNum ||
          (exp.year === currentYearNum && exp.month < currentMonthNum)
        );
        const overduePayroll = unpaidPayroll.filter(p =>
          p.year < currentYearNum ||
          (p.year === currentYearNum && p.month < currentMonthNum)
        );

        projectedInvoices = [...projectedInvoices, ...overdueInvoices];
        projectedBills = [...projectedBills, ...overdueBills];
        projectedOpex = [...projectedOpex, ...overdueOpex];
        projectedPayroll = [...projectedPayroll, ...overduePayroll];
      }

      // F. Totals
      const projectedInflowAmt = projectedInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
      const projectedBillAmt = projectedBills.reduce((s, b) => s + b.grandTotal, 0);
      const projectedOpexAmt = projectedOpex.reduce((s, e) => s + e.amount, 0);
      const projectedPayrollAmt = projectedPayroll.reduce((s, p) => s + p.totalAmount, 0);

      const totalInflow = projectedInflowAmt + actualIn;
      const totalOutflow = projectedBillAmt + projectedOpexAmt + projectedPayrollAmt + actualOut;
      const netChange = totalInflow - totalOutflow;

      const currentOpening = runningBalance;
      runningBalance += netChange;

      // G. Month type
      let monthType = 'PROJECTED'; // default future
      if (isPast) monthType = 'ACTUAL';
      else if (isCurrent) monthType = 'CURRENT';

      forecast.push({
        month: monthLabel,
        monthType,          // "ACTUAL" | "CURRENT" | "PROJECTED"
        openingBalance: currentOpening,
        inflow: totalInflow,
        outflow: totalOutflow,
        netChange,
        closingBalance: runningBalance,
        // Breakdown for transparency
        breakdown: {
          actualIn,
          actualOut,
          projectedInflowAmt,
          projectedBillAmt,
          projectedOpexAmt,
          projectedPayrollAmt,
        },
        details: {
          invoices: projectedInvoices.map(inv => ({
            number: inv.number,
            grandTotal: inv.grandTotal,
            dueDate: inv.dueDate,
            status: inv.status,
            isOverdue: inv.dueDate ? inv.dueDate < today : true
          })),
          bills: projectedBills.map(b => ({
            number: b.number,
            grandTotal: b.grandTotal,
            dueDate: b.dueDate,
            status: b.status,
            isOverdue: b.dueDate ? b.dueDate < today : true
          })),
          opex: projectedOpex.map(e => ({
            name: e.name,
            category: e.category,
            amount: e.amount,
            date: `${e.year}-${String(e.month).padStart(2, '0')}`,  // e.g. "2026-08"
            status: e.status
          })),
          payroll: projectedPayroll.map(p => ({
            id: p.id,
            type: p.type,
            amount: p.totalAmount,
            date: `${p.year}-${String(p.month).padStart(2, '0')}`,
            status: p.status
          }))
        }
      });
    }

    res.json({
      today: today.toISOString(),
      openingBalance,
      currentBalance,
      cashAccountsCount: cashAccounts.length,
      forecast
    });
  } catch (e) {
    console.error('[CASH FLOW FORECAST ERROR]', e);
    res.status(500).json({ message: e.message });
  }
});

// ── 7. FINANCIAL RATIO CONFIG & EXECUTIVE SUMMARY ───────────────────────────
let financialRatioConfig = {
  currentRatio: { healthy: 1.5, warning: 1.0 },
  quickRatio: { healthy: 1.0, warning: 0.8 },
  netProfitMargin: { healthy: 10, warning: 5 },
  roa: { healthy: 5, warning: 2 },
  roe: { healthy: 12, warning: 5 },
  debtToEquity: { healthy: 1.5, warning: 2.5 }
};

app.get('/api/reports/financial-ratio-config', (req, res) => {
  res.json(financialRatioConfig);
});

app.put('/api/reports/financial-ratio-config', (req, res) => {
  if (req.body) {
    financialRatioConfig = { ...financialRatioConfig, ...req.body };
  }
  res.json(financialRatioConfig);
});

app.get('/api/reports/executive-summary', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const end = endDate ? new Date(endDate + 'T23:59:59.999') : new Date();
    
    let start = startDate ? new Date(startDate + 'T00:00:00') : new Date(end.getFullYear(), end.getMonth(), 1);
    if (!startDate) {
      if (period === 'quarter') {
        const currentQuarterMonth = Math.floor(end.getMonth() / 3) * 3;
        start = new Date(end.getFullYear(), currentQuarterMonth, 1);
      } else if (period === 'year') {
        start = new Date(end.getFullYear(), 0, 1);
      }
    }

    // Previous period for comparison
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    // ── 1. Unposted Draft Check ───────────────────────────────────────────────
    const unpostedCount = await prisma.journalEntry.count({
      where: {
        status: { in: ['DRAFT', 'PENDING'] },
        date: { gte: start, lte: end }
      }
    });
    const hasUnpostedDrafts = unpostedCount > 0;

    // ── 2. Balance Sheet Metrics (Current & Previous) ─────────────────────────
    const assets = await getAccountTypeBalance(['ASET'], end);
    const liabilities = await getAccountTypeBalance(['LIABILITAS'], end);
    const equity = await getAccountTypeBalance(['EKUITAS'], end);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);

    // Cash & Bank
    const systemCash = await prisma.systemAccount.findMany({ where: { key: { in: ['PETTY_CASH', 'CASH'] } } });
    const cashAccounts = await prisma.chartOfAccounts.findMany({
      where: {
        type: 'ASET',
        OR: [
          { name: { contains: 'Kas', mode: 'insensitive' } },
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { id: { in: systemCash.map(a => a.coaId) } }
        ],
        postingType: 'POSTING'
      }
    });
    const cashAccountIds = cashAccounts.map(a => a.id);

    const cashBalanceItems = await prisma.journalItem.groupBy({
      by: ['coaId'],
      where: {
        coaId: { in: cashAccountIds },
        journalEntry: { date: { lte: end }, status: { notIn: ['DRAFT', 'CANCELLED', 'VOID'] } }
      },
      _sum: { debit: true, credit: true }
    });
    let cashAndEquivalents = 0;
    cashBalanceItems.forEach(b => { cashAndEquivalents += (b._sum.debit || 0) - (b._sum.credit || 0); });

    const arAccounts = assets.filter(a => a.name.toLowerCase().includes('piutang'));
    const totalAR = arAccounts.reduce((s, a) => s + a.balance, 0);

    const inventoryAccounts = assets.filter(a => a.name.toLowerCase().includes('persediaan'));
    const totalInventory = inventoryAccounts.reduce((s, a) => s + a.balance, 0);

    const currentAssets = assets.filter(a => 
      a.name.toLowerCase().includes('kas') || 
      a.name.toLowerCase().includes('bank') || 
      a.name.toLowerCase().includes('piutang') || 
      a.name.toLowerCase().includes('persediaan') || 
      a.code.startsWith('1-1')
    ).reduce((s, a) => s + a.balance, 0) || (cashAndEquivalents + totalAR + totalInventory);

    const nonCurrentAssets = Math.max(0, totalAssets - currentAssets);
    const currentLiabilities = liabilities.filter(l => 
      l.name.toLowerCase().includes('utang') || 
      l.name.toLowerCase().includes('lancar') || 
      l.code.startsWith('2-1')
    ).reduce((s, l) => s + l.balance, 0) || totalLiabilities;

    const nonCurrentLiabilities = Math.max(0, totalLiabilities - currentLiabilities);
    const workingCapital = currentAssets - currentLiabilities;

    // ── 3. Income Statement Metrics ──────────────────────────────────────────
    const startOfYear = new Date(end.getFullYear(), 0, 1);
    const revenues = await getAccountTypeBalance(['PENDAPATAN', 'PENDAPATAN_LAIN'], end, start);
    const cogs = await getAccountTypeBalance(['HPP'], end, start);
    const expenses = await getAccountTypeBalance(['BEBAN', 'BEBAN_LAIN'], end, start);

    const totalRevenue = revenues.reduce((sum, r) => sum + r.balance, 0);
    const totalCOGS = cogs.reduce((sum, c) => sum + c.balance, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);

    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Net Profit YTD for Equity
    const revenuesYTD = await getAccountTypeBalance(['PENDAPATAN', 'PENDAPATAN_LAIN'], end, startOfYear);
    const cogsYTD = await getAccountTypeBalance(['HPP'], end, startOfYear);
    const expensesYTD = await getAccountTypeBalance(['BEBAN', 'BEBAN_LAIN'], end, startOfYear);
    const netProfitYTD = revenuesYTD.reduce((s, r) => s + r.balance, 0) - cogsYTD.reduce((s, c) => s + c.balance, 0) - expensesYTD.reduce((s, e) => s + e.balance, 0);

    const baseEquity = equity.reduce((s, e) => s + e.balance, 0);
    const totalEquity = baseEquity + netProfitYTD;

    // ── 4. Cash Flow Metrics ──────────────────────────────────────────────────
    const operatingCashItems = await prisma.journalItem.findMany({
      where: {
        coaId: { in: cashAccountIds },
        journalEntry: { date: { gte: start, lte: end }, status: { notIn: ['DRAFT', 'CANCELLED', 'VOID'] } }
      }
    });
    let netOperatingCashFlow = 0;
    let operatingInflow = 0;
    let operatingOutflow = 0;
    operatingCashItems.forEach(item => {
      operatingInflow += item.debit || 0;
      operatingOutflow += item.credit || 0;
    });
    netOperatingCashFlow = operatingInflow - operatingOutflow;
    const freeCashFlow = netOperatingCashFlow; // Simplified Capex deduction for now

    // ── 5. Comparison Metrics (Prev Period) ──────────────────────────────────
    const prevRevenues = await getAccountTypeBalance(['PENDAPATAN', 'PENDAPATAN_LAIN'], prevEnd, prevStart);
    const prevCogs = await getAccountTypeBalance(['HPP'], prevEnd, prevStart);
    const prevExpenses = await getAccountTypeBalance(['BEBAN', 'BEBAN_LAIN'], prevEnd, prevStart);
    const prevTotalRevenue = prevRevenues.reduce((sum, r) => sum + r.balance, 0);
    const prevNetProfit = prevTotalRevenue - prevCogs.reduce((sum, c) => sum + c.balance, 0) - prevExpenses.reduce((sum, e) => sum + e.balance, 0);

    const prevAssets = await getAccountTypeBalance(['ASET'], prevEnd);
    const prevTotalAssets = prevAssets.reduce((s, a) => s + a.balance, 0);

    const prevLiabilities = await getAccountTypeBalance(['LIABILITAS'], prevEnd);
    const prevTotalLiabilities = prevLiabilities.reduce((s, l) => s + l.balance, 0);

    const growthRevenue = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
    const growthNetProfit = prevNetProfit !== 0 ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100 : 0;
    const growthAssets = prevTotalAssets > 0 ? ((totalAssets - prevTotalAssets) / prevTotalAssets) * 100 : 0;
    const growthLiabilities = prevTotalLiabilities > 0 ? ((totalLiabilities - prevTotalLiabilities) / prevTotalLiabilities) * 100 : 0;

    // ── 6. Ratios ─────────────────────────────────────────────────────────────
    const cfg = financialRatioConfig;
    const hasNoShortTermDebt = currentLiabilities === 0;

    let currentRatioVal = hasNoShortTermDebt ? 999 : (currentAssets / currentLiabilities);
    let quickRatioVal = hasNoShortTermDebt ? 999 : ((currentAssets - totalInventory) / currentLiabilities);
    let currentRatioStatus = hasNoShortTermDebt ? 'HEALTHY' : (currentRatioVal >= cfg.currentRatio.healthy ? 'HEALTHY' : currentRatioVal >= cfg.currentRatio.warning ? 'WARNING' : 'CRITICAL');
    let quickRatioStatus = hasNoShortTermDebt ? 'HEALTHY' : (quickRatioVal >= cfg.quickRatio.healthy ? 'HEALTHY' : quickRatioVal >= cfg.quickRatio.warning ? 'WARNING' : 'CRITICAL');

    const roa = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
    const roe = totalEquity > 0 ? (netProfit / totalEquity) * 100 : 0;
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0;

    let cashConversionVal = netProfit > 0 ? (netOperatingCashFlow / netProfit) : 0;
    let cashConversionStatus = netProfit <= 0 ? 'N/A' : (cashConversionVal >= 0.8 ? 'HEALTHY' : cashConversionVal >= 0.5 ? 'WARNING' : 'CRITICAL');

    const ratios = [
      {
        id: 'currentRatio',
        name: 'Current Ratio',
        category: 'Likuiditas',
        value: hasNoShortTermDebt ? 'N/A (Tanpa Utang)' : Number(currentRatioVal.toFixed(2)),
        formula: 'Aset Lancar / Liabilitas Lancar',
        status: currentRatioStatus,
        description: hasNoShortTermDebt ? 'Sangat Aman - Tidak ada liabilitas lancar' : 'Kemampuan membayar utang jangka pendek'
      },
      {
        id: 'quickRatio',
        name: 'Quick Ratio',
        category: 'Likuiditas',
        value: hasNoShortTermDebt ? 'N/A (Tanpa Utang)' : Number(quickRatioVal.toFixed(2)),
        formula: '(Aset Lancar - Persediaan) / Liabilitas Lancar',
        status: quickRatioStatus,
        description: hasNoShortTermDebt ? 'Sangat Aman - Tidak ada liabilitas lancar' : 'Likuiditas cepat tanpa tergantung persediaan'
      },
      {
        id: 'netProfitMargin',
        name: 'Net Profit Margin',
        category: 'Profitabilitas',
        value: Number(netProfitMargin.toFixed(1)),
        isPercent: true,
        formula: 'Laba Bersih / Total Pendapatan',
        status: netProfitMargin >= cfg.netProfitMargin.healthy ? 'HEALTHY' : netProfitMargin >= cfg.netProfitMargin.warning ? 'WARNING' : 'CRITICAL',
        description: 'Persentase laba bersih dari setiap penjualan'
      },
      {
        id: 'roa',
        name: 'Return on Assets (ROA)',
        category: 'Profitabilitas',
        value: Number(roa.toFixed(1)),
        isPercent: true,
        formula: 'Laba Bersih / Total Aset',
        status: roa >= cfg.roa.healthy ? 'HEALTHY' : roa >= cfg.roa.warning ? 'WARNING' : 'CRITICAL',
        description: 'Efisiensi penggunaan aset menghasilkan laba'
      },
      {
        id: 'roe',
        name: 'Return on Equity (ROE)',
        category: 'Profitabilitas',
        value: Number(roe.toFixed(1)),
        isPercent: true,
        formula: 'Laba Bersih / Total Ekuitas',
        status: roe >= cfg.roe.healthy ? 'HEALTHY' : roe >= cfg.roe.warning ? 'WARNING' : 'CRITICAL',
        description: 'Imbal hasil bagi modal pemilik perusahaan'
      },
      {
        id: 'debtToEquity',
        name: 'Debt to Equity Ratio (DER)',
        category: 'Solvabilitas',
        value: Number(debtToEquity.toFixed(2)),
        formula: 'Total Liabilitas / Total Ekuitas',
        status: debtToEquity <= cfg.debtToEquity.healthy ? 'HEALTHY' : debtToEquity <= cfg.debtToEquity.warning ? 'WARNING' : 'CRITICAL',
        description: 'Tingkat ketergantungan perusahaan pada utang'
      },
      {
        id: 'cashConversion',
        name: 'Cash Conversion Ratio',
        category: 'Efisiensi Kas',
        value: netProfit <= 0 ? 'N/A (Rugi)' : Number(cashConversionVal.toFixed(2)),
        formula: 'Arus Kas Operasi / Laba Bersih',
        status: cashConversionStatus,
        description: netProfit <= 0 ? 'Perusahaan dalam posisi rugi (N/A)' : 'Kualitas laba didukung arus kas riil'
      }
    ];

    // ── 7. Monthly Trend (6 Months) ──────────────────────────────────────────
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const monthName = mStart.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

      const mRev = await getAccountTypeBalance(['PENDAPATAN', 'PENDAPATAN_LAIN'], mEnd, mStart);
      const mCogs = await getAccountTypeBalance(['HPP'], mEnd, mStart);
      const mExp = await getAccountTypeBalance(['BEBAN', 'BEBAN_LAIN'], mEnd, mStart);

      const revVal = mRev.reduce((s, r) => s + r.balance, 0);
      const cogsVal = mCogs.reduce((s, c) => s + c.balance, 0);
      const expVal = mExp.reduce((s, e) => s + e.balance, 0);
      const npVal = revVal - cogsVal - expVal;

      monthlyTrend.push({ month: monthName, revenue: revVal, netProfit: npVal });
    }

    // ── 8. Rule-Based Insights ────────────────────────────────────────────────
    const insights = [];
    if (growthNetProfit > 0) {
      insights.push({ type: 'POSITIVE', title: 'Pertumbuhan Laba Positif', text: `Laba bersih meningkat ${growthNetProfit.toFixed(1)}% dibanding periode sebelumnya.` });
    } else if (growthNetProfit < 0) {
      insights.push({ type: 'NEGATIVE', title: 'Penurunan Laba Bersih', text: `Laba bersih turun ${Math.abs(growthNetProfit).toFixed(1)}% dibanding periode sebelumnya. Evaluasi efisiensi beban operasional.` });
    }

    if (hasNoShortTermDebt) {
      insights.push({ type: 'HEALTHY', title: 'Likuiditas Sangat Safe', text: `Perusahaan tidak memiliki utang jangka pendek (Liabilities = Rp 0). Bebas dari risiko likuiditas jangka pendek.` });
    } else if (currentRatioVal < cfg.currentRatio.warning) {
      insights.push({ type: 'CRITICAL', title: 'Peringatan Likuiditas', text: `Current Ratio ${currentRatioVal.toFixed(2)} berada di bawah batas aman (${cfg.currentRatio.warning}). Potensi risiko pembayaran utang jangka pendek.` });
    } else {
      insights.push({ type: 'HEALTHY', title: 'Likuiditas Sehat', text: `Current Ratio ${currentRatioVal.toFixed(2)} berada dalam kondisi aman untuk pemenuhan kewajiban jangka pendek.` });
    }

    if (netOperatingCashFlow < 0) {
      insights.push({ type: 'WARNING', title: 'Arus Kas Operasi Negatif', text: `Arus kas operasi bernilai negatif (-Rp ${Math.abs(netOperatingCashFlow).toLocaleString('id-ID')}). Tingkatkan efektivitas penagihan piutang.` });
    }

    if (debtToEquity > cfg.debtToEquity.warning) {
      insights.push({ type: 'WARNING', title: 'Rasio Utang Tinggi', text: `Debt to Equity Ratio (DER) mencapai ${debtToEquity.toFixed(2)}, lebih tinggi dari ambang batas aman ${cfg.debtToEquity.warning}.` });
    }

    // Top accounts for Balance sheet
    const topAssets = [...assets].sort((a, b) => b.balance - a.balance).slice(0, 5);
    const topLiabilities = [...liabilities].sort((a, b) => b.balance - a.balance).slice(0, 5);

    res.json({
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      hasUnpostedDrafts,
      unpostedCount,
      highlights: {
        revenue: { value: totalRevenue, growth: growthRevenue },
        netProfit: { value: netProfit, growth: growthNetProfit },
        totalAssets: { value: totalAssets, growth: growthAssets },
        cashAndEquivalents: { value: cashAndEquivalents },
        netOperatingCashFlow: { value: netOperatingCashFlow },
        totalLiabilities: { value: totalLiabilities, growth: growthLiabilities }
      },
      balanceSheetSummary: {
        currentAssets,
        nonCurrentAssets,
        totalAssets,
        currentLiabilities,
        nonCurrentLiabilities,
        totalLiabilities,
        totalEquity,
        workingCapital,
        topAssets,
        topLiabilities
      },
      incomeStatementSummary: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        grossProfitMargin: Number(grossProfitMargin.toFixed(1)),
        netProfitMargin: Number(netProfitMargin.toFixed(1)),
        waterfall: [
          { label: 'Pendapatan', value: totalRevenue, type: 'positive' },
          { label: 'HPP', value: -totalCOGS, type: 'negative' },
          { label: 'Laba Kotor', value: grossProfit, type: 'subtotal' },
          { label: 'Beban Operasional', value: -totalExpenses, type: 'negative' },
          { label: 'Laba Bersih', value: netProfit, type: 'total' }
        ]
      },
      cashFlowSummary: {
        operatingInflow,
        operatingOutflow,
        netOperatingCashFlow,
        freeCashFlow
      },
      monthlyTrend,
      ratios,
      insights
    });
  } catch (e) {
    console.error('[EXECUTIVE SUMMARY REPORT ERROR]', e);
    res.status(500).json({ message: e.message });
  }
});


// --- OPENING BALANCES ---

app.get('/api/opening-balances', async (req, res) => {
  try {
    const coas = await prisma.chartOfAccounts.findMany({
      where: { postingType: 'POSTING' },
      orderBy: { code: 'asc' }
    });

    const openingEntry = await prisma.journalEntry.findFirst({
      where: { type: 'OPENING' },
      include: { items: true }
    });

    const report = coas.map(coa => {
      const item = openingEntry?.items.find(i => i.coaId === coa.id);
      return {
        id: coa.id,
        code: coa.code,
        name: coa.name,
        type: coa.type,
        debit: item?.debit || 0,
        credit: item?.credit || 0
      };
    });

    res.json({
      date: openingEntry?.date || new Date().toISOString().split('T')[0],
      balances: report
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/opening-balances', async (req, res) => {
  try {
    const { date, balances } = req.body; // balances: [{ coaId, debit, credit }]
    
    // 1. Find the Equity Opening Balance account
    const equityOpening = await prisma.systemAccount.findUnique({
      where: { key: 'EQUITY_OPENING_BALANCE' }
    });
    if (!equityOpening) throw new Error('EQUITY_OPENING_BALANCE system account not configured');

    // 2. Filter out zero balances
    const activeBalances = balances.filter(b => b.debit > 0 || b.credit > 0);
    
    // 3. Calculate balancing amount for equity
    const totalDebit = activeBalances.reduce((sum, b) => sum + (b.debit || 0), 0);
    const totalCredit = activeBalances.reduce((sum, b) => sum + (b.credit || 0), 0);
    const diff = totalDebit - totalCredit;

    const journalItems = activeBalances.map(b => ({
      coaId: b.id,
      debit: b.debit || 0,
      credit: b.credit || 0,
      description: 'Saldo Awal'
    }));

    if (Math.abs(diff) > 0.01) {
      journalItems.push({
        coaId: equityOpening.coaId,
        debit: diff < 0 ? Math.abs(diff) : 0,
        credit: diff > 0 ? diff : 0,
        description: 'Penyeimbang Saldo Awal'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Remove existing opening entry if any
      const existing = await tx.journalEntry.findFirst({ where: { type: 'OPENING' } });
      if (existing) {
        await tx.journalEntry.delete({ where: { id: existing.id } });
      }

      return await tx.journalEntry.create({
        data: {
          number: 'JV-OPENING',
          date: new Date(date + 'T00:00:00'),
          description: 'Opening Balance Initialization',
          type: 'OPENING',
          status: 'POSTED',
          items: {
            create: journalItems
          }
        },
        include: { items: true }
      });
    });

    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- PURCHASING / VENDORS ---

app.get('/api/vendors', async (req, res) => {
  try {
    const { businessCategoryId } = req.query;
    const vendors = await prisma.vendor.findMany({
      where: {
        ...(businessCategoryId ? { businessCategories: { some: { id: businessCategoryId } } } : {})
      },
      include: { businessCategories: true },
      orderBy: { name: 'asc' }
    });
    res.json(vendors);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const { id, businessCategory, businessCategoryId: _, businessCategoryIds: bizIdsRaw, ...data } = req.body;
    const count = await prisma.vendor.count();
    const code = data.code || `VND-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    
    let businessCategoryIds = [];
    if (bizIdsRaw) {
      businessCategoryIds = Array.isArray(bizIdsRaw) ? bizIdsRaw : (typeof bizIdsRaw === 'string' ? JSON.parse(bizIdsRaw) : [bizIdsRaw]);
    } else if (data.businessCategoryId) {
      businessCategoryIds = [data.businessCategoryId];
    }

    const createData = { ...data };
    delete createData.businessCategoryId;
    delete createData.businessCategory;

    const vendor = await prisma.vendor.create({
      data: { 
        ...createData, 
        code,
        businessCategories: {
          connect: businessCategoryIds.map(id => ({ id }))
        }
      },
      include: { businessCategories: true }
    });
    res.json(vendor);
  } catch (e) { 
    console.error('SERVER_ERROR [POST /api/vendors]:', e);
    res.status(500).json({ message: e.message }); 
  }
});

app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { id: _, businessCategory, businessCategoryId: __, createdAt, updatedAt, businessCategoryIds: bizIdsRaw, ...data } = req.body;
    
    let businessCategoryIds = null;
    if (bizIdsRaw) {
      businessCategoryIds = Array.isArray(bizIdsRaw) ? bizIdsRaw : (typeof bizIdsRaw === 'string' ? JSON.parse(bizIdsRaw) : [bizIdsRaw]);
    } else if (data.businessCategoryId) {
      businessCategoryIds = [data.businessCategoryId];
    }

    const updateData = { ...data };
    delete updateData.businessCategoryId;
    delete updateData.businessCategory;

    if (businessCategoryIds !== null) {
      updateData.businessCategories = {
        set: businessCategoryIds.map(id => ({ id }))
      };
    }

    const vendor = await prisma.vendor.update({
      where: { id: req.params.id },
      data: updateData,
      include: { businessCategories: true }
    });
    res.json(vendor);
  } catch (e) { 
    console.error(`SERVER_ERROR [PUT /api/vendors/${req.params.id}]:`, e);
    res.status(500).json({ message: e.message }); 
  }
});

app.delete('/api/vendors/:id', async (req, res) => {
  try {
    await prisma.vendor.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/purchase-orders', async (req, res) => {
  try {
    const { businessCategoryId } = req.query;
    const pos = await prisma.purchaseOrder.findMany({
      where: businessCategoryId ? { businessCategoryId } : {},
      include: {
        vendor: true,
        items: true,
        surveyExpenses: true,
        workOrder: true,
        project: true,
        salesOrder: true,
        invoices: true,
        businessCategory: true
      },
      orderBy: { date: 'desc' }
    });

    // Fetch product names for all items
    const skuCodes = pos.flatMap(po => po.items.map(i => i.description));
    const skus = await prisma.productSKU.findMany({
      where: { code: { in: skuCodes } },
      include: { product: true }
    });
    
    const skuMap = skus.reduce((acc, sku) => {
      acc[sku.code] = sku.product?.name || sku.code;
      return acc;
    }, {});

    const mappedPos = pos.map(po => ({
      ...po,
      items: po.items.map(item => ({
        ...item,
        productName: skuMap[item.description] || item.description
      }))
    }));

    res.json(mappedPos);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/purchase-orders/:id', async (req, res) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        items: true,
        surveyExpenses: true,
        workOrder: true,
        project: true,
        salesOrder: true,
        businessCategory: true
      }
    });
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/purchase-orders/:id/receivable-items', async (req, res) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });

    // 1. Get all CONFIRMED Stock In movements for this PO
    const movements = await prisma.stockMovement.findMany({
      where: {
        referenceNumber: po.number,
        type: 'IN',
        status: 'CONFIRMED'
      },
      include: { items: true }
    });

    // 2. Get all existing Bills for this PO (PurchaseInvoice)
    const invoices = await prisma.purchaseInvoice.findMany({
      where: {
        purchaseOrderId: po.id,
        status: { not: 'CANCELLED' }
      },
      include: { items: true }
    });

    // 3. Aggregate Received Qty
    const receivedQtyMap = {}; // description -> qty
    movements.forEach(m => {
      m.items.forEach(it => {
        // Stock In automation logic puts PO item description into notes
        const key = it.notes || ''; 
        receivedQtyMap[key] = (receivedQtyMap[key] || 0) + it.qty;
      });
    });

    // 4. Aggregate Billed Qty
    const billedQtyMap = {};
    invoices.forEach(inv => {
      inv.items.forEach(it => {
        billedQtyMap[it.description] = (billedQtyMap[it.description] || 0) + it.qty;
      });
    });

    // 5. Match with PO items
    const receivableItems = po.items.map(poItem => {
      const qtyReceived = receivedQtyMap[poItem.description] || 0;
      const qtyBilled = billedQtyMap[poItem.description] || 0;
      const remainingQty = Math.max(0, qtyReceived - qtyBilled);

      return {
        ...poItem,
        qtyReceived,
        qtyBilled,
        remainingQty
      };
    }).filter(item => item.remainingQty > 0);

    res.json(receivableItems);
  } catch (e) {
    console.error('Error fetching receivable items:', e);
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/purchase-orders', async (req, res) => {
  try {
    const { items, businessCategory, ...poData } = req.body;
    
    let number = poData.number;
    if (!number) {
      const count = await prisma.purchaseOrder.count();
      number = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    }

    const po = await prisma.purchaseOrder.create({
      data: {
        ...poData,
        date: poData.date ? new Date(poData.date) : new Date(),
        number,
        workOrderId: poData.workOrderId || null,
        projectId: poData.projectId || null,
        salesOrderId: poData.salesOrderId || null,
        items: {
          create: items || []
        }
      },
      include: { vendor: true, items: true, workOrder: true, project: true, salesOrder: true, businessCategory: true }
    });
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/purchase-orders/:id', async (req, res) => {
  try {
    const { items, businessCategory, ...poData } = req.body;
    
    // Simplistic update: delete existing items and recreate
    await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: req.params.id } });
    
    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        ...poData,
        date: poData.date ? new Date(poData.date) : undefined,
        workOrderId: poData.workOrderId || null,
        projectId: poData.projectId || null,
        salesOrderId: poData.salesOrderId || null,
        items: {
          create: items || []
        }
      },
      include: { vendor: true, items: true, workOrder: true, project: true, salesOrder: true, businessCategory: true }
    });
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});


app.post('/api/purchase-orders/:id/expenses', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, description, status = 'PENDING' } = req.body;
    
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      select: { projectId: true, workOrderId: true }
    });

    const expense = await prisma.surveyExpense.create({
      data: {
        purchaseOrderId: id,
        projectId: req.body.projectId || po?.projectId || null,
        workOrderId: req.body.workOrderId || po?.workOrderId || null,
        category,
        amount: Number(amount) || 0,
        description,
        status
      }
    });
    
    res.status(201).json(expense);
  } catch (e) { 
    res.status(400).json({ message: e.message }); 
  }
});

app.patch('/api/purchase-orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, createGRN, warehouseId } = req.body;

    // Fetch existing PO with items
    const existingPO = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingPO) return res.status(404).json({ message: "PO not found" });

    // Check for existing stock movements related to this PO
    const existingMovements = await prisma.stockMovement.findMany({
      where: { 
        referenceNumber: existingPO.number,
        status: { in: ['DRAFT', 'CONFIRMED'] }
      }
    });

    // Restriction: Cannot revert to DRAFT if stock movements exist
    if (status === 'DRAFT' && existingMovements.length > 0) {
      return res.status(400).json({ 
        message: "Tidak bisa mengembalikan ke DRAFT karena data Stock Masuk sudah ada di Inventory. Hapus data Stock Masuk terkait terlebih dahulu." 
      });
    }

    // Automated StockMovement (IN) creation if status is SENT and createGRN is requested
    if (status === 'SENT' && createGRN) {
      if (!warehouseId) return res.status(400).json({ message: "Gudang tujuan harus dipilih" });

      if (existingMovements.length === 0) {
        await prisma.$transaction(async (tx) => {
          // 1. Map PO items to ProductSKUs (by code/description)
          const skuCodes = existingPO.items.map(item => item.description);
          const skus = await tx.productSKU.findMany({
            where: { code: { in: skuCodes } }
          });

          // 2. Create StockMovement (IN)
          const count = await tx.stockMovement.count({ where: { type: 'IN' } });
          const year = new Date().getFullYear();
          const number = `SIN-${year}-${String(count + 1).padStart(4, '0')}`;

          await tx.stockMovement.create({
            data: {
              number,
              type: 'IN',
              status: 'DRAFT', // Changed from CONFIRMED as requested
              date: new Date(),
              warehouseId,
              referenceType: 'PURCHASE_ORDER',
              referenceNumber: existingPO.number,
              notes: `Otomatis dari PO ${existingPO.number}`,
              items: {
                create: existingPO.items.map(item => {
                  const sku = skus.find(s => s.code === item.description);
                  return {
                    skuId: sku ? sku.id : 'unknown', // Fallback if SKU not found
                    qty: item.qty,
                    unitCost: item.unitPrice,
                    notes: item.description
                  };
                }).filter(i => i.skuId !== 'unknown') // Only sync valid skus
              }
            }
          });

          // 3. Update PO Status
          await tx.purchaseOrder.update({
            where: { id },
            data: { status }
          });
        });

        const finalPO = await prisma.purchaseOrder.findUnique({
          where: { id },
          include: { vendor: true }
        });
        return res.json(finalPO);
      }
    }

    // Normal status update
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { vendor: true }
    });
    res.json(po);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/purchase-orders/:id', async (req, res) => {
  try {
    await prisma.purchaseOrder.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- PURCHASE INVOICES (VENDOR BILLS) ---

app.get('/api/purchase-invoices', async (req, res) => {
  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      include: {
        vendor: true,
        purchaseOrder: true,
        items: true
      },
      orderBy: { date: 'desc' }
    });
    res.json(invoices);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/purchase-invoices/:id', async (req, res) => {
  try {
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: true,
        purchaseOrder: { include: { items: true } },
        items: true
      }
    });
    res.json(invoice);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/purchase-invoices', async (req, res) => {
  try {
    const { items, ...invoiceData } = req.body;
    
    let number = invoiceData.number;
    if (!number) {
      const count = await prisma.purchaseInvoice.count();
      number = `PI-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    }

    const invoice = await prisma.purchaseInvoice.create({
      data: {
        ...invoiceData,
        date: invoiceData.date ? new Date(invoiceData.date) : new Date(),
        number,
        items: {
          create: items || []
        }
      },
      include: { vendor: true, items: true }
    });
    res.json(invoice);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/purchase-invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { items, ...invoiceData } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete existing items
      await tx.purchaseInvoiceItem.deleteMany({
        where: { purchaseInvoiceId: id }
      });

      // 2. Update invoice and create new items
      return await tx.purchaseInvoice.update({
        where: { id },
        data: {
          ...invoiceData,
          date: invoiceData.date ? new Date(invoiceData.date) : undefined,
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : undefined,
          items: {
            create: items.map((item, index) => ({
              no: index + 1,
              description: item.description,
              qty: Number(item.qty) || 0,
              unit: item.unit || 'pcs',
              unitPrice: Number(item.unitPrice) || 0,
              discount: Number(item.discount) || 0,
              amount: Number(item.amount) || 0
            }))
          }
        },
        include: { vendor: true, items: true }
      });
    });

    res.json(result);
  } catch (e) {
    console.error('Error updating purchase invoice:', e);
    res.status(500).json({ message: e.message });
  }
});

app.patch('/api/purchase-invoices/:id/post', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      include: { vendor: true }
    });

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'POSTED') throw new Error('Invoice already posted');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Required Accounts
      const apAcc = await tx.systemAccount.findUnique({ where: { key: 'ACCOUNTS_PAYABLE' }, include: { coa: true } });
      const unbilledAcc = await tx.systemAccount.findUnique({ where: { key: 'UNBILLED_RECEIPT' }, include: { coa: true } });
      const staffAdvAcc = await tx.systemAccount.findUnique({ where: { key: 'STAFF_ADVANCE' }, include: { coa: true } });
      const cashAcc = await tx.systemAccount.findUnique({ where: { key: 'CASH' }, include: { coa: true } });

      if (!apAcc || !unbilledAcc) throw new Error('Required System Accounts (ACCOUNTS_PAYABLE or UNBILLED_RECEIPT) not mapped');

      let journalItems = [];

      if (invoice.paymentType === 'CASH') {
        if (!staffAdvAcc) throw new Error('Required System Account (STAFF_ADVANCE) not mapped for CASH bill');
        
        journalItems = [
          {
            coaId: unbilledAcc.coaId,
            debit: invoice.grandTotal,
            credit: 0,
            description: 'Menghapus Akrual Stock IN'
          },
          {
            coaId: apAcc.coaId,
            debit: 0,
            credit: invoice.grandTotal,
            description: 'Mencatat faktur masuk (mampir)'
          },
          {
            coaId: apAcc.coaId,
            debit: invoice.grandTotal,
            credit: 0,
            description: 'Pelunasan otomatis'
          },
          {
            coaId: staffAdvAcc.coaId,
            debit: 0,
            credit: invoice.grandTotal,
            description: 'Menghapus Piutang Uang Muka'
          }
        ];
      } else {
        // Standard Credit Bill
        journalItems = [
          {
            coaId: unbilledAcc.coaId,
            debit: invoice.grandTotal,
            credit: 0,
            description: `Menghapus Akrual Stock IN untuk Bill ${invoice.number}`
          },
          {
            coaId: apAcc.coaId,
            debit: 0,
            credit: invoice.grandTotal,
            description: `Hutang Usaha (Vendor: ${invoice.vendor.name})`
          }
        ];
      }

      // 2. Create Journal Entry
      const je = await tx.journalEntry.create({
        data: {
          number: `JV-PI-${invoice.number}`,
          date: invoice.date,
          description: `Vendor Bill: ${invoice.number} (${invoice.vendor.name}) - ${invoice.paymentType}`,
          reference: invoice.number,
          type: 'PURCHASE_INVOICE',
          status: 'POSTED',
          items: {
            create: journalItems
          }
        }
      });

      // 4. Update Invoice Status
      const updatedInvoice = await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: { status: 'POSTED' },
        include: { vendor: true, items: true }
      });

      return updatedInvoice;
    });

    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.patch('/api/purchase-invoices/:id/pay', async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { bankAccountId } = req.body;
    
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id: invoiceId },
      include: { vendor: true }
    });

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'PAID') throw new Error('Invoice already paid');
    if (invoice.status !== 'POSTED') throw new Error('Invoice must be POSTED before it can be paid');

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Accounts
      const apAcc = await tx.systemAccount.findUnique({ where: { key: 'ACCOUNTS_PAYABLE' }, include: { coa: true } });
      if (!apAcc) throw new Error('System Account ACCOUNTS_PAYABLE not mapped');

      let targetCoaId = null;
      let bankName = 'CASH';
      if (bankAccountId) {
        const bank = await tx.bankAccount.findUnique({
          where: { id: bankAccountId },
          include: { coa: true }
        });
        if (bank?.coaId) {
          targetCoaId = bank.coaId;
          bankName = bank.bankName;
        }
      }

      if (!targetCoaId) {
        const cashAcc = await tx.systemAccount.findUnique({ where: { key: 'CASH' }, include: { coa: true } });
        if (!cashAcc) throw new Error('CASH system account not mapped and no valid bank provided');
        targetCoaId = cashAcc.coaId;
      }

      // 2. Create Journal Entry
      const je = await tx.journalEntry.create({
        data: {
          number: `JV-PI-PAY-${invoice.number}`,
          date: new Date(),
          description: `Pembayaran Vendor Bill: ${invoice.number} (${invoice.vendor.name}) via ${bankName}`,
          reference: invoice.number,
          type: 'PAYMENT_OUT',
          status: 'POSTED',
          items: {
            create: [
              {
                coaId: apAcc.coaId,
                debit: invoice.grandTotal,
                credit: 0,
                description: `Pelunasan Hutang Usaha (Vendor: ${invoice.vendor.name})`
              },
              {
                coaId: targetCoaId,
                debit: 0,
                credit: invoice.grandTotal,
                description: `Pengeluaran Kas/Bank untuk Bill ${invoice.number}`
              }
            ]
          }
        }
      });

      // 3. Update Invoice Status
      const updatedInvoice = await tx.purchaseInvoice.update({
        where: { id: invoiceId },
        data: { status: 'PAID' },
        include: { vendor: true, items: true }
      });

      return updatedInvoice;
    });

    res.json(result);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- CONTRACTS ---

app.get('/api/contracts', async (req, res) => {
  try {
    const contracts = await prisma.contract.findMany({
      include: {
        customer: true,
        vendor: true,
        user: true,
        project: true,
        invoices: { where: { status: { in: ['POSTED', 'SENT', 'PAID', 'OVERDUE'] } } },
        purchaseInvoices: { where: { status: { in: ['POSTED', 'PAID'] } } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(contracts);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/contracts/:id', async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        vendor: true,
        user: true,
        project: true,
        invoices: { where: { status: { in: ['POSTED', 'SENT', 'PAID', 'OVERDUE'] } } },
        purchaseInvoices: { where: { status: { in: ['POSTED', 'PAID'] } } }
      }
    });
    res.json(contract);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/contracts', async (req, res) => {
  try {
    const { 
      id: _id, createdAt, updatedAt, 
      customer, vendor, project, user,
      invoices, purchaseInvoices,
      ...data 
    } = req.body;

    let number = data.number;
    if (!number) {
      const count = await prisma.contract.count();
      number = `CTR-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    }

    const contract = await prisma.contract.create({
      data: {
        ...data,
        number,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        date: data.date ? new Date(data.date) : new Date(),
        amount: Number(data.amount) || 0,
        billingDay: data.billingDay ? Number(data.billingDay) : undefined,
        dueDay: data.dueDay ? Number(data.dueDay) : undefined
      },
      include: { customer: true, vendor: true, project: true }
    });
    res.json(contract);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/contracts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        number: body.number,
        subject: body.subject,
        type: body.type,
        status: body.status,
        date: body.date ? new Date(body.date) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        currency: body.currency,
        billingCycle: body.billingCycle,
        billingDay: body.billingDay !== undefined ? Number(body.billingDay) : undefined,
        dueDay: body.dueDay !== undefined ? Number(body.dueDay) : undefined,
        autoBilling: body.autoBilling,
        description: body.description,
        notes: body.notes,
        terms: body.terms,
        firstPartyName: body.firstPartyName,
        firstPartyTitle: body.firstPartyTitle,
        firstPartyAddress: body.firstPartyAddress,
        secondPartyName: body.secondPartyName,
        secondPartyTitle: body.secondPartyTitle,
        secondPartyAddress: body.secondPartyAddress,
        customerId: body.customerId,
        vendorId: body.vendorId,
        projectId: body.projectId,
        userId: body.userId,
        clauses: body.clauses,
      },
      include: { customer: true, vendor: true, project: true }
    });
    res.json(contract);
  } catch (e) { 
    console.error('Prisma Error in PUT /api/contracts:', e);
    try {
    fs.writeFileSync('prisma_error.log', JSON.stringify({ message: e.message, stack: e.stack, name: e.name, code: e.code, meta: e.meta }, null, 2));
    } catch (logErr) {}
    res.status(500).json({ message: e.message || 'Internal Server Error' }); 
  }
});

app.post('/api/contracts/:id/generate-bill', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await processContractBilling(id);
    
    if (result.success) {
      res.json(result.result);
    } else {
      res.status(400).json({ message: result.message });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/contracts/:id/generate-projections', async (req, res) => {
  try {
    const { id } = req.params;
    const { months } = req.body;
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { invoices: true, purchaseInvoices: true }
    });

    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    let generated = 0;
    let skipped = 0;
    const today = new Date();
    
    for (let i = 0; i < months; i++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const billingMonthLabel = targetDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      const invDate = new Date(targetYear, targetMonth, contract.billingDay || today.getDate());
      let invDueDate = new Date(targetYear, targetMonth, contract.dueDay || (today.getDate() + 7));
      if (contract.dueDay && contract.billingDay && contract.dueDay <= contract.billingDay) {
        invDueDate.setMonth(invDueDate.getMonth() + 1);
      }

      let exists = false;
      if (contract.vendorId) {
        exists = contract.purchaseInvoices.some(pi => {
          const d = new Date(pi.date);
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });
      } else if (contract.customerId) {
        exists = contract.invoices.some(inv => {
          const d = new Date(inv.date);
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });
      }

      if (exists) {
        skipped++;
        continue;
      }

      if (contract.vendorId) {
        const count = await prisma.purchaseInvoice.count();
        const number = `PI-PROJ-${targetYear}-${String(count + 1).padStart(3, '0')}-${Math.floor(Math.random() * 1000)}`;
        await prisma.purchaseInvoice.create({
          data: {
            number,
            date: invDate,
            dueDate: invDueDate,
            status: 'DRAFT',
            vendorId: contract.vendorId,
            contractId: contract.id,
            grandTotal: contract.amount,
            subtotal: contract.amount,
            notes: `Projection from Contract ${contract.number} for ${billingMonthLabel}`,
            items: {
              create: [{ no: 1, description: `${contract.subject} - ${billingMonthLabel}`, qty: 1, unit: 'month', unitPrice: contract.amount, amount: contract.amount }]
            }
          }
        });
      } else if (contract.customerId) {
        const count = await prisma.invoice.count();
        const number = `INV-PROJ-${targetYear}-${String(count + 1).padStart(3, '0')}-${Math.floor(Math.random() * 1000)}`;
        await prisma.invoice.create({
          data: {
            number,
            date: invDate,
            dueDate: invDueDate,
            status: 'DRAFT',
            customerId: contract.customerId,
            projectId: contract.projectId,
            contractId: contract.id,
            grandTotal: contract.amount,
            subtotal: contract.amount,
            notes: `Projection from Contract ${contract.number} for ${billingMonthLabel}`,
            items: {
              create: [{ no: 1, description: `${contract.subject} - ${billingMonthLabel}`, qty: 1, unit: 'month', unitPrice: contract.amount, amount: contract.amount }]
            }
          }
        });
      }
      generated++;
    }

    await prisma.contract.update({
      where: { id },
      data: { autoBilling: false }
    });

    res.json({ success: true, generated, skipped });
  } catch (e) {
    console.error('Projection Error:', e);
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/contracts/:id', async (req, res) => {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- BUSINESS CATEGORIES ---

app.get('/api/business-categories', async (req, res) => {
  try {
    const categories = await prisma.businessCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            products: true,
            customers: true,
            vendors: true,
            employees: true,
            assets: true,
            projects: true,
            workOrders: true,
          }
        }
      }
    });
    res.json(categories);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/business-categories', async (req, res) => {
  try {
    const category = await prisma.businessCategory.create({ data: req.body });
    res.json(category);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/business-categories/:id', async (req, res) => {
  try {
    const category = await prisma.businessCategory.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(category);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/business-categories/:id', async (req, res) => {
  try {
    await prisma.businessCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- HR & EMPLOYEE ROUTES ---

app.get('/api/hr/unlinked-users', async (req, res) => {
  try {
    const { currentUserId } = req.query;
    console.log(`[GET /api/hr/unlinked-users] Hit with currentUserId: "${currentUserId}"`);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { employee: null },
          (currentUserId && currentUserId !== 'undefined' && currentUserId !== '' ? { id: currentUserId } : { id: 'none' })
        ]
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    });
    
    console.log(`[GET /api/hr/unlinked-users] Sending ${users.length} users`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(users);
  } catch (e) { 
    console.error('[GET /api/hr/unlinked-users] API ERROR:', e);
    return res.status(500).json({ message: e.message }); 
  }
});

// --- HR / EMPLOYEE CATEGORIES ---

app.get('/api/hr/employee-categories', async (req, res) => {
  try {
    const categories = await prisma.employeeCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/employee-categories', async (req, res) => {
  try {
    const category = await prisma.employeeCategory.create({ data: req.body });
    res.json(category);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/hr/employee-categories/:id', async (req, res) => {
  try {
    const category = await prisma.employeeCategory.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(category);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/hr/employee-categories/:id', async (req, res) => {
  try {
    await prisma.employeeCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});


app.get('/api/hr/employees', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || req.headers['X-User-Role'];
    const userId = req.headers['x-user-id'] || req.headers['X-User-Id'];
    const { businessCategoryId } = req.query;

    console.log(`[GET /api/hr/employees] Role: ${userRole}, UserId: ${userId}`);

    // STRICTOR FILTERING
    let whereClause = {
        ...(businessCategoryId ? { businessCategoryId } : {})
    };

    if (userRole === 'OPERATIONAL') {
        if (!userId || userId === 'undefined' || userId === '') {
            console.warn(`[GET /api/hr/employees] BLOCKED: Operational user with no ID`);
            return res.json([]); 
        }
        whereClause.userId = userId;
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: { vendor: true, category: true, businessCategory: true, attendanceLocation: true },
      orderBy: { name: 'asc' }
    });
    
    console.log(`[GET /api/hr/employees] Returning ${employees.length} records`);
    res.json(employees);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/hr/employees/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, category: true, businessCategory: true, attendanceLocation: true }
    });
    res.json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/employees', async (req, res) => {
  try {
    const { createVendor, id: _id, createdAt, updatedAt, vendor, category, businessCategory, attendanceLocation, payrollItems, ...data } = req.body;
    
    let vendorId = data.vendorId;
    if (!vendorId && createVendor) {
      const count = await prisma.vendor.count();
      const code = `EMP-${String(count + 1).padStart(4, '0')}`;
      const vendor = await prisma.vendor.create({
        data: {
          code,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          company: 'Personal Staff'
        }
      });
      vendorId = vendor.id;
    }

    const employee = await prisma.employee.create({
      data: {
        ...data,
        nik: data.nik || null,
        name: data.name,
        type: data.type || 'TETAP',
        status: data.status || 'ACTIVE',
        position: data.position || null,
        department: data.department || null,
        joinDate: data.joinDate ? new Date(data.joinDate) : null,
        baseSalary: Number(data.baseSalary) || 0,
        dailyWage: Number(data.dailyWage) || 0,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        phone: data.phone || null,
        address: data.address || null,
        email: data.email || null,
        vendorId: vendorId || null,
        categoryId: data.categoryId || null,
        businessCategoryId: data.businessCategoryId || null,
        attendanceLocationId: data.attendanceLocationId || null,
        userId: data.userId || null
      },
      include: { vendor: true, category: true, businessCategory: true, attendanceLocation: true, user: true }
    });
    res.json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/hr/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id: _id, createdAt, updatedAt, vendor, category, businessCategory, attendanceLocation, payrollItems, ...data } = req.body;
    
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...data,
        joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
        baseSalary: data.baseSalary !== undefined ? Number(data.baseSalary) : undefined,
        dailyWage: data.dailyWage !== undefined ? Number(data.dailyWage) : undefined,
        businessCategoryId: data.businessCategoryId || null,
        attendanceLocationId: data.attendanceLocationId !== undefined ? data.attendanceLocationId : undefined,
        userId: data.userId !== undefined ? (data.userId || null) : undefined
      },
      include: { vendor: true, category: true, businessCategory: true, attendanceLocation: true, user: true }
    });
    res.json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/hr/employees/:id', async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- ATTENDANCE LOCATIONS ---

app.get('/api/hr/attendance-locations', async (req, res) => {
  try {
    const locations = await prisma.attendanceLocation.findMany({ orderBy: { name: 'asc' } });
    res.json(locations);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/attendance-locations', async (req, res) => {
  try {
    const { name, address, latitude, longitude, radius, isActive } = req.body;
    const loc = await prisma.attendanceLocation.create({ 
      data: {
        name,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius: Number(radius),
        isActive: Boolean(isActive)
      } 
    });
    res.json(loc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/hr/attendance-locations/:id', async (req, res) => {
  try {
    const { name, address, latitude, longitude, radius, isActive } = req.body;
    const loc = await prisma.attendanceLocation.update({
      where: { id: req.params.id },
      data: {
        name,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius: Number(radius),
        isActive: Boolean(isActive)
      }
    });
    res.json(loc);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/hr/attendance-locations/:id', async (req, res) => {
  try {
    await prisma.attendanceLocation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- EMPLOYEE SCHEDULES ---

app.get('/api/hr/employee-schedules', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || req.headers['X-User-Role'];
    const userId = req.headers['x-user-id'] || req.headers['X-User-Id'];
    const { employeeId, startDate, endDate } = req.query;

    console.log(`[GET /api/hr/employee-schedules] Role: ${userRole}, UserId: ${userId}`);

    let targetEmployeeId = employeeId;
    if (userRole === 'OPERATIONAL') {
        if (!userId || userId === 'undefined' || userId === '') {
            console.warn(`[GET /api/hr/employee-schedules] BLOCKED: Operational user with no ID`);
            return res.json([]); 
        }
        const emp = await prisma.employee.findUnique({ where: { userId } });
        console.log(`[GET /api/hr/employee-schedules] Found linked employee: ${emp?.name || 'NONE'}`);
        if (emp) targetEmployeeId = emp.id;
        else return res.json([]); 
    }

    const items = await prisma.employeeSchedule.findMany({
      where: {
        ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
        ...(startDate && endDate ? {
          date: { gte: new Date(startDate), lte: new Date(endDate) }
        } : {})
      },
      include: { employee: true },
      orderBy: { date: 'asc' }
    });
    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/employee-schedules', async (req, res) => {
  try {
    const { date, ...data } = req.body;
    const item = await prisma.employeeSchedule.create({
      data: { ...data, date: new Date(date) }
    });
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/employee-schedules/bulk', async (req, res) => {
  try {
    const { employeeIds, startDate, endDate, startTime, endTime, excludeWeekends, excludeHolidays, notes } = req.body;
    console.log(`--- Memulai Bulk Schedule untuk ${employeeIds?.length} karyawan ---`);
    console.log(`Rentang: ${startDate} s/d ${endDate}`);
    
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: 'Pilih karyawan terlebih dahulu' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Antispit for invalid date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Format tanggal tidak valid' });
    }

    // Get all holidays in range
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } }
    });
    const holidayDates = holidays.map(h => h.date.toISOString().split('T')[0]);
    console.log(`Ditemukan ${holidayDates.length} hari libur nasional dalam rentang waktu ini.`);

    let totalCreated = 0;
    let totalUpdated = 0;
    const current = new Date(start);
    
    // Set hours to 0 to avoid timezone issues during comparison
    current.setHours(0, 0, 0, 0);
    const stopAt = new Date(end);
    stopAt.setHours(0, 0, 0, 0);

    while (current <= stopAt) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.includes(dateStr);
      
      const shouldSkip = (excludeWeekends && isWeekend) || (excludeHolidays && isHoliday);
      
      if (!shouldSkip) {
        for (const empId of employeeIds) {
          // Check if already exists
          const existing = await prisma.employeeSchedule.findFirst({
            where: {
              employeeId: empId,
              date: new Date(dateStr)
            }
          });

          if (existing) {
            await prisma.employeeSchedule.update({
              where: { id: existing.id },
              data: { startTime, endTime, notes, updatedAt: new Date() }
            });
            totalUpdated++;
          } else {
            await prisma.employeeSchedule.create({
              data: { 
                employeeId: empId, 
                date: new Date(dateStr), 
                startTime, 
                endTime, 
                notes,
                type: 'REGULAR'
              }
            });
            totalCreated++;
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }
    
    console.log(`Bulk Schedule Selesai: ${totalCreated} dibuat, ${totalUpdated} diperbarui.`);
    res.json({ success: true, count: totalCreated + totalUpdated, created: totalCreated, updated: totalUpdated });
  } catch (e) {
    console.error('ERROR BULK SCHEDULE:', e);
    res.status(500).json({ message: 'Terjadi kesalahan sistem: ' + e.message });
  }
});

app.delete('/api/hr/employee-schedules/:id', async (req, res) => {
  try {
    await prisma.employeeSchedule.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- ATTENDANCE LOGGING ---

// Helper to check if now is within window of HH:mm string
// Default is 2 hours before and 2 hours after schedule (Total 4 hours window)
const isWithinWindow = (timeStr, windowHours = 2) => {
  if (!timeStr) return false;
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const diffMs = Math.abs(now - target);
  return diffMs <= (windowHours * 60 * 60 * 1000);
};

app.post('/api/hr/attendance/clock-in', upload.single('image'), async (req, res) => {
  try {
    const { employeeId, latitude, longitude, accuracy, timestamp } = req.body;
    const lat = Number(latitude);
    const lon = Number(longitude);
    
    // Smart ID Resolution: Find employee by ID or by UserID
    let employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { attendanceLocation: true }
    });

    if (!employee) {
      employee = await prisma.employee.findUnique({
        where: { userId: employeeId },
        include: { attendanceLocation: true }
      });
    }

    if (!employee) {
        return res.status(404).json({ message: "Data Karyawan tidak ditemukan. Pastikan akun login Anda sudah terhubung ke data Karyawan." });
    }

    const actualEmployeeId = employee.id;

    // Find center point for validation
    let nearest = null;
    let minDistance = 999999;

    if (employee?.attendanceLocationId && employee.attendanceLocation) {
      // If employee has assigned master location, use that
      const loc = employee.attendanceLocation;
      minDistance = getDistance(lat, lon, loc.latitude, loc.longitude);
      nearest = loc;
    } else {
      // Fallback: Find nearest location from all active locations
      const locations = await prisma.attendanceLocation.findMany({ where: { isActive: true } });
      locations.forEach(loc => {
        const dist = getDistance(lat, lon, loc.latitude, loc.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = loc;
        }
      });
    }

    // Check Mock detection: if accuracy is exactly 0 or suspicious
    const isMocked = Number(accuracy) === 0;

    let photoUrl = '';
    if (req.file) {
      photoUrl = await processAttendanceImage(req.file);
    }

    // Find schedule for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const schedule = await prisma.employeeSchedule.findFirst({
      where: {
        employeeId: actualEmployeeId,
        date: { gte: startOfDay, lt: endOfDay }
      }
    });

    // Note: Time window restriction removed as per user request

    const status = (nearest && minDistance <= nearest.radius && !isMocked) ? 'VALID' : 'INVALID';

    // Calculate Lateness / Appreciation
    let noteText = isMocked ? 'Suspicious: Spoofed GPS detected' : (status === 'INVALID' ? 'Outside allowed radius' : '');
    if (status === 'VALID' && schedule?.startTime) {
      const [sHour, sMin] = schedule.startTime.split(':').map(Number);
      
      // Get hours and minutes in Asia/Jakarta timezone for accurate lateness check
      const localTimeString = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
      const [h, m] = localTimeString.split(':').map(Number);
      
      const nowTotalMinutes = h * 60 + m;
      const schedTotalMinutes = sHour * 60 + sMin;

      if (nowTotalMinutes > schedTotalMinutes) {
        const diff = nowTotalMinutes - schedTotalMinutes;
        noteText = `Terlambat ${diff} menit. Tetap semangat, usahakan lebih awal besok!`;
      } else {
        noteText = `Tepat Waktu! Luar biasa! Terima kasih atas kedisiplinan Anda. Selamat bekerja!`;
      }
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: actualEmployeeId,
        scheduleId: schedule?.id,
        locationId: nearest?.id,
        type: 'CLOCK_IN',
        latitude: lat,
        longitude: lon,
        accuracy: Number(accuracy),
        photoUrl,
        isMocked,
        distance: minDistance,
        status,
        notes: noteText
      }
    });

    res.json({ success: true, attendance });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/attendance/clock-out', upload.single('image'), async (req, res) => {
  try {
    const { employeeId, latitude, longitude, accuracy } = req.body;
    const lat = Number(latitude);
    const lon = Number(longitude);

    // Smart ID Resolution
    let employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { attendanceLocation: true }
    });

    if (!employee) {
      employee = await prisma.employee.findUnique({
        where: { userId: employeeId },
        include: { attendanceLocation: true }
      });
    }

    if (!employee) {
        return res.status(404).json({ message: "Data Karyawan tidak ditemukan." });
    }

    const actualEmployeeId = employee.id;

    let nearest = null;
    let minDistance = 999999;

    if (employee?.attendanceLocationId && employee.attendanceLocation) {
        const loc = employee.attendanceLocation;
        minDistance = getDistance(lat, lon, loc.latitude, loc.longitude);
        nearest = loc;
    } else {
        const locations = await prisma.attendanceLocation.findMany({ where: { isActive: true } });
        locations.forEach(loc => {
          const dist = getDistance(lat, lon, loc.latitude, loc.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearest = loc;
          }
        });
    }

    const isMocked = Number(accuracy) === 0;

    // Check if Clock-In exists for today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const lastIn = await prisma.attendance.findFirst({
      where: {
        employeeId: actualEmployeeId,
        type: 'CLOCK_IN',
        timestamp: { gte: startOfDay, lt: endOfDay }
      }
    });

    const schedule = await prisma.employeeSchedule.findFirst({
        where: {
          employeeId: actualEmployeeId,
          date: { gte: startOfDay, lt: endOfDay }
        }
    });

    // Note: Time window restriction removed as per user request

    if (!lastIn) {
      return res.status(400).json({ message: "Gagal: Anda belum melakukan Absen Masuk hari ini. Mohon lakukan Absen Masuk terlebih dahulu." });
    }

    let photoUrl = '';
    if (req.file) {
      photoUrl = await processAttendanceImage(req.file);
    }

    const status = (nearest && minDistance <= nearest.radius && !isMocked) ? 'VALID' : 'INVALID';

    // Calculate Early Leave / Friendly Note
    let noteText = isMocked ? 'Suspicious: Spoofed GPS detected' : (status === 'INVALID' ? 'Outside allowed radius' : '');
    if (status === 'VALID' && schedule?.endTime) {
        const [eHour, eMin] = schedule.endTime.split(':').map(Number);
        
        // Get hours and minutes in Asia/Jakarta timezone
        const localTimeString = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
        const [h, m] = localTimeString.split(':').map(Number);
        
        const nowTotalMinutes = h * 60 + m;
        const schedTotalMinutes = eHour * 60 + eMin;

        if (nowTotalMinutes < schedTotalMinutes) {
            const diff = schedTotalMinutes - nowTotalMinutes;
            noteText = `Pulang lebih awal ${diff} menit. Sehat selalu!`;
        } else {
            noteText = `Terima kasih atas kerja kerasnya hari ini. Selamat beristirahat!`;
        }
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: actualEmployeeId,
        scheduleId: schedule?.id,
        type: 'CLOCK_OUT',
        latitude: lat,
        longitude: lon,
        accuracy: Number(accuracy),
        photoUrl,
        isMocked,
        distance: minDistance,
        status,
        notes: noteText,
        locationId: nearest?.id
      }
    });
    res.json({ success: true, attendance });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ============ OPERATIONAL PERFORMANCE STATS ============
app.get('/api/hr/attendance/my-performance', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.headers['X-User-Id'];
    if (!userId) return res.json({ performance: 0, totalWorkDays: 0, presentDays: 0, absentDays: 0, lateness: [] });

    // Resolve employee
    let employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee) {
      employee = await prisma.employee.findUnique({ where: { id: userId } });
    }
    if (!employee) return res.json({ performance: 0, totalWorkDays: 0, presentDays: 0, absentDays: 0, lateness: [] });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // ── 1. Fetch public holidays this month ──
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: now
        }
      }
    });
    const holidayDates = new Set(holidays.map(h => new Date(h.date).toISOString().split('T')[0]));

    // totalWorkDays will be determined based on schedules below

    // ── 3. Get employee schedules this month (for lateness calc) ──
    const schedules = await prisma.employeeSchedule.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: startOfMonth, lte: now }
      }
    });

    // ── 4. Get all valid CLOCK_IN logs this month ──
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const clockIns = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        type: 'CLOCK_IN',
        status: 'VALID',
        timestamp: { gte: startOfMonth, lte: endOfMonth }
      },
      include: { schedule: true },
      orderBy: { timestamp: 'asc' }
    });

    // ── 5. Count unique present days & Calculate Performance ──
    const presentDaySet = new Set();
    let totalLateMinutes = 0;

    clockIns.forEach(ci => {
      const dateKey = new Date(ci.timestamp).toISOString().split('T')[0];
      presentDaySet.add(dateKey);

      // Calculate lateness for this specific clock-in using Asia/Jakarta timezone
      if (ci.schedule?.startTime) {
        const [sH, sM] = ci.schedule.startTime.split(':').map(Number);
        
        const jakartaTime = new Date(ci.timestamp).toLocaleTimeString('en-GB', { 
          timeZone: 'Asia/Jakarta', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const [h, m] = jakartaTime.split(':').map(Number);
        
        const actualMin = h * 60 + m;
        const schedMin = sH * 60 + sM;
        
        if (actualMin > schedMin) {
          totalLateMinutes += (actualMin - schedMin);
        }
      }
    });

    const presentDays = presentDaySet.size;

    // Use schedules as base, but fallback to presentDays if no schedules exist 
    // to avoid penalizing employees without fixed schedules or new hires.
    const totalWorkDays = Math.max(schedules.length, presentDays);
    
    const absentDays = Math.max(totalWorkDays - presentDays, 0);
    
    // Performance Formula: (PresentDays * 100 - TotalLateMinutes) / TotalWorkDays
    // This ensures that lateness directly penalizes the 100% attendance score.
    const performance = totalWorkDays > 0 ? 
      Math.max(0, Math.round(((presentDays * 100) - totalLateMinutes) / totalWorkDays)) : 0;

    // ── 6. Calculate daily lateness for last 7 days ──
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const latenessData = [];
    for (let d = new Date(sevenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const dayName = dayStart.toLocaleDateString('id-ID', { weekday: 'short' });
      const dateStr = dayStart.toISOString().split('T')[0];
      const dayOfWeek = dayStart.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidayDates.has(dateStr);

      // Skip weekends & holidays in the chart
      if (isWeekend || isHoliday) {
        latenessData.push({ day: dayName, date: dateStr, lateMinutes: -2, label: isHoliday ? 'Libur' : 'Off' });
        continue;
      }

      const dayClockIn = clockIns.find(ci => {
        const ts = new Date(ci.timestamp);
        return ts >= dayStart && ts < dayEnd;
      });

      let lateMinutes = 0;
      if (dayClockIn && dayClockIn.schedule?.startTime) {
        const [sH, sM] = dayClockIn.schedule.startTime.split(':').map(Number);
        
        const jakartaTime = new Date(dayClockIn.timestamp).toLocaleTimeString('en-GB', { 
          timeZone: 'Asia/Jakarta', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const [h, m] = jakartaTime.split(':').map(Number);
        
        const actualMin = h * 60 + m;
        const schedMin = sH * 60 + sM;
        
        if (actualMin > schedMin) {
          lateMinutes = actualMin - schedMin;
        }
      } else if (!dayClockIn) {
        const hadSchedule = schedules.find(s => {
          const sd = new Date(s.date);
          return sd >= dayStart && sd < dayEnd;
        });
        if (hadSchedule) lateMinutes = -1; // absent
      }

      latenessData.push({ day: dayName, date: dateStr, lateMinutes });
    }

    res.json({
      performance: Math.min(performance, 100),
      totalWorkDays,
      presentDays,
      absentDays,
      holidayCount: holidayDates.size,
      lateness: latenessData
    });
  } catch (e) {
    console.error('Performance API Error:', e);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/hr/attendance/history', async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || req.headers['X-User-Role'];
    const userId = req.headers['x-user-id'] || req.headers['X-User-Id'];
    const { employeeId, startDate, endDate, search = '', page = 1, limit = 20 } = req.query;

    console.log(`[GET /api/hr/attendance/history] Role: ${userRole}, UserId: ${userId}, Page: ${page}, Search: ${search}`);

    let targetEmployeeId = employeeId;
    if (userRole === 'OPERATIONAL') {
        if (!userId || userId === 'undefined' || userId === '') {
            console.warn(`[GET /api/hr/attendance/history] BLOCKED: Operational user with no ID`);
            return res.json({ data: [], total: 0, page: 1, totalPages: 0, limit: parseInt(limit) }); 
        }
        const emp = await prisma.employee.findUnique({ where: { userId } });
        if (emp) targetEmployeeId = emp.id;
        else return res.json({ data: [], total: 0, page: 1, totalPages: 0, limit: parseInt(limit) });
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const whereClause = {
        ...(targetEmployeeId ? { employeeId: targetEmployeeId } : {}),
        ...(startDate && endDate ? {
          timestamp: { gte: new Date(startDate), lte: new Date(endDate) }
        } : {}),
        ...(search ? {
          employee: { name: { contains: String(search), mode: 'insensitive' } }
        } : {})
    };

    const [history, total] = await Promise.all([
        prisma.attendance.findMany({
            where: whereClause,
            include: { employee: true, location: true, schedule: true },
            orderBy: { timestamp: 'desc' },
            skip,
            take: parsedLimit
        }),
        prisma.attendance.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
        data: history,
        total,
        page: parsedPage,
        totalPages,
        limit: parsedLimit
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/hr/attendance/my-status', async (req, res) => {
    try {
        const { employeeId } = req.query;
        if (!employeeId) return res.status(400).json({ message: 'Missing employeeId' });

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Smart ID Resolution
        let employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: { attendanceLocation: true }
        });

        if (!employee) {
            employee = await prisma.employee.findUnique({
                where: { userId: employeeId },
                include: { attendanceLocation: true }
            });
        }

        if (!employee) {
            return res.json({ logs: [], schedule: null, employee: null });
        }

        const actualEmployeeId = employee.id;

        const logs = await prisma.attendance.findMany({
            where: {
                employeeId: actualEmployeeId,
                timestamp: { gte: startOfDay, lt: endOfDay }
            },
            orderBy: { timestamp: 'asc' }
        });

        const schedule = await prisma.employeeSchedule.findFirst({
            where: {
                employeeId: actualEmployeeId,
                date: { gte: startOfDay, lt: endOfDay }
            }
        });

        res.json({ logs, schedule, employee });
    } catch (e) { 
        console.error("My Status Error:", e);
        res.status(500).json({ message: e.message }); 
    }
});

// --- HR / PAYROLL ---

app.get('/api/hr/payroll/accounts', async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        code: { startsWith: '1-100' }, // Only Kas & Bank accounts
        status: 'ACTIVE'
      },
      orderBy: { code: 'asc' }
    });
    console.log(`[API] Fetched ${accounts.length} bank/cash accounts`);
    res.json(accounts || []);
  } catch (e) { 
    console.error("[API Error] Fetching payroll accounts:", e);
    res.status(500).json({ message: e.message }); 
  }
});

app.get('/api/hr/payroll', async (req, res) => {
  try {
    const runs = await prisma.payrollRun.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(runs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/hr/payroll/:id', async (req, res) => {
  try {
    const run = await prisma.payrollRun.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: { employee: true }
        }
      }
    });
    res.json(run);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/payroll/generate', async (req, res) => {
  try {
    const { month, year, type = 'SALARY' } = req.body;
    
    // Check if exists
    const existing = await prisma.payrollRun.findFirst({
      where: { month: Number(month), year: Number(year), type }
    });
    if (existing) return res.status(400).json({ message: `Payroll ${type} for this period already exists` });

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' }
    });

    let total = 0;
    const items = employees.map(emp => {
      let amount = 0;
      if (type === 'THR') {
        // THR is 1 month salary for eligible employees (PERMANENT/CONTRACT)
        amount = emp.baseSalary || 0;
      } else {
        // Regular Salary
        amount = emp.type === 'HARIAN_LEPAS' ? 0 : (emp.baseSalary || 0);
      }
      
      total += amount;
      return {
        employeeId: emp.id,
        amount,
        type: emp.type === 'HARIAN_LEPAS' ? 'WAGE' : 'SALARY'
      };
    });

    const run = await prisma.payrollRun.create({
      data: {
        month: Number(month),
        year: Number(year),
        type,
        totalAmount: total,
        status: 'DRAFT',
        items: {
          create: items
        }
      },
      include: { items: true }
    });

    res.json(run);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/payroll/:id/post', async (req, res) => {
  try {
    const { id } = req.params;
    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!run) return res.status(404).json({ message: 'Payroll not found' });
    if (run.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT can be posted' });

    // Find accounts
    let expenseAccKey = run.type === 'THR' ? 'OFFICE_THR' : 'OFFICE_SALARY';
    let expenseAcc = await prisma.systemAccount.findUnique({
      where: { key: expenseAccKey },
      include: { coa: true }
    });
    
    if (!expenseAcc) {
      const coa = await prisma.chartOfAccounts.findUnique({ 
        where: { code: '6-10101' } 
      });
      if (coa) expenseAcc = { coa };
    }

    if (!expenseAcc && run.type === 'THR') {
        // Fallback to salary if THR account not found
        expenseAcc = await prisma.systemAccount.findUnique({
            where: { key: 'OFFICE_SALARY' },
            include: { coa: true }
        });
    }

    if (!expenseAcc) return res.status(400).json({ message: 'System account for Expense not found' });

    let payableAcc = await prisma.systemAccount.findUnique({
      where: { key: 'SALARY_PAYABLE' },
      include: { coa: true }
    });

    if (!payableAcc) {
      const coa = await prisma.chartOfAccounts.findFirst({
        where: { code: { startsWith: '2-' }, name: { contains: 'Gaji', mode: 'insensitive' } }
      });
      if (coa) payableAcc = { coa };
    }

    if (!payableAcc) return res.status(400).json({ message: 'Payable account for Salary not found' });

    const lastJournal = await prisma.journalEntry.count();
    const typeLabel = run.type === 'THR' ? 'THR' : 'PYR';
    const journalNumber = `JV-${typeLabel}-${run.year}${String(run.month).padStart(2,'0')}-${String(lastJournal + 1).padStart(3, '0')}`;

    const label = run.type === 'THR' ? 'THR' : 'Gaji';
    const journalDescription = `Pencatatan ${label} Karyawan - Periode ${run.month}/${run.year}`;

    const journal = await prisma.journalEntry.create({
      data: {
        number: journalNumber,
        date: new Date(),
        description: journalDescription,
        type: 'PAYROLL',
        status: 'POSTED',
        items: {
          create: [
            {
              coaId: expenseAcc.coa.id,
              description: `Beban ${label} Karyawan - ${run.month}/${run.year}`,
              debit: run.totalAmount,
              credit: 0
            },
            {
              coaId: payableAcc.coa.id,
              description: `Hutang ${label} Karyawan - ${run.month}/${run.year}`,
              debit: 0,
              credit: run.totalAmount
            }
          ]
        }
      }
    });

    await prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        journalId: journal.id
      }
    });

    res.json({ success: true, journal });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/payroll/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { coaId, date } = req.body;

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!run) return res.status(404).json({ message: 'Payroll not found' });
    if (run.status !== 'POSTED') return res.status(400).json({ message: 'Only POSTED payroll can be paid' });

    // Find accounts
    let payableAcc = await prisma.systemAccount.findUnique({
      where: { key: 'SALARY_PAYABLE' },
      include: { coa: true }
    });

    if (!payableAcc) {
      const coa = await prisma.chartOfAccounts.findFirst({
        where: { code: { startsWith: '2-' }, name: { contains: 'Gaji', mode: 'insensitive' } }
      });
      if (coa) payableAcc = { coa };
    }

    if (!payableAcc) return res.status(400).json({ message: 'Payable account for Salary not found' });

    const creditAcc = await prisma.chartOfAccounts.findUnique({ where: { id: coaId } });
    if (!creditAcc) return res.status(400).json({ message: 'Credit account (Bank/Cash) not found' });

    const lastJournal = await prisma.journalEntry.count();
    const journalNumber = `JV-PYP-${run.year}${String(run.month).padStart(2,'0')}-${String(lastJournal + 1).padStart(3, '0')}`;

    const journal = await prisma.journalEntry.create({
      data: {
        number: journalNumber,
        date: date ? new Date(date) : new Date(),
        description: `Pembayaran Gaji Karyawan - Periode ${run.month}/${run.year}`,
        type: 'PAYMENT',
        status: 'POSTED',
        items: {
          create: [
            {
              coaId: payableAcc.coa.id,
              description: `Pelunasan Hutang Gaji - ${run.month}/${run.year}`,
              debit: run.totalAmount,
              credit: 0
            },
            {
              coaId: creditAcc.id,
              description: `Pembayaran Gaji via ${creditAcc.name}`,
              debit: 0,
              credit: run.totalAmount
            }
          ]
        }
      }
    });

    await prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: date ? new Date(date) : new Date(),
        paymentJournalId: journal.id,
        paymentCoaId: creditAcc.id
      }
    });

    res.json({ success: true, journal });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- OPERATIONAL EXPENSES ---

app.get('/api/finance/operational-expenses', async (req, res) => {
  try {
    const expenses = await prisma.operationalExpense.findMany({
      include: { coa: true, workOrder: true, project: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- NEW: Combined Operational Expenses (includes Salary/Payroll) ---
app.get('/api/finance/all-operational-expenses', async (req, res) => {
  try {
    // Fetch regular operational expenses
    const opexes = await prisma.operationalExpense.findMany({
      include: { coa: true, workOrder: true, project: true },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch payroll runs (salaries) - only POSTED or PAID status
    const payrolls = await prisma.payrollRun.findMany({
      where: {
        status: { in: ['POSTED', 'PAID'] }
      },
      include: {
        items: {
          include: { employee: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform payroll runs to match OperationalExpense structure for dashboard compatibility
    const formattedPayrolls = payrolls.map(pr => ({
      id: pr.id,
      name: `Gaji ${pr.type === 'THR' ? 'THR' : 'Bulanan'} - ${pr.month}/${pr.year}`,
      category: pr.type === 'THR' ? 'THR/Bonus' : 'Gaji Karyawan',
      amount: pr.totalAmount,
      month: pr.month,
      year: pr.year,
      date: pr.date,
      status: pr.status,
      type: 'PAYROLL', // To differentiate from OpEx
      payrollType: pr.type,
      itemCount: pr.items.length,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt
    }));

    // Combine both arrays
    const combined = [...opexes, ...formattedPayrolls].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json(combined);
  } catch (e) { 
    console.error("[API Error] Fetching all operational expenses:", e);
    res.status(500).json({ message: e.message }); 
  }
});

app.post('/api/finance/operational-expenses', upload.single('attachment'), async (req, res) => {
  try {
    let attachmentPath = null;
    if (req.file) {
      attachmentPath = await processOperasionalImage(req.file);
    }

    const startMonth = Number(req.body.month);
    const startYear = Number(req.body.year);
    const repeatMonths = Math.max(1, Math.min(24, Number(req.body.repeatMonths) || 1));
    const isAutoPost = req.body.autoPost === 'true' || req.body.status === 'POSTED';
    const initialStatus = isAutoPost ? 'POSTED' : 'DRAFT';

    const selectedCoa = await prisma.chartOfAccounts.findUnique({ where: { id: req.body.coaId } });
    if (!selectedCoa) {
      return res.status(400).json({ message: 'COA tidak ditemukan' });
    }
    if (selectedCoa.postingType !== 'POSTING') {
      return res.status(400).json({ message: `COA "${selectedCoa.code} ${selectedCoa.name}" adalah akun induk (HEADER), pilih akun transaksi (POSTING).` });
    }

    const createdExpenses = [];

    for (let i = 0; i < repeatMonths; i++) {
      const targetMonth = ((startMonth - 1 + i) % 12) + 1;
      const targetYear = startYear + Math.floor((startMonth - 1 + i) / 12);

      const expense = await prisma.operationalExpense.create({
        data: {
          name: req.body.name,
          category: req.body.category,
          amount: Number(req.body.amount),
          month: targetMonth,
          year: targetYear,
          coaId: req.body.coaId,
          attachment: i === 0 ? attachmentPath : null,
          status: initialStatus,
          workOrderId: req.body.workOrderId || null,
          projectId: req.body.projectId || null
        }
      });
      createdExpenses.push(expense);
    }

    res.json(repeatMonths === 1 ? createdExpenses[0] : createdExpenses);
  } catch (e) { 
    console.error("[API Error] Creating operational expense:", e);
    res.status(500).json({ message: e.message }); 
  }
});

app.delete('/api/finance/operational-expenses/:id', async (req, res) => {
  try {
    await prisma.operationalExpense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/finance/operational-expenses/:id/post', async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await prisma.operationalExpense.findUnique({
      where: { id },
      include: { coa: true }
    });

    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'DRAFT') return res.status(400).json({ message: 'Already posted' });

    // Find accounts payable for utility/operational
    let payableAcc = await prisma.systemAccount.findUnique({
      where: { key: 'ACCOUNTS_PAYABLE' },
      include: { coa: true }
    });

    if (!payableAcc) {
      const coa = await prisma.chartOfAccounts.findFirst({
        where: { code: '2-10101' }
      });
      if (coa) payableAcc = { coa };
    }

    if (!payableAcc) return res.status(400).json({ message: 'Accounts Payable account (2-10101) not found' });

    const lastJournal = await prisma.journalEntry.count();
    const journalNumber = `JV-OPE-${expense.year}${String(expense.month).padStart(2,'0')}-${String(lastJournal + 1).padStart(3, '0')}`;

    const description = `Beban Operasional: ${expense.name} - ${expense.month}/${expense.year}`;

    const journal = await prisma.journalEntry.create({
      data: {
        number: journalNumber,
        date: new Date(),
        description,
        type: 'OPERATIONAL',
        status: 'POSTED',
        items: {
          create: [
            {
              coaId: expense.coaId,
              description,
              debit: expense.amount,
              credit: 0
            },
            {
              coaId: payableAcc.coa.id,
              description: `Hutang Akrual - ${expense.name}`,
              debit: 0,
              credit: expense.amount
            }
          ]
        }
      }
    });

    await prisma.operationalExpense.update({
      where: { id },
      data: {
        status: 'POSTED',
        journalId: journal.id
      }
    });

    res.json({ success: true, journal });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/finance/operational-expenses/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { coaId, date } = req.body;
    const expense = await prisma.operationalExpense.findUnique({
      where: { id }
    });

    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    if (expense.status !== 'POSTED' && expense.status !== 'APPROVED') return res.status(400).json({ message: 'Must be posted or approved first' });

    // Payable account
    let payableAcc = await prisma.systemAccount.findUnique({
      where: { key: 'ACCOUNTS_PAYABLE' },
      include: { coa: true }
    });

    if (!payableAcc) {
      const coa = await prisma.chartOfAccounts.findFirst({
        where: { code: '2-10101' }
      });
      if (coa) payableAcc = { coa };
    }

    const lastJournal = await prisma.journalEntry.count();
    const journalNumber = `JV-OPP-${expense.year}${String(expense.month).padStart(2,'0')}-${String(lastJournal + 1).padStart(3, '0')}`;

    // If expense was never posted (no accrual journal), create accrual first so payable stays balanced
    let accrualJournalId = expense.journalId;
    if (!accrualJournalId) {
      const accNumber = `JV-OPE-${expense.year}${String(expense.month).padStart(2,'0')}-${String(lastJournal + 2).padStart(3, '0')}`;
      const acc = await prisma.journalEntry.create({
        data: {
          number: accNumber,
          date: date ? new Date(date) : new Date(),
          description: `Beban Operasional: ${expense.name} - ${expense.month}/${expense.year}`,
          type: 'OPERATIONAL',
          status: 'POSTED',
          items: {
            create: [
              { coaId: expense.coaId, description: `Beban Operasional: ${expense.name}`, debit: expense.amount, credit: 0 },
              { coaId: payableAcc.coa.id, description: `Hutang Akrual - ${expense.name}`, debit: 0, credit: expense.amount }
            ]
          }
        }
      });
      accrualJournalId = acc.id;
    }

    const journal = await prisma.journalEntry.create({
      data: {
        number: journalNumber,
        date: date ? new Date(date) : new Date(),
        description: `Pelunasan Biaya Operasional: ${expense.name}`,
        type: 'PAYMENT',
        status: 'POSTED',
        items: {
          create: [
            {
              coaId: payableAcc.coa.id,
              description: `Pelunasan Hutang - ${expense.name}`,
              debit: expense.amount,
              credit: 0
            },
            {
              coaId,
              description: `Pembayaran ${expense.name}`,
              debit: 0,
              credit: expense.amount
            }
          ]
        }
      }
    });

    await prisma.operationalExpense.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: date ? new Date(date) : new Date(),
        paymentJournalId: journal.id,
        paymentCoaId: coaId,
        journalId: accrualJournalId
      }
    });

    res.json({ success: true, journal });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- USER MANAGEMENT ---

app.get('/api/users', checkRole(['SUPER_ADMIN', 'ADMIN', 'OPERATIONAL']), async (req, res) => {
  try {
    const userRole = req.headers['x-user-role'];
    const userName = req.headers['x-user-name'];
    const { businessCategoryId } = req.query;

    console.log(`[GET /api/users] UserRole: ${userRole}, UserName: ${userName}, BizID: ${businessCategoryId}`);

    const users = await prisma.user.findMany({
      where: {
        ...(userRole === 'OPERATIONAL' ? { 
          name: { contains: userName, mode: 'insensitive' } 
        } : {}),
        ...(businessCategoryId && businessCategoryId !== 'undefined' ? { businessCategoryId } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        businessCategoryId: true,
        businessCategory: true,
      },
    });

    console.log(`[GET /api/users] Found ${users.length} users`);
    res.json(users);
  } catch (e) { 
    console.error('[GET /api/users] ERROR:', e);
    res.status(500).json({ message: e.message }); 
  }
});

app.post('/api/users', checkRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { name, email, password, role, department, businessCategoryId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        department: department || 'NONE',
        businessCategoryId: businessCategoryId || null
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/users/:id', checkRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { role, department, name, businessCategoryId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role, department, name, businessCategoryId: businessCategoryId || null }
    });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/users/:id', checkRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- COMPANY SETTINGS ---

app.get('/api/settings/company', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'OPERATIONAL', 'USER']), async (req, res) => {
  try {
    let company = await prisma.companyProfile.findUnique({ where: { id: 'main' } });
    if (!company) {
      company = await prisma.companyProfile.create({ data: { id: 'main' } });
    }
    res.json(company);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/settings/company', checkRole(['SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const company = await prisma.companyProfile.upsert({
      where: { id: 'main' },
      update: req.body,
      create: { id: 'main', ...req.body }
    });
    res.json(company);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

// --- HOLIDAY ROUTES ---

app.get('/api/hr/holidays', async (req, res) => {
  try {
    const list = await prisma.holiday.findMany({ orderBy: { date: 'asc' } });
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/holidays', async (req, res) => {
  try {
    const { date, name, description, isNational } = req.body;
    const h = await prisma.holiday.upsert({
      where: { date: new Date(date) },
      update: { name, description, isNational },
      create: { date: new Date(date), name, description, isNational }
    });
    res.json(h);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/hr/holidays/:id', async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/holidays/sync', async (req, res) => {
  const { year } = req.body;
  const targetYear = year || new Date().getFullYear();
  console.log(`--- Memulai Sinkronisasi Hari Libur Nasional Tahun ${targetYear} ---`);
  
  try {
    const axios = require('axios');
    let holidays = [];
    
    // SOURCE 1: Day Off API (Mendukung 2026)
    try {
      console.log('Mencoba mengambil data dari Day Off API...');
      const resp = await axios.get(`https://day-off-api.vercel.app/api?year=${targetYear}`);
      if (Array.isArray(resp.data)) {
        holidays = resp.data.map(item => {
          // Fix date format if it's YYYY-MM-D (e.g. 2026-01-1 -> 2026-01-01)
          let dateStr = item.tanggal;
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const y = parts[0];
            const m = parts[1].padStart(2, '0');
            const d = parts[2].padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          }
          return {
            holiday_date: dateStr,
            holiday_name: item.keterangan,
            is_holiday: true
          };
        });
        console.log(`Ditemukan ${holidays.length} data dari Day Off API.`);
      }
    } catch (err) {
      console.warn('Gagal mengambil data dari Day Off API:', err.message);
    }

    // FALLBACK SOURCE 2: GitHub (Hanya s/d 2024)
    if (holidays.length === 0) {
      try {
        console.log('Mencoba mengambil data dari GitHub...');
        const resp = await axios.get(`https://raw.githubusercontent.com/guangrei/Json-Indonesia-Holidays/master/calendar.json`);
        if (resp.data) {
          holidays = Object.entries(resp.data)
            .map(([date, val]) => ({
              holiday_date: date.length === 8 ? `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}` : date,
              holiday_name: val.holiday_name,
              is_holiday: val.holiday
            }))
            .filter(h => h.holiday_date.startsWith(targetYear.toString()));
          console.log(`Ditemukan ${holidays.length} data dari GitHub.`);
        }
      } catch (err) {
        console.warn('Gagal mengambil data dari GitHub.');
      }
    }

    if (!holidays || holidays.length === 0) {
      throw new Error('Tidak ada data hari libur yang ditemukan dari semua sumber.');
    }

    let syncCount = 0;
    for (const item of holidays) {
      if (item.is_holiday) {
        // Validation for date
        const d = new Date(item.holiday_date);
        if (isNaN(d.getTime())) continue;

        await prisma.holiday.upsert({
          where: { date: d },
          update: { name: item.holiday_name, isNational: true },
          create: { date: d, name: item.holiday_name, isNational: true }
        });
        syncCount++;
      }
    }
    
    console.log(`Sinkronisasi selesai. Berhasil memproses ${syncCount} hari libur.`);
    res.json({ success: true, count: syncCount });
  } catch (e) {
    console.error('CRITICAL ERROR DURING SYNC:', e.message);
    res.status(500).json({ message: 'Gagal melakukan sinkronisasi otomatis. Silakan gunakan fitur Import CSV Manual.' });
  }
});

app.post('/api/hr/holidays/import', async (req, res) => {
  try {
    const { items } = req.body; // Expecting array of { date, name, isNational }
    if (!items || !Array.isArray(items)) return res.status(400).json({ message: 'Invalid data format' });

    let count = 0;
    for (const item of items) {
      await prisma.holiday.upsert({
        where: { date: new Date(item.date) },
        update: { name: item.name, isNational: item.isNational ?? true },
        create: { date: new Date(item.date), name: item.name, isNational: item.isNational ?? true }
      });
      count++;
    }
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ==========================================
// MANUAL JOURNAL ROUTES
// ==========================================

app.get('/api/journals', async (req, res) => {
  try {
    const { startDate, endDate, search, type } = req.query;
    
    let where = {};
    if (type) where.type = type;
    else where.type = 'GENERAL'; // Default to manual journals
    
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    const journals = await prisma.journalEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        items: {
          include: { coa: true }
        }
      }
    });
    res.json(journals);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/journals', async (req, res) => {
  try {
    const { date, description, reference, items, attachmentUrl, createdBy } = req.body;
    
    if (!items || items.length < 2) {
      return res.status(400).json({ message: 'Jurnal minimal harus memiliki 2 baris' });
    }

    let totalDebit = 0;
    let totalCredit = 0;

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const d = Number(item.debit) || 0;
      const c = Number(item.credit) || 0;
      
      if (d === 0 && c === 0) {
        return res.status(400).json({ message: `Baris ke-${i+1} kosong` });
      }
      if (d > 0 && c > 0) {
        return res.status(400).json({ message: `Baris ke-${i+1} tidak boleh terisi debit dan kredit sekaligus` });
      }
      
      const coa = await prisma.chartOfAccounts.findUnique({ where: { id: item.coaId } });
      if (!coa) return res.status(400).json({ message: `COA tidak ditemukan di baris ke-${i+1}` });
      if (coa.postingType !== 'POSTING') {
        return res.status(400).json({ message: `Akun ${coa.code} adalah Header, pilih akun yang bersifat POSTING.` });
      }

      totalDebit += d;
      totalCredit += c;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: 'Total Debit dan Kredit tidak seimbang (Balance)' });
    }

    // Generate Journal Number
    const year = new Date().getFullYear();
    const lastEntry = await prisma.journalEntry.findFirst({
      where: { number: { startsWith: `JU-${year}-` } },
      orderBy: { number: 'desc' }
    });
    
    let seq = 1;
    if (lastEntry) {
      const parts = lastEntry.number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const journalNumber = `JU-${year}-${String(seq).padStart(4, '0')}`;

    const journal = await prisma.journalEntry.create({
      data: {
        number: journalNumber,
        date: date ? new Date(date) : new Date(),
        description,
        reference,
        type: 'GENERAL',
        status: 'POSTED',
        attachmentUrl,
        createdBy,
        items: {
          create: items.map(item => ({
            coaId: item.coaId,
            description: item.description,
            debit: Number(item.debit) || 0,
            credit: Number(item.credit) || 0
          }))
        }
      },
      include: { items: { include: { coa: true } } }
    });

    res.json({ success: true, journal });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.put('/api/journals/:id/void', async (req, res) => {
  try {
    const { id } = req.params;
    const { voidedBy } = req.body;

    const journal = await prisma.journalEntry.findUnique({ where: { id } });
    if (!journal) return res.status(404).json({ message: 'Jurnal tidak ditemukan' });
    if (journal.status === 'VOID') return res.status(400).json({ message: 'Jurnal sudah dibatalkan' });
    if (journal.type !== 'GENERAL') return res.status(400).json({ message: 'Hanya jurnal manual yang bisa dibatalkan dari sini' });

    // Mark as void and zero out the items so it doesn't affect ledger
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark header as void
      const voided = await tx.journalEntry.update({
        where: { id },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidedBy: voidedBy || 'System'
        }
      });
      // 2. Zero out items
      await tx.journalItem.updateMany({
        where: { journalEntryId: id },
        data: { debit: 0, credit: 0, description: 'VOIDED' }
      });
      
      return voided;
    });

    res.json({ success: true, journal: result });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});


// --- USER LOG ROUTES ---
app.get('/api/users/:id/logs', checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.userLoginLog.findMany({
      where: { userId: id },
      orderBy: { timestamp: 'desc' },
      take: 50 // Limit to last 50 logins
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ message: 'Error fetching user logs' });
  }
});

// ============================================================
// --- LOCATION TRACKING ---
// ============================================================

// GET /api/hr/employees/by-user/:userId — Resolve linked employee for a user
app.get('/api/hr/employees/by-user/:userId', async (req, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { userId: req.params.userId },
      select: { id: true, name: true, position: true, department: true }
    });
    if (!employee) return res.status(404).json({ message: 'No employee linked' });
    res.json(employee);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Helper: Check if current time is within an employee's active schedule for today (Asia/Jakarta)
async function isWithinWorkHours(employeeId) {
  const now = new Date();
  
  // Get today's date in Jakarta
  const jakartaDateStr = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Jakarta' }); // DD/MM/YYYY
  const [day, month, year] = jakartaDateStr.split('/').map(Number);
  const startOfDay = new Date(year, month - 1, day);
  const endOfDay = new Date(year, month - 1, day + 1);

  // Get schedule for today
  const schedule = await prisma.employeeSchedule.findFirst({
    where: {
      employeeId,
      date: { gte: startOfDay, lt: endOfDay }
    }
  });

  if (!schedule) return { inWorkHours: false, schedule: null };

  // Get current time in Jakarta
  const jakartaTime = now.toLocaleTimeString('en-GB', { 
    timeZone: 'Asia/Jakarta', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const [h, m] = jakartaTime.split(':').map(Number);
  const nowMin = h * 60 + m;

  // Parse schedule times
  const [sH, sM] = schedule.startTime.split(':').map(Number);
  const [eH, eM] = schedule.endTime.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  const inWorkHours = nowMin >= startMin && nowMin <= endMin;

  return { inWorkHours, schedule };
}

// POST /api/location-tracking — Employee sends GPS (auto or on manual trigger)
app.post('/api/location-tracking', async (req, res) => {
  const { employeeId, latitude, longitude, accuracy, isManual } = req.body;
  
  console.log(`[LocationTracking] POST Request from employeeId: ${employeeId}, isManual: ${isManual}`);

  if (!employeeId || latitude === undefined || longitude === undefined) {
    console.log(`[LocationTracking] Rejected: Missing data`);
    return res.status(400).json({ message: 'employeeId, latitude, longitude required' });
  }

  try {
    // If this is an auto-ping, validate work hours
    if (!isManual) {
      const { inWorkHours, schedule } = await isWithinWorkHours(employeeId);
      console.log(`[LocationTracking] Auto-ping validation for ${employeeId} - inWorkHours: ${inWorkHours}, schedule: ${schedule?.startTime}-${schedule?.endTime}`);
      
      if (!inWorkHours) {
        return res.status(200).json({ blocked: true, reason: 'Outside work hours' });
      }

      // Save ping
      const ping = await prisma.locationPing.create({
        data: {
          employeeId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : null,
          notes: 'Auto - jam kerja',
          isManual: false,
          scheduleId: schedule?.id || null
        }
      });
      console.log(`[LocationTracking] Saved auto ping for ${employeeId}`);
      return res.json({ success: true, ping });
    }

    // Manual ping (triggered by Super Admin request) — check if flag is set
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    console.log(`[LocationTracking] Processing manual ping for ${employee.name}`);

    const ping = await prisma.locationPing.create({
      data: {
        employeeId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        notes: 'Manual request oleh Super Admin',
        isManual: true,
        scheduleId: null
      }
    });

    // Clear the ping request flag
    await prisma.employee.update({
      where: { id: employeeId },
      data: { pingRequested: false, pingRequestedAt: null }
    });

    return res.json({ success: true, ping });
  } catch (e) {
    console.error('[LocationTracking] POST error:', e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/location-tracking/check-request/:employeeId — Employee hook polls for manual ping request
app.get('/api/location-tracking/check-request/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { pingRequested: true, pingRequestedAt: true }
    });
    if (!employee) return res.status(404).json({ message: 'Not found' });
    res.json({ pingRequested: employee.pingRequested, pingRequestedAt: employee.pingRequestedAt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/location-tracking — Super Admin: Get latest ping per active employee today
app.get('/api/location-tracking', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL']), async (req, res) => {
  const { date } = req.query;
  try {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Auto-clear stale ping requests older than 3 minutes (no response from employee)
    const staleThreshold = new Date(Date.now() - 3 * 60 * 1000);
    await prisma.employee.updateMany({
      where: {
        pingRequested: true,
        pingRequestedAt: { lt: staleThreshold }
      },
      data: {
        pingRequested: false,
        pingRequestedAt: null
      }
    });

    // Get all active employees with their schedules and latest ping for the day
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        schedules: {
          where: { date: { gte: startOfDay, lt: endOfDay } },
          take: 1
        },
        locationPings: {
          where: { reportedAt: { gte: startOfDay, lt: endOfDay } },
          orderBy: { reportedAt: 'desc' },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      position: emp.position,
      department: emp.department,
      pingRequested: emp.pingRequested,
      pingRequestedAt: emp.pingRequestedAt,
      schedule: emp.schedules[0] || null,
      latestPing: emp.locationPings[0] || null
    }));

    res.json(result);
  } catch (e) {
    console.error('[LocationTracking] GET error:', e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/location-tracking/history/:employeeId — Super Admin: Timeline of employee's pings
app.get('/api/location-tracking/history/:employeeId', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL']), async (req, res) => {
  const { employeeId } = req.params;
  const { date } = req.query;
  try {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const pings = await prisma.locationPing.findMany({
      where: {
        employeeId,
        reportedAt: { gte: startOfDay, lt: endOfDay }
      },
      orderBy: { reportedAt: 'asc' }
    });

    res.json(pings);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /api/location-tracking/request-ping/:employeeId — Super Admin: Request manual ping from employee
app.patch('/api/location-tracking/request-ping/:employeeId', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATIONAL']), async (req, res) => {
  const { employeeId } = req.params;
  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        pingRequested: true,
        pingRequestedAt: new Date()
      }
    });
    res.json({ success: true, message: 'Ping request sent. Employee location will update shortly.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ============================================================
// --- IT MAINTENANCE CHECKLIST ---
// ============================================================

// Upload single photo for maintenance item
app.post('/api/maintenance/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  try {
    const url = await processMaintenanceImage(req.file);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Submit a full daily maintenance checklist
app.post('/api/maintenance', async (req, res) => {
  const { notes, items } = req.body;
  const userRole = req.headers['x-user-role'];
  const userEmail = req.headers['x-user-email'];

  try {
    const user = await prisma.user.findFirst({
      where: { email: userEmail }
    });

    if (!user) return res.status(401).json({ message: `User not found for email: ${userEmail}` });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let run = await prisma.dailyMaintenanceRun.findFirst({
      where: { userId: user.id, createdAt: { gte: startOfDay } }
    });

    if (!run) {
      run = await prisma.dailyMaintenanceRun.create({
        data: { userId: user.id, notes }
      });
    } else {
      if (notes) {
        await prisma.dailyMaintenanceRun.update({ where: { id: run.id }, data: { notes } });
      }
    }

    for (const item of items) {
      const existing = await prisma.maintenanceItemResponse.findFirst({
        where: { runId: run.id, itemName: item.itemName }
      });

      if (existing) {
        await prisma.maintenanceItemResponse.update({
          where: { id: existing.id },
          data: {
            status: item.status,
            troubleAnalysis: item.troubleAnalysis || null,
            photoUrl: item.photoUrl || existing.photoUrl
          }
        });
      } else {
        await prisma.maintenanceItemResponse.create({
          data: {
            runId: run.id,
            itemCategory: item.itemCategory,
            itemName: item.itemName,
            status: item.status,
            troubleAnalysis: item.troubleAnalysis || null,
            photoUrl: item.photoUrl || null
          }
        });
      }
    }

    const updatedRun = await prisma.dailyMaintenanceRun.findUnique({
      where: { id: run.id },
      include: { items: true }
    });

    res.json(updatedRun);
  } catch (e) {
    console.error('[Maintenance] POST error:', e);
    res.status(500).json({ message: e.message });
  }
});

// Get maintenance history
app.get('/api/maintenance', async (req, res) => {
  try {
    const runs = await prisma.dailyMaintenanceRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true, role: true } },
        items: true
      }
    });
    res.json(runs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// --- MAINTENANCE TEMPLATE MANAGEMENT ---

// Seeder function to be called if templates are empty
async function seedDefaultTemplates() {
  const count = await prisma.maintenanceTemplateCategory.count();
  if (count > 0) return;

  const defaultTemplates = [
    {
      name: 'Server Room',
      order: 1,
      items: ['Suhu & Kelembapan', 'Kebersihan', 'Indikator UPS']
    },
    {
      name: 'Network',
      order: 2,
      items: ['Koneksi Internet Utama', 'Koneksi Internet Backup', 'Switch Core', 'Router']
    },
    {
      name: 'Server & Storage',
      order: 3,
      items: ['Indikator Harddisk Server', 'Server HRD', 'Status Backup Harian', 'NAS', 'Kapasitas Storage']
    },
    {
      name: 'Security & Devices',
      order: 4,
      items: ['CCTV Aktif', 'Mesin Fingerprint Absensi']
    }
  ];

  for (const cat of defaultTemplates) {
    await prisma.maintenanceTemplateCategory.create({
      data: {
        name: cat.name,
        order: cat.order,
        items: {
          create: cat.items.map((itemName, index) => ({
            name: itemName,
            order: index + 1
          }))
        }
      }
    });
  }
}

// Ensure seeded on startup
seedDefaultTemplates().catch(console.error);

// Get active templates (for filling checklist)
app.get('/api/maintenance/templates', async (req, res) => {
  try {
    const categories = await prisma.maintenanceTemplateCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        }
      }
    });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Get ALL templates (for Settings tab - Super Admin only)
app.get('/api/maintenance/templates/all', checkRole(['SUPER_ADMIN']), async (req, res) => {
  try {
    const categories = await prisma.maintenanceTemplateCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        items: {
          orderBy: { order: 'asc' }
        }
      }
    });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create/Update Category
app.post('/api/maintenance/templates/category', checkRole(['SUPER_ADMIN']), async (req, res) => {
  const { id, name, order, isActive } = req.body;
  try {
    if (id) {
      const cat = await prisma.maintenanceTemplateCategory.update({
        where: { id },
        data: { name, order, isActive }
      });
      return res.json(cat);
    }
    const cat = await prisma.maintenanceTemplateCategory.create({
      data: { name, order: order || 99, isActive: true }
    });
    res.json(cat);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create Item
app.post('/api/maintenance/templates/item', checkRole(['SUPER_ADMIN']), async (req, res) => {
  const { categoryId, name, order } = req.body;
  try {
    const item = await prisma.maintenanceTemplateItem.create({
      data: { categoryId, name, order: order || 99, isActive: true }
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Toggle Item Status
app.patch('/api/maintenance/templates/item/:id/toggle', checkRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    const item = await prisma.maintenanceTemplateItem.update({
      where: { id },
      data: { isActive }
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Delete Item
app.delete('/api/maintenance/templates/item/:id', checkRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.maintenanceTemplateItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// Edit Item Name
app.patch('/api/maintenance/templates/item/:id', checkRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const item = await prisma.maintenanceTemplateItem.update({
      where: { id },
      data: { name }
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// Get Today's maintenance run for user
app.get('/api/maintenance/today', async (req, res) => {
  const userEmail = req.headers['x-user-email'];
  console.log('[DEBUG] /api/maintenance/today called with email:', userEmail);
  if (!userEmail) return res.json(null);

  try {
    const user = await prisma.user.findFirst({ where: { email: userEmail } });
    if (!user) {
        console.log('[DEBUG] user not found in DB for email:', userEmail);
        return res.json(null);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    console.log('[DEBUG] startOfDay:', startOfDay);

    const run = await prisma.dailyMaintenanceRun.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay }
      },
      include: { items: true }
    });

    console.log('[DEBUG] found run:', run ? run.id : 'null');
    res.json(run);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


// Log debug
app.use((req, res, next) => {
  if (req.path === '/api/maintenance/today') {
    console.log('[DEBUG] /api/maintenance/today called with email:', req.headers['x-user-email']);
  }
  next();
});

// ─── DEVELOPMENT PLANNING & PROGRESS ────────────────────────────────────────

const PLANNING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF'];
const generatePlanningNumber = async () => {
  const year = new Date().getFullYear();
  const last = await prisma.projectPlanning.findFirst({
    where: { number: { startsWith: `DVL-${year}-` } },
    orderBy: { number: 'desc' }
  });
  const seq = last ? parseInt(last.number.split('-').pop(), 10) + 1 : 1;
  return `DVL-${year}-${String(seq).padStart(4, '0')}`;
};

const PLANNING_INCLUDE = {
  project: true,
  salesOrder: { include: { customer: true } },
  activities: { orderBy: { sortOrder: 'asc' } },
  meetings: {
    include: { files: true },
    orderBy: { date: 'asc' }
  }
};

app.get('/api/development-plannings', checkRole(PLANNING_ROLES), async (req, res) => {
  try {
    const plannings = await prisma.projectPlanning.findMany({
      include: PLANNING_INCLUDE,
      orderBy: { createdAt: 'desc' }
    });
    res.json(plannings);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/development-plannings', checkRole(PLANNING_ROLES), async (req, res) => {
  try {
    const { activities = [], ...data } = req.body;
    let planning;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        planning = await prisma.projectPlanning.create({
          data: {
            ...data,
            number: await generatePlanningNumber(),
            projectId: data.projectId || null,
            salesOrderId: data.salesOrderId || null,
            startDate: data.startDate ? new Date(data.startDate) : null,
            endDate: data.endDate ? new Date(data.endDate) : null,
            activities: {
              create: (activities || []).map((a, idx) => ({
                activity: a.activity,
                fase: a.fase || null,
                modul: a.modul || null,
                pic: a.pic || null,
                startDate: a.startDate ? new Date(a.startDate) : null,
                endDate: a.endDate ? new Date(a.endDate) : null,
                progress: Number(a.progress) || 0,
                status: a.status || 'PLANNED',
                sortOrder: idx
              }))
            }
          },
          include: PLANNING_INCLUDE
        });
        break;
      } catch (e) {
        if (e.code !== 'P2002') throw e;
      }
    }
    if (!planning) return res.status(400).json({ message: 'Gagal generate nomor' });
    res.status(201).json(planning);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/development-plannings/:id', checkRole(PLANNING_ROLES), async (req, res) => {
  try {
    const { activities, ...data } = req.body;
    const { id } = req.params;
    const planning = await prisma.$transaction(async (tx) => {
      const updated = await tx.projectPlanning.update({
        where: { id },
        data: {
          ...data,
          projectId: data.projectId || null,
          salesOrderId: data.salesOrderId || null,
          startDate: data.startDate ? new Date(data.startDate) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined
        }
      });
      if (activities) {
        await tx.planningActivity.deleteMany({ where: { planningId: id } });
        if (activities.length > 0) {
          await tx.planningActivity.createMany({
            data: activities.map((a, idx) => ({
              planningId: id,
              activity: a.activity,
              fase: a.fase || null,
              modul: a.modul || null,
              pic: a.pic || null,
              startDate: a.startDate ? new Date(a.startDate) : null,
              endDate: a.endDate ? new Date(a.endDate) : null,
              progress: Number(a.progress) || 0,
              status: a.status || 'PLANNED',
              sortOrder: idx
            }))
          });
        }
      }
      return tx.projectPlanning.findUnique({ where: { id }, include: PLANNING_INCLUDE });
    });
    res.json(planning);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/development-plannings/:id', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    await prisma.projectPlanning.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/development-plannings/:id/meetings', checkRole(PLANNING_ROLES), async (req, res) => {
  try {
    const meeting = await prisma.projectMeeting.create({
      data: {
        planningId: req.params.id,
        title: req.body.title,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        location: req.body.location || null,
        link: req.body.link || null,
        participants: req.body.participants || null,
        agenda: req.body.agenda || null,
        resume: req.body.resume || null,
        decisions: req.body.decisions || null,
        followUp: req.body.followUp || null,
        pic: req.body.pic || null,
        deadline: req.body.deadline ? new Date(req.body.deadline) : null,
        status: req.body.status || 'SCHEDULED'
      },
      include: { files: true }
    });
    res.status(201).json(meeting);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/development-meetings/:id', checkRole(PLANNING_ROLES), async (req, res) => {
  try {
    const meeting = await prisma.projectMeeting.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
        deadline: req.body.deadline ? new Date(req.body.deadline) : null
      },
      include: { files: true }
    });
    res.json(meeting);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/development-meetings/:id', checkRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const meeting = await prisma.projectMeeting.findUnique({ where: { id: req.params.id } });
    if (!meeting) return res.status(404).json({ message: 'Not found' });
    for (const f of await prisma.meetingFile.findMany({ where: { meetingId: meeting.id } })) {
      try { fs.unlinkSync(path.join(__dirname, f.filePath)); } catch { }
    }
    await prisma.projectMeeting.delete({ where: { id: meeting.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/development-meetings/:id/files', checkRole(PLANNING_ROLES), upload.array('files', 10), async (req, res) => {
  try {
    const saved = [];
    for (const file of req.files || []) {
      const ext = path.extname(file.originalname || '').slice(0, 10) || '.bin';
      const fileName = `mtg-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      const filePath = path.join(meetingUploadDir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      saved.push(await prisma.meetingFile.create({
        data: {
          meetingId: req.params.id,
          fileName: file.originalname || fileName,
          filePath: `/public/meetings/${fileName}`,
          fileSize: file.size,
          mimeType: file.mimetype || null,
          uploadedBy: req.userName || null
        }
      }));
    }
    res.status(201).json(saved);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.delete('/api/development-meetings/files/:fileId', checkRole(PLANNING_ROLES), async (req, res) => {
  try {
    const file = await prisma.meetingFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ message: 'Not found' });
    try { fs.unlinkSync(path.join(__dirname, file.filePath)); } catch { }
    await prisma.meetingFile.delete({ where: { id: file.id } });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

console.log('Development planning routes loaded');

