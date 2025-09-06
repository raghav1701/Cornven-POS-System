/*
  Warnings:

  - The values [VARIANT_BARCODE_SET] on the enum `InventoryChangeType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `price` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `ProductVariant` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `ProductVariant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."VariantStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."InventoryChangeType_new" AS ENUM ('SUBMISSION', 'STOCK_UPDATE', 'PRICE_UPDATE', 'APPROVAL', 'VARIANT_CREATE', 'VARIANT_STOCK_UPDATE', 'VARIANT_PRICE_UPDATE', 'VARIANT_STATUS_UPDATE');
ALTER TABLE "public"."InventoryLog" ALTER COLUMN "changeType" TYPE "public"."InventoryChangeType_new" USING ("changeType"::text::"public"."InventoryChangeType_new");
ALTER TYPE "public"."InventoryChangeType" RENAME TO "InventoryChangeType_old";
ALTER TYPE "public"."InventoryChangeType_new" RENAME TO "InventoryChangeType";
DROP TYPE "public"."InventoryChangeType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."Product_sku_key";

-- DropIndex
DROP INDEX "public"."ProductVariant_sku_key";

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "price",
DROP COLUMN "sku",
DROP COLUMN "status",
DROP COLUMN "stock";

-- AlterTable
ALTER TABLE "public"."ProductVariant" DROP COLUMN "imageUrl",
DROP COLUMN "sku",
ADD COLUMN     "status" "public"."VariantStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "public"."ProductStatus";
