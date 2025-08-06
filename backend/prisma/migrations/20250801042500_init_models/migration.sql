-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'STAFF', 'TENANT', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "public"."CubeStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."RentalStatus" AS ENUM ('ACTIVE', 'UPCOMING', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cube" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "pricePerMonth" DOUBLE PRECISION NOT NULL,
    "status" "public"."CubeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cube_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Rental" (
    "id" SERIAL NOT NULL,
    "tenantId" INTEGER NOT NULL,
    "cubeId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "lastPayment" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cube_code_key" ON "public"."Cube"("code");

-- AddForeignKey
ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rental" ADD CONSTRAINT "Rental_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rental" ADD CONSTRAINT "Rental_cubeId_fkey" FOREIGN KEY ("cubeId") REFERENCES "public"."Cube"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
