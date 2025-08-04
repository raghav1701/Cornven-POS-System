/*
  Warnings:

  - Added the required column `allocatedById` to the `Rental` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Rental" ADD COLUMN     "allocatedById" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Rental" ADD CONSTRAINT "Rental_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
