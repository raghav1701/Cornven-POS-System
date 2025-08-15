-- === CUBE =========================================================
ALTER TABLE "Cube" ADD COLUMN IF NOT EXISTS "pricePerDay" DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Cube' AND column_name = 'pricePerMonth'
  ) THEN
    -- only reference the old column inside dynamic SQL
    EXECUTE 'UPDATE "Cube"
             SET "pricePerDay" = COALESCE("pricePerDay", "pricePerMonth" / 30.0)';
    ALTER TABLE "Cube" DROP COLUMN IF EXISTS "pricePerMonth";
  END IF;
END $$;

-- if your target schema requires NOT NULL, keep this; otherwise remove:
ALTER TABLE "Cube" ALTER COLUMN "pricePerDay" SET NOT NULL;


-- === RENTAL =======================================================
ALTER TABLE "Rental" ADD COLUMN IF NOT EXISTS "dailyRent" DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Rental' AND column_name = 'monthlyRent'
  ) THEN
    EXECUTE 'UPDATE "Rental"
             SET "dailyRent" = COALESCE("dailyRent", "monthlyRent" / 30.0)';
    ALTER TABLE "Rental" DROP COLUMN IF EXISTS "monthlyRent";
  END IF;
END $$;

ALTER TABLE "Rental" ALTER COLUMN "dailyRent" SET NOT NULL;
