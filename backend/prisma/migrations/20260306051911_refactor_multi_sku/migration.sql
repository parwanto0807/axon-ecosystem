/*
  Warnings:

  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sku";

-- CreateTable
CREATE TABLE "ProductSKU" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSKU_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSKU_code_key" ON "ProductSKU"("code");

-- AddForeignKey
ALTER TABLE "ProductSKU" ADD CONSTRAINT "ProductSKU_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
