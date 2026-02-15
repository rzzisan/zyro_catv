-- Add billing system to company and payment allocations
ALTER TABLE `Company`
  ADD COLUMN `billingSystem` ENUM('POSTPAID', 'PREPAID') NOT NULL DEFAULT 'POSTPAID';

CREATE TABLE `PaymentAllocation` (
  `id` VARCHAR(191) NOT NULL,
  `paymentId` VARCHAR(191) NOT NULL,
  `billId` VARCHAR(191) NOT NULL,
  `amount` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `PaymentAllocation_billId_idx` (`billId`),
  INDEX `PaymentAllocation_paymentId_idx` (`paymentId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PaymentAllocation_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `PaymentAllocation_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `Bill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
