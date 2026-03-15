/*
  Warnings:

  - You are about to drop the column `barcode` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `minStock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purchasePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseUnitId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `salePrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `specifications` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stockLocation` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unitId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `usage` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[barcode]` on the table `ProductSKU` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productSKUId` to the `ProductPriceHistory` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_purchaseUnitId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_unitId_fkey";

-- DropForeignKey
ALTER TABLE "ProductPriceHistory" DROP CONSTRAINT "ProductPriceHistory_productId_fkey";

-- DropIndex
DROP INDEX "Product_barcode_key";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "barcode",
DROP COLUMN "isActive",
DROP COLUMN "minStock",
DROP COLUMN "purchasePrice",
DROP COLUMN "purchaseUnitId",
DROP COLUMN "salePrice",
DROP COLUMN "specifications",
DROP COLUMN "stock",
DROP COLUMN "stockLocation",
DROP COLUMN "unitId",
DROP COLUMN "usage",
DROP COLUMN "weight";

-- AlterTable
ALTER TABLE "ProductPriceHistory" ADD COLUMN     "productSKUId" TEXT NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProductSKU" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "purchaseUnitId" TEXT,
ADD COLUMN     "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "specifications" TEXT,
ADD COLUMN     "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "stockLocation" TEXT,
ADD COLUMN     "unitId" TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN     "usage" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "ProductSKU_barcode_key" ON "ProductSKU"("barcode");

-- AddForeignKey
ALTER TABLE "ProductSKU" ADD CONSTRAINT "ProductSKU_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSKU" ADD CONSTRAINT "ProductSKU_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productSKUId_fkey" FOREIGN KEY ("productSKUId") REFERENCES "ProductSKU"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
