-- AlterTable
ALTER TABLE `employees`
  ADD COLUMN `locality_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `emp_locality_del_idx` ON `employees`(`locality_id`, `deleted_at`);

-- AddForeignKey
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_locality_id_fkey`
  FOREIGN KEY (`locality_id`) REFERENCES `localities`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;
