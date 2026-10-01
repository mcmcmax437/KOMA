-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `telegram_id` BIGINT NOT NULL,
    `username` VARCHAR(255) NULL,
    `first_name` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_telegram_id_key`(`telegram_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_titles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `title_name` VARCHAR(500) NOT NULL,
    `cover_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_titles_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_title_sources` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_title_id` BIGINT UNSIGNED NOT NULL,
    `source_code` VARCHAR(50) NOT NULL,
    `external_title_id` VARCHAR(255) NOT NULL,
    `external_title_url` TEXT NOT NULL,
    `last_known_chapter` VARCHAR(100) NULL,
    `last_checked_at` DATETIME(3) NULL,
    `notifications_enabled` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_uts_source_external`(`source_code`, `external_title_id`),
    INDEX `idx_uts_notifications`(`notifications_enabled`, `last_checked_at`),
    UNIQUE INDEX `uq_title_source`(`user_title_id`, `source_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_progress` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `user_title_source_id` BIGINT UNSIGNED NOT NULL,
    `external_chapter_id` VARCHAR(255) NOT NULL,
    `chapter_number` VARCHAR(100) NOT NULL,
    `page` INTEGER UNSIGNED NOT NULL DEFAULT 1,
    `progress_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `completed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_progress_latest`(`user_id`, `updated_at`),
    UNIQUE INDEX `uq_progress_chapter`(`user_id`, `user_title_source_id`, `external_chapter_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_history` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `user_title_source_id` BIGINT UNSIGNED NOT NULL,
    `external_chapter_id` VARCHAR(255) NOT NULL,
    `chapter_number` VARCHAR(100) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `last_page` INTEGER UNSIGNED NOT NULL DEFAULT 1,

    INDEX `idx_history_user_date`(`user_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_titles` ADD CONSTRAINT `fk_user_titles_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_title_sources` ADD CONSTRAINT `fk_uts_title` FOREIGN KEY (`user_title_id`) REFERENCES `user_titles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_progress` ADD CONSTRAINT `fk_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_progress` ADD CONSTRAINT `fk_progress_source` FOREIGN KEY (`user_title_source_id`) REFERENCES `user_title_sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_history` ADD CONSTRAINT `fk_history_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_history` ADD CONSTRAINT `fk_history_source` FOREIGN KEY (`user_title_source_id`) REFERENCES `user_title_sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
