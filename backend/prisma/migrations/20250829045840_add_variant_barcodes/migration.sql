/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `barcode` to the `ProductVariant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."BarcodeType" AS ENUM ('CODE128', 'EAN13', 'QR');

-- AlterEnum
ALTER TYPE "public"."InventoryChangeType" ADD VALUE 'VARIANT_BARCODE_SET';

-- AlterTable
ALTER TABLE "public"."ProductVariant" ADD COLUMN     "barcode" TEXT NOT NULL,
ADD COLUMN     "barcodeType" "public"."BarcodeType" NOT NULL DEFAULT 'CODE128';

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_barcode_key" ON "public"."ProductVariant"("barcode");
