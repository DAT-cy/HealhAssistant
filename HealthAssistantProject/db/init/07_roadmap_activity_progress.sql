USE health_assistant;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadmap_plan_slots' AND column_name = 'started_at');
SET @migration = IF(@column_exists = 0,
    'ALTER TABLE roadmap_plan_slots ADD COLUMN started_at TIMESTAMP NULL AFTER status', 'SELECT 1');
PREPARE add_started_at FROM @migration;
EXECUTE add_started_at;
DEALLOCATE PREPARE add_started_at;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadmap_plan_slots' AND column_name = 'actual_duration_minutes');
SET @migration = IF(@column_exists = 0,
    'ALTER TABLE roadmap_plan_slots ADD COLUMN actual_duration_minutes INT NULL AFTER completed_at', 'SELECT 1');
PREPARE add_actual_duration FROM @migration;
EXECUTE add_actual_duration;
DEALLOCATE PREPARE add_actual_duration;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadmap_plan_slots' AND column_name = 'skip_reason');
SET @migration = IF(@column_exists = 0,
    'ALTER TABLE roadmap_plan_slots ADD COLUMN skip_reason VARCHAR(300) NULL AFTER notes', 'SELECT 1');
PREPARE add_skip_reason FROM @migration;
EXECUTE add_skip_reason;
DEALLOCATE PREPARE add_skip_reason;

SET @status_check_exists = (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'roadmap_plan_slots'
      AND constraint_name = 'chk_roadmap_slot_status' AND constraint_type = 'CHECK');
SET @drop_status_check = IF(@status_check_exists > 0,
    'ALTER TABLE roadmap_plan_slots DROP CHECK chk_roadmap_slot_status', 'SELECT 1');
PREPARE drop_status_check FROM @drop_status_check;
EXECUTE drop_status_check;
DEALLOCATE PREPARE drop_status_check;

UPDATE roadmap_plan_slots SET status = 'UPCOMING' WHERE status = 'PLANNED';
ALTER TABLE roadmap_plan_slots MODIFY COLUMN status VARCHAR(16) NOT NULL DEFAULT 'UPCOMING';
ALTER TABLE roadmap_plan_slots ADD CONSTRAINT chk_roadmap_slot_status
    CHECK (status IN ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'));

SET @actual_check_exists = (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'roadmap_plan_slots'
      AND constraint_name = 'chk_roadmap_slot_actual_duration' AND constraint_type = 'CHECK');
SET @drop_actual_check = IF(@actual_check_exists > 0,
    'ALTER TABLE roadmap_plan_slots DROP CHECK chk_roadmap_slot_actual_duration', 'SELECT 1');
PREPARE drop_actual_check FROM @drop_actual_check;
EXECUTE drop_actual_check;
DEALLOCATE PREPARE drop_actual_check;
ALTER TABLE roadmap_plan_slots ADD CONSTRAINT chk_roadmap_slot_actual_duration
    CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes BETWEEN 1 AND 1440);
