-- prisma/migrations/20250815_fix_daily_pricing/migration.sql
-- Cube
ALTER TABLE "Cube" ADD COLUMN IF NOT EXISTS "pricePerDay" DOUBLE PRECISION;
UPDATE "Cube"
SET "pricePerDay" = CASE
  WHEN "pricePerDay" IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Cube' AND column_name='pricePerMonth'
  ) THEN "pricePerMonth" / 30.0
  ELSE "pricePerDay"
END;
ALTER TABLE "Cube" ALTER COLUMN "pricePerDay" SET NOT NULL;
ALTER TABLE "Cube" DROP COLUMN IF EXISTS "pricePerMonth";

-- Rental
ALTER TABLE "Rental" ADD COLUMN IF NOT EXISTS "dailyRent" DOUBLE PRECISION;
UPDATE "Rental"
SET "dailyRent" = CASE
  WHEN "dailyRent" IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='Rental' AND column_name='monthlyRent'
  ) THEN "monthlyRent" / 30.0
  ELSE "dailyRent"
END;
ALTER TABLE "Rental" ALTER COLUMN "dailyRent" SET NOT NULL;
ALTER TABLE "Rental" DROP COLUMN IF EXISTS "monthlyRent";
