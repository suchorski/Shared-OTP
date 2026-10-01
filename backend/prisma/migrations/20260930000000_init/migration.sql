-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `cpf` VARCHAR(11) NOT NULL,
    `name` VARCHAR(255) NULL,
    `warName` VARCHAR(100) NULL,
    `saram` VARCHAR(20) NULL,
    `rank` VARCHAR(50) NULL,
    `om` VARCHAR(100) NULL,
    `email` VARCHAR(255) NULL,
    `role` ENUM('USER', 'ADMIN_LOCAL', 'ADMIN_GLOBAL') NOT NULL DEFAULT 'USER',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_cpf_key`(`cpf`),
    INDEX `users_name_idx`(`name`),
    INDEX `users_warName_idx`(`warName`),
    INDEX `users_saram_idx`(`saram`),
    INDEX `users_om_idx`(`om`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otps` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `issuer` VARCHAR(100) NULL,
    `secretEnc` TEXT NOT NULL,
    `algorithm` VARCHAR(10) NOT NULL DEFAULT 'SHA1',
    `digits` INTEGER NOT NULL DEFAULT 6,
    `period` INTEGER NOT NULL DEFAULT 30,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `otps_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_shares` (
    `id` VARCHAR(191) NOT NULL,
    `otpId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sharedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_shares_userId_idx`(`userId`),
    UNIQUE INDEX `otp_shares_otpId_userId_key`(`otpId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `action` ENUM('LOGIN_SUCCESS', 'LOGIN_FAILED', 'OTP_CREATE', 'OTP_UPDATE', 'OTP_DELETE', 'OTP_SHARE', 'OTP_UNSHARE', 'OTP_TRANSFER', 'OTP_COPY', 'ADMIN_VIEW_CODE', 'ROLE_CHANGE') NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorCpf` VARCHAR(11) NULL,
    `actorOm` VARCHAR(100) NULL,
    `otpId` VARCHAR(191) NULL,
    `otpName` VARCHAR(100) NULL,
    `ownerOm` VARCHAR(100) NULL,
    `targetUserId` VARCHAR(191) NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_otpId_idx`(`otpId`),
    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_targetUserId_idx`(`targetUserId`),
    INDEX `audit_logs_actorOm_idx`(`actorOm`),
    INDEX `audit_logs_ownerOm_idx`(`ownerOm`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `otps` ADD CONSTRAINT `otps_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_shares` ADD CONSTRAINT `otp_shares_otpId_fkey` FOREIGN KEY (`otpId`) REFERENCES `otps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_shares` ADD CONSTRAINT `otp_shares_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp_shares` ADD CONSTRAINT `otp_shares_sharedById_fkey` FOREIGN KEY (`sharedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

