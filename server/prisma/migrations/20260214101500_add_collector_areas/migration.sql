-- Create collector-area assignments
CREATE TABLE `CollectorArea` (
  `id` VARCHAR(191) NOT NULL,
  `collectorId` VARCHAR(191) NOT NULL,
  `areaId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `CollectorArea_collectorId_areaId_key` (`collectorId`, `areaId`),
  INDEX `CollectorArea_areaId_idx` (`areaId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `CollectorArea_collectorId_fkey` FOREIGN KEY (`collectorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CollectorArea_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
