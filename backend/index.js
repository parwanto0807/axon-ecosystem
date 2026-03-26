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
const prisma = new PrismaClient();
const cron = require('node-cron');
const { postJournalFromSystemKey } = require('./utils/accountingUtils');
const PORT = process.env.PORT || 5003;

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
      amount: Number(it.amount) || 0
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
      amount: Number(it.amount) || 0
    }));
    const { subtotal, discountAmt, taxAmt, grandTotal } = calcTotals(parsedItems, Number(discount), Number(tax));
    const q = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
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
    const { items = [], discount = 0, tax = 11, businessCategory, ...data } = req.body;
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
          projectId: data.projectId || undefined,
          businessCategoryId: data.businessCategoryId || undefined,
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

app.get('/api/projects', async (req, res) => {
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
        quotations: true, 
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
        surveyExpenses: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(projects);
  } catch (e) {
    console.error("GET /api/projects error:", e);
    res.status(500).json([]);
  }
});

app.post('/api/projects', async (req, res) => {
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

app.put('/api/projects/:id', async (req, res) => {
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

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await prisma.preSalesProject.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/projects/:id error:", e);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await prisma.preSalesProject.findUnique({
      where: { id: req.params.id },
      include: { 
        customer: true, 
        businessCategory: true,
        surveys: { include: { expenses: true } }, 
        quotations: true, 
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
          projectId: data.projectId || undefined
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

app.patch('/api/projects/:id/status', async (req, res) => {
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
      where: { isActive: true, product: { NOT: { type: 'SERVICE' } } },
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
      where: { isActive: true, product: { NOT: { type: 'SERVICE' } } },
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
             type: 'STOCK_MOVEMENT'
           });
        } else if (result.type === 'OUT') {
           // Fallback or handle based on other keys if necessary
           await postJournalFromSystemKey({
             systemKey: 'COGS', // Ensure COGS key exists or handle fallback
             counterSystemKey: 'INVENTORY_PUSAT',
             amount,
             description: `Stock OUT: ${result.number} - ${item.sku.name}`,
             reference: result.number,
             type: 'INVENTORY'
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

// ─── WORK ORDERS ──────────────────────────────────────────────────────────────

const generateWONumber = async () => {
  const year = new Date().getFullYear();
  const count = await prisma.workOrder.count();
  return `WO-${year}-${String(count + 1).padStart(4, '0')}`;
};

const WO_INCLUDE = {
  project: true,
  businessCategory: true,
  salesOrder: { include: { customer: true } },
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
    });

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
    const doRec = await prisma.deliveryOrder.create({
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
  items: { orderBy: { no: 'asc' } }
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
    const inv = await prisma.invoice.create({
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
    const { bankAccountId } = req.body;

    const inv = await prisma.$transaction(async (tx) => {
      // 1. Get the invoice and ensure it can be paid
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: INV_INCLUDE
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status === 'PAID') throw new Error('Invoice already paid');

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

      // 3. Update Invoice Status
      const result = await tx.invoice.update({
        where: { id },
        data: { 
          status: 'PAID',
          bankAccountId: bankAccountId || invoice.bankAccountId 
        },
        include: INV_INCLUDE
      });

      // 4. Create Journal Entry
      const journalItems = [
        {
          coaId: targetCoaId,
          description: `Penerimaan Pembayaran: ${result.number} - ${result.customer?.name || ''}`,
          debit: result.grandTotal,
          credit: 0
        },
        {
          coaId: arAcc.coaId,
          description: `Pelunasan Piutang: ${result.number}`,
          debit: 0,
          credit: result.grandTotal
        }
      ];

      const count = await tx.journalEntry.count();
      const jvNumber = `JV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

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
    const { items = [], ...data } = req.body;
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
    const bank = await prisma.bankAccount.create({ data: req.body });
    res.status(201).json(bank);
  } catch (e) { res.status(400).json({ message: e.message }); }
});

app.put('/api/banks/:id', async (req, res) => {
  try {
    const bank = await prisma.bankAccount.update({
      where: { id: req.params.id },
      data: req.body
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
    const revenues = await getAccountTypeBalance(['PENDAPATAN'], endDate, startOfYear);
    const cogs = await getAccountTypeBalance(['HPP'], endDate, startOfYear);
    const expenses = await getAccountTypeBalance(['BEBAN'], endDate, startOfYear);

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

    const revenues = await getAccountTypeBalance(['PENDAPATAN'], end, start);
    const cogsItems = await getAccountTypeBalance(['HPP'], end, start);
    const expenseItems = await getAccountTypeBalance(['BEBAN'], end, start);

    const totalRevenue = revenues.reduce((sum, r) => sum + r.balance, 0);
    const totalCOGS = cogsItems.reduce((sum, c) => sum + c.balance, 0);
    const totalExpenses = expenseItems.reduce((sum, e) => sum + e.balance, 0);
    const netProfit = totalRevenue - totalCOGS - totalExpenses;

    res.json({ 
      revenue: revenues, 
      cogs: cogsItems, 
      expenses: expenseItems,
      totalRevenue,
      totalCOGS,
      totalExpenses,
      netProfit
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
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
    const balance = coa.normalBalance === 'DEBIT' ? (debit - credit) : (credit - debit);

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
        ],
        postingType: 'POSTING' 
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
    const unpaidOpex = await prisma.operationalExpense.findMany({
      where: {
        status: { notIn: ['PAID', 'REJECTED'] },  // REJECTED = void/cancelled
        date: { lte: endForecast }
      },
      select: { amount: true, date: true, name: true, category: true, status: true }
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

      // D. Projected Outflows: Operational expenses due this month
      let projectedOpex = unpaidOpex.filter(exp =>
        exp.date >= monthStart && exp.date <= monthEnd
      );

      // E. Overdue items — push all to first month (month index 0)
      if (isCurrent) {
        const overdueInvoices = outstandingInvoices.filter(inv =>
          !inv.dueDate || inv.dueDate < monthStart
        );
        const overdueBills = outstandingBills.filter(bill =>
          !bill.dueDate || bill.dueDate < monthStart
        );
        const overdueOpex = unpaidOpex.filter(exp => exp.date < monthStart);

        projectedInvoices = [...projectedInvoices, ...overdueInvoices];
        projectedBills = [...projectedBills, ...overdueBills];
        projectedOpex = [...projectedOpex, ...overdueOpex];
      }

      // F. Totals
      const projectedInflowAmt = projectedInvoices.reduce((s, inv) => s + inv.grandTotal, 0);
      const projectedBillAmt = projectedBills.reduce((s, b) => s + b.grandTotal, 0);
      const projectedOpexAmt = projectedOpex.reduce((s, e) => s + e.amount, 0);

      const totalInflow = projectedInflowAmt + actualIn;
      const totalOutflow = projectedBillAmt + projectedOpexAmt + actualOut;
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
            date: e.date,
            status: e.status
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
        billingDay: body.billingDay !== undefined ? Number(body.billingDay) : undefined,
        dueDay: body.dueDay !== undefined ? Number(body.dueDay) : undefined,
        autoBilling: body.autoBilling,
        description: body.description,
        notes: body.notes,
        terms: body.terms,
        firstPartyName: body.firstPartyName,
        firstPartyTitle: body.firstPartyTitle,
        secondPartyName: body.secondPartyName,
        secondPartyTitle: body.secondPartyTitle,
        customerId: body.customerId,
        vendorId: body.vendorId,
        projectId: body.projectId,
        userId: body.userId,
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

// --- HR / EMPLOYEES ---

app.get('/api/hr/employees', async (req, res) => {
  try {
    const { businessCategoryId } = req.query;
    const employees = await prisma.employee.findMany({
      where: {
        ...(businessCategoryId ? { businessCategoryId } : {})
      },
      include: { vendor: true, category: true, businessCategory: true },
      orderBy: { name: 'asc' }
    });
    res.json(employees);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/hr/employees/:id', async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: { vendor: true, category: true, businessCategory: true }
    });
    res.json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/hr/employees', async (req, res) => {
  try {
    const data = req.body;
    
    let vendorId = data.vendorId;
    if (!vendorId && data.createVendor) {
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
        businessCategoryId: data.businessCategoryId || null
      },
      include: { vendor: true, category: true, businessCategory: true }
    });
    res.json(employee);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/hr/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { id: _id, createdAt, updatedAt, vendor, category, payrollItems, ...data } = req.body;
    
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...data,
        joinDate: data.joinDate ? new Date(data.joinDate) : undefined,
        baseSalary: data.baseSalary !== undefined ? Number(data.baseSalary) : undefined,
        dailyWage: data.dailyWage !== undefined ? Number(data.dailyWage) : undefined,
        businessCategoryId: data.businessCategoryId || null
      },
      include: { vendor: true, category: true, businessCategory: true }
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

// --- HR / PAYROLL ---

app.get('/api/hr/payroll/accounts', async (req, res) => {
  try {
    const accounts = await prisma.chartOfAccounts.findMany({
      where: {
        OR: [
          { code: { startsWith: '1-100' } }, // Specific Bank/Cash codes
          { code: { startsWith: '1-1000' } }, 
          { name: { contains: 'Bank', mode: 'insensitive' } },
          { name: { contains: 'Kas', mode: 'insensitive' } }
        ],
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
      include: { coa: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(expenses);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/finance/operational-expenses', upload.single('attachment'), async (req, res) => {
  try {
    let attachmentPath = null;
    if (req.file) {
      attachmentPath = await processOperasionalImage(req.file);
    }

    const expense = await prisma.operationalExpense.create({
      data: {
        name: req.body.name,
        category: req.body.category,
        amount: Number(req.body.amount),
        month: Number(req.body.month),
        year: Number(req.body.year),
        coaId: req.body.coaId,
        attachment: attachmentPath,
        status: 'DRAFT'
      }
    });
    res.json(expense);
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
        paymentCoaId: coaId
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
    const users = await prisma.user.findMany({
      where: {
        ...(userRole === 'OPERATIONAL' ? { name: userName } : {}),
        ...(businessCategoryId ? { businessCategoryId } : {})
      },
      include: { businessCategory: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        businessCategoryId: true,
      },
    });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});

