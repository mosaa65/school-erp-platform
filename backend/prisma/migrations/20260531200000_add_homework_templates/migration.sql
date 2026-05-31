CREATE TABLE `homework_templates` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `content` TEXT NULL,
  `max_score` DECIMAL(6, 2) NOT NULL DEFAULT 10.00,
  `notes` VARCHAR(255) NULL,
  `homework_type_id` VARCHAR(191) NULL,
  `subject_id` VARCHAR(191) NULL,
  `grade_level_id` VARCHAR(191) NULL,
  `is_system` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,

  UNIQUE INDEX `homework_templates_code_key`(`code`),
  INDEX `hwtpl_type_del_idx`(`homework_type_id`, `deleted_at`),
  INDEX `hwtpl_subject_del_idx`(`subject_id`, `deleted_at`),
  INDEX `hwtpl_grade_del_idx`(`grade_level_id`, `deleted_at`),
  INDEX `hwtpl_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `hwtpl_deleted_at_idx`(`deleted_at`),
  INDEX `homework_templates_created_by_fkey`(`created_by`),
  INDEX `homework_templates_updated_by_fkey`(`updated_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `homework_templates`
  ADD CONSTRAINT `homework_templates_created_by_fkey`
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `homework_templates`
  ADD CONSTRAINT `homework_templates_updated_by_fkey`
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `homework_templates`
  (`id`, `code`, `name`, `title`, `content`, `max_score`, `notes`, `is_system`, `is_active`, `created_at`, `updated_at`)
VALUES
  ('system_homework_template_daily_practice', 'DAILY_PRACTICE', 'تدريب يومي', 'تدريب يومي', 'حل التدريبات المحددة من درس اليوم مع توضيح خطوات الحل.', 5.00, 'يراجع في بداية الحصة القادمة.', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('system_homework_template_weekly_homework', 'WEEKLY_HOMEWORK', 'واجب أسبوعي', 'واجب أسبوعي', 'حل أسئلة المراجعة الأسبوعية وتسليمها في الموعد المحدد.', 10.00, 'يعتمد في متابعة الواجبات الأسبوعية.', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('system_homework_template_short_research', 'SHORT_RESEARCH', 'بحث قصير', 'بحث قصير', 'إعداد بحث قصير من صفحة واحدة حول موضوع الدرس مع ذكر المصادر.', 10.00, 'يراعى التنظيم وسلامة اللغة.', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('system_homework_template_mini_project', 'MINI_PROJECT', 'مشروع مصغر', 'مشروع مصغر', 'تنفيذ نشاط تطبيقي مرتبط بالمادة وتسليمه مع شرح مختصر للفكرة.', 15.00, 'يمكن تنفيذه فرديا أو ضمن مجموعة حسب توجيه المعلم.', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
