-- AlterTable
ALTER TABLE `users`
ADD COLUMN `employee_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_employee_id_key` ON `users`(`employee_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
