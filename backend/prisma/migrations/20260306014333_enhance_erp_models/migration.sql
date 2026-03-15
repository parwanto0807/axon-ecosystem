/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "taxAddress" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'CORPORATE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "purchaseUnit" TEXT,
ADD COLUMN     "specifications" TEXT,
ADD COLUMN     "stockLocation" TEXT,
ADD COLUMN     "usage" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
