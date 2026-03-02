-- Add soft delete support to Customer
ALTER TABLE `Customer` ADD COLUMN `deletedAt` DATETIME(3) NULL;
CREATE INDEX `Customer_companyId_deletedAt_idx` ON `Customer`(`companyId`, `deletedAt`);
