const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Comprehensive ERP Data...');

  // Seed Products
  const products = [
    {
      code: 'SRV-IT-001',
      name: 'Cloud Infrastructure Setup',
      brand: 'Axon Cloud',
      type: 'SERVICE',
      category: 'Cloud Services',
      unit: 'PROJECT',
      purchaseUnit: 'PROJECT',
      purchasePrice: 5000000,
      salePrice: 15000000,
      stock: 1,
      minStock: 0,
      stockLocation: 'CLOUD-Z1',
      specifications: 'High availability AWS/Azure setup with auto-scaling.',
      isActive: true,
    },
    {
      code: 'HW-SRV-001',
      name: 'Dell PowerEdge R650 Server',
      brand: 'DELL',
      type: 'GOODS',
      category: 'Hardware',
      unit: 'UNIT',
      purchaseUnit: 'UNIT',
      purchasePrice: 45000000,
      salePrice: 65000000,
      stock: 5,
      minStock: 2,
      stockLocation: 'WAREHOUSE-A1',
      specifications: 'Intel Xeon, 128GB RAM, 4TB SSD.',
      barcode: '880123456789',
      weight: 15.5,
      isActive: true,
    },
    {
      code: 'SW-LIC-001',
      name: 'Enterprise Firewall License',
      brand: 'Fortinet',
      type: 'GOODS',
      category: 'Security',
      unit: 'LICENSE',
      purchaseUnit: 'PACK-10',
      purchasePrice: 12000000,
      salePrice: 18000000,
      stock: 20,
      minStock: 5,
      stockLocation: 'DIGITAL-VAULT',
      isActive: true,
    }
  ];

  for (const p of products) {
    const { code, ...rest } = p;
    await prisma.product.upsert({
      where: { code },
      update: rest,
      create: p,
    });
  }

  // Seed Customers
  const customers = [
    {
      code: 'CUST-ORG-001',
      name: 'PT. Teknologi Maju Jaya',
      type: 'CORPORATE',
      email: 'contact@tmj.co.id',
      phone: '021-5551234',
      address: 'Jl. Sudirman No. 45, Jakarta Pusat',
      taxId: '01.234.567.8-012.000',
      taxAddress: 'Kawasan Industri Jababeka, Cikarang',
      company: 'TMJ Group',
      creditLimit: 500000000,
      paymentTerms: 'NET 45',
      isActive: true,
    },
    {
      code: 'CUST-IND-002',
      name: 'Ahmad Subardjo',
      type: 'INDIVIDUAL',
      email: 'ahmad@example.com',
      phone: '08123456789',
      address: 'Perum Gading Serpong, Tangerang',
      creditLimit: 10000000,
      paymentTerms: 'COD',
      isActive: true,
    },
  ];

  for (const c of customers) {
    const { code, ...rest } = c;
    await prisma.customer.upsert({
      where: { code },
      update: rest,
      create: c,
    });
  }

  console.log('ERP Data Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
