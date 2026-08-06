// Backfill HPP (costPrice) + skuId untuk quotation item lama.
// Cocokkan kode SKU yang ada di dalam kurung pada description, mis: "Ubiquiti (SKU-001)".
// Run: node tools/backfill-quotation-hpp.js
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const p = new PrismaClient();

async function main() {
  const skus = await p.productSKU.findMany({ select: { id: true, code: true, purchasePrice: true } });
  const byCode = new Map(skus.map(s => [s.code, s]));
  const items = await p.quotationItem.findMany({
    where: { OR: [{ costPrice: 0 }, { skuId: null }] },
    select: { id: true, description: true }
  });

  let matched = 0, skipped = 0;
  for (const it of items) {
    const m = it.description && it.description.match(/\(([^)]+)\)\s*$/);
    const sku = m && byCode.get(m[1].trim());
    if (!sku) { skipped++; continue; }
    await p.quotationItem.update({
      where: { id: it.id },
      data: { skuId: sku.id, costPrice: sku.purchasePrice }
    });
    matched++;
  }
  console.log(`Done. updated=${matched}, skipped(no SKU match)=${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());