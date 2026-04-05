ALTER TABLE `employees`
  ADD COLUMN `department_id` VARCHAR(191) NULL,
  ADD COLUMN `branch_id` INTEGER NULL,
  ADD COLUMN `direct_manager_employee_id` VARCHAR(191) NULL,
  ADD COLUMN `cost_center_id` INTEGER UNSIGNED NULL;

CREATE TABLE `employee_departments` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,
  UNIQUE INDEX `employee_departments_code_key`(`code`),
  INDEX `edp_name_del_idx`(`name`, `deleted_at`),
  INDEX `edp_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `edp_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `employee_contracts` (
  `id` VARCHAR(191) NOT NULL,
  `employee_id` VARCHAR(191) NOT NULL,
  `contract_title` VARCHAR(150) NOT NULL,
  `contract_number` VARCHAR(60) NULL,
  `contract_start_date` DATETIME(3) NOT NULL,
  `contract_end_date` DATETIME(3) NULL,
  `salary_amount` DECIMAL(15, 2) NULL,
  `notes` VARCHAR(255) NULL,
  `is_current` BOOLEAN NOT NULL DEFAULT true,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,
  INDEX `emct_employee_start_del_idx`(`employee_id`, `contract_start_date`, `deleted_at`),
  INDEX `emct_number_del_idx`(`contract_number`, `deleted_at`),
  INDEX `emct_current_del_idx`(`is_current`, `deleted_at`),
  INDEX `emct_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `emct_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `employee_leave_balances` (
  `id` VARCHAR(191) NOT NULL,
  `employee_id` VARCHAR(191) NOT NULL,
  `leave_type` ENUM('ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'MATERNITY', 'OTHER') NOT NULL,
  `balance_year` INTEGER NOT NULL,
  `allocated_days` INTEGER NOT NULL DEFAULT 0,
  `carried_forward_days` INTEGER NOT NULL DEFAULT 0,
  `manual_adjustment_days` INTEGER NOT NULL DEFAULT 0,
  `notes` VARCHAR(1000) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,
  UNIQUE INDEX `elb_employee_type_year_uq`(`employee_id`, `leave_type`, `balance_year`),
  INDEX `elb_employee_year_del_idx`(`employee_id`, `balance_year`, `deleted_at`),
  INDEX `elb_type_del_idx`(`leave_type`, `deleted_at`),
  INDEX `elb_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `elb_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `employee_leave_requests` (
  `id` VARCHAR(191) NOT NULL,
  `employee_id` VARCHAR(191) NOT NULL,
  `leave_type` ENUM('ANNUAL', 'SICK', 'EMERGENCY', 'UNPAID', 'MATERNITY', 'OTHER') NOT NULL,
  `start_date` DATETIME(3) NOT NULL,
  `end_date` DATETIME(3) NOT NULL,
  `total_days` INTEGER NOT NULL DEFAULT 1,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  `reason` VARCHAR(1000) NULL,
  `notes` VARCHAR(1000) NULL,
  `approved_by_user_id` VARCHAR(191) NULL,
  `approved_at` DATETIME(3) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,
  INDEX `elr_employee_start_del_idx`(`employee_id`, `start_date`, `deleted_at`),
  INDEX `elr_type_del_idx`(`leave_type`, `deleted_at`),
  INDEX `elr_status_del_idx`(`status`, `deleted_at`),
  INDEX `elr_approved_by_del_idx`(`approved_by_user_id`, `deleted_at`),
  INDEX `elr_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `elr_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `employee_lifecycle_checklists` (
  `id` VARCHAR(191) NOT NULL,
  `employee_id` VARCHAR(191) NOT NULL,
  `checklist_type` ENUM('ONBOARDING', 'OFFBOARDING') NOT NULL,
  `title` VARCHAR(180) NOT NULL,
  `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'WAIVED') NOT NULL DEFAULT 'PENDING',
  `assigned_to_employee_id` VARCHAR(191) NULL,
  `due_date` DATETIME(3) NULL,
  `completed_at` DATETIME(3) NULL,
  `notes` VARCHAR(1000) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NULL,
  `updated_by` VARCHAR(191) NULL,
  INDEX `elc_employee_type_del_idx`(`employee_id`, `checklist_type`, `deleted_at`),
  INDEX `elc_assignee_del_idx`(`assigned_to_employee_id`, `deleted_at`),
  INDEX `elc_status_del_idx`(`status`, `deleted_at`),
  INDEX `elc_due_date_del_idx`(`due_date`, `deleted_at`),
  INDEX `elc_active_del_idx`(`is_active`, `deleted_at`),
  INDEX `elc_deleted_at_idx`(`deleted_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `emp_department_del_idx` ON `employees`(`department_id`, `deleted_at`);
CREATE INDEX `emp_branch_del_idx` ON `employees`(`branch_id`, `deleted_at`);
CREATE INDEX `emp_manager_del_idx` ON `employees`(`direct_manager_employee_id`, `deleted_at`);
CREATE INDEX `emp_cost_center_del_idx` ON `employees`(`cost_center_id`, `deleted_at`);

ALTER TABLE `employees`
  ADD CONSTRAINT `employees_department_id_fkey`
    FOREIGN KEY (`department_id`) REFERENCES `employee_departments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employees_branch_id_fkey`
    FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employees_direct_manager_employee_id_fkey`
    FOREIGN KEY (`direct_manager_employee_id`) REFERENCES `employees`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employees_cost_center_id_fkey`
    FOREIGN KEY (`cost_center_id`) REFERENCES `cost_centers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employee_departments`
  ADD CONSTRAINT `employee_departments_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_departments_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employee_contracts`
  ADD CONSTRAINT `employee_contracts_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_contracts_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_contracts_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employee_leave_balances`
  ADD CONSTRAINT `employee_leave_balances_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_leave_balances_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_leave_balances_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employee_leave_requests`
  ADD CONSTRAINT `employee_leave_requests_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_leave_requests_approved_by_user_id_fkey`
    FOREIGN KEY (`approved_by_user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_leave_requests_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_leave_requests_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `employee_lifecycle_checklists`
  ADD CONSTRAINT `employee_lifecycle_checklists_employee_id_fkey`
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_lifecycle_checklists_assigned_to_employee_id_fkey`
    FOREIGN KEY (`assigned_to_employee_id`) REFERENCES `employees`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_lifecycle_checklists_created_by_fkey`
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `employee_lifecycle_checklists_updated_by_fkey`
    FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
