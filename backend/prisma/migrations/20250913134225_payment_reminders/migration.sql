-- CreateEnum
CREATE TYPE "public"."PaymentReminderType" AS ENUM ('SEVEN_DAY_ADVANCE', 'ONE_DAY_DUE', 'OVERDUE');

-- AlterTable
ALTER TABLE "public"."ProductVariant" ALTER COLUMN "lowStockThreshold" SET DEFAULT 5;

-- CreateTable
CREATE TABLE "public"."PaymentReminder" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "reminderType" "public"."PaymentReminderType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentReminder_rentalId_idx" ON "public"."PaymentReminder"("rentalId");

-- CreateIndex
CREATE INDEX "PaymentReminder_dueDate_idx" ON "public"."PaymentReminder"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReminder_rentalId_reminderType_dueDate_key" ON "public"."PaymentReminder"("rentalId", "reminderType", "dueDate");

-- AddForeignKey
ALTER TABLE "public"."PaymentReminder" ADD CONSTRAINT "PaymentReminder_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "public"."Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;
