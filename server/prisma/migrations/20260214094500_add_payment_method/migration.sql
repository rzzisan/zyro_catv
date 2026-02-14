-- Add payment method field
ALTER TABLE `Payment` ADD COLUMN `method` VARCHAR(191) NULL;
