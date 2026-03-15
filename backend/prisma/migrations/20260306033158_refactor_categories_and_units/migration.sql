/*
  Warnings:

  - You are about to drop the column `category` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseUnit` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "category",
DROP COLUMN "purchaseUnit",
DROP COLUMN "unit",
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "purchaseUnitId" TEXT,
ADD COLUMN     "unitId" TEXT NOT NULL DEFAULT 'pcs';

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
