-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "name" TEXT NOT NULL DEFAULT 'PT. Axon Ecosystem',
    "legalName" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Indonesia',
    "phone" TEXT,
    "fax" TEXT,
    "email" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "logo" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankHolder" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);
