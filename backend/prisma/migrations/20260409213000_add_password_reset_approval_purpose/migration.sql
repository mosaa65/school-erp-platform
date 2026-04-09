ALTER TABLE `account_approval_requests`
  MODIFY COLUMN `purpose` ENUM(
    'FIRST_PASSWORD_SETUP',
    'NEW_DEVICE_LOGIN',
    'PASSWORD_RESET'
  ) NOT NULL;
