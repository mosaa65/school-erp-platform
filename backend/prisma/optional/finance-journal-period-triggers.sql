DROP TRIGGER IF EXISTS `trg_je_before_update_check_period`;
DROP TRIGGER IF EXISTS `trg_je_before_insert_check_period`;

CREATE TRIGGER `trg_je_before_update_check_period`
BEFORE UPDATE ON `journal_entries`
FOR EACH ROW
BEGIN
  DECLARE v_period_status VARCHAR(20);

  IF NEW.status = 'POSTED' AND OLD.status <> 'POSTED' THEN
    SELECT fp.status
    INTO v_period_status
    FROM fiscal_periods fp
    WHERE fp.fiscal_year_id = NEW.fiscal_year_id
      AND NEW.entry_date BETWEEN fp.start_date AND fp.end_date
    LIMIT 1;

    IF v_period_status = 'CLOSED' THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'لا يمكن ترحيل قيد داخل فترة مالية مغلقة.';
    END IF;

    IF v_period_status = 'CLOSING' THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'لا يمكن ترحيل قيد داخل فترة قيد الإقفال.';
    END IF;

    IF NEW.fiscal_period_id IS NULL THEN
      SELECT fp.id
      INTO @auto_period_id
      FROM fiscal_periods fp
      WHERE fp.fiscal_year_id = NEW.fiscal_year_id
        AND NEW.entry_date BETWEEN fp.start_date AND fp.end_date
      LIMIT 1;
      SET NEW.fiscal_period_id = @auto_period_id;
    END IF;
  END IF;

  IF OLD.status = 'POSTED' AND NEW.status NOT IN ('POSTED', 'REVERSED') THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'لا يمكن تعديل قيد مرحل. استخدم العكس بدلا من ذلك.';
  END IF;
END;

CREATE TRIGGER `trg_je_before_insert_check_period`
BEFORE INSERT ON `journal_entries`
FOR EACH ROW
BEGIN
  DECLARE v_period_status VARCHAR(20);
  DECLARE v_period_id INTEGER;

  SELECT fp.id, fp.status
  INTO v_period_id, v_period_status
  FROM fiscal_periods fp
  WHERE fp.fiscal_year_id = NEW.fiscal_year_id
    AND NEW.entry_date BETWEEN fp.start_date AND fp.end_date
  LIMIT 1;

  IF v_period_status = 'CLOSED' THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'لا يمكن إنشاء قيد داخل فترة مالية مغلقة.';
  END IF;

  IF NEW.fiscal_period_id IS NULL AND v_period_id IS NOT NULL THEN
    SET NEW.fiscal_period_id = v_period_id;
  END IF;
END;
