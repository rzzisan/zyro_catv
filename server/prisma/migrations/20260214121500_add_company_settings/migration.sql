-- Add company settings fields
ALTER TABLE `Company`
  ADD COLUMN `helplineNumber` VARCHAR(191) NULL,
  ADD COLUMN `invoiceNote` TEXT NULL,
  ADD COLUMN `slogan` VARCHAR(191) NULL,
  ADD COLUMN `address` TEXT NULL;
