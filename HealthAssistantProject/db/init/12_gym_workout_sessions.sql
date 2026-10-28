USE health_assistant;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'plan_slot_id');
SET @migration = IF(@column_exists = 0,
    'ALTER TABLE workout_sessions ADD COLUMN plan_slot_id BIGINT NULL AFTER user_id', 'SELECT 1');
PREPARE add_gym_slot FROM @migration; EXECUTE add_gym_slot; DEALLOCATE PREPARE add_gym_slot;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'roadmap_id');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN roadmap_id BIGINT NULL AFTER plan_slot_id', 'SELECT 1');
PREPARE add_gym_roadmap FROM @migration; EXECUTE add_gym_roadmap; DEALLOCATE PREPARE add_gym_roadmap;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'started_at');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN started_at TIMESTAMP NULL AFTER exercise', 'SELECT 1');
PREPARE add_gym_start FROM @migration; EXECUTE add_gym_start; DEALLOCATE PREPARE add_gym_start;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'duration_seconds');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN duration_seconds BIGINT NULL AFTER started_at', 'SELECT 1');
PREPARE add_gym_duration FROM @migration; EXECUTE add_gym_duration; DEALLOCATE PREPARE add_gym_duration;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'session_status');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN session_status VARCHAR(16) NOT NULL DEFAULT ''COMPLETED'' AFTER duration_seconds', 'SELECT 1');
PREPARE add_gym_status FROM @migration; EXECUTE add_gym_status; DEALLOCATE PREPARE add_gym_status;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'reps_source');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN reps_source VARCHAR(12) NOT NULL DEFAULT ''AI_LEGACY'' AFTER reps', 'SELECT 1');
PREPARE add_reps_source FROM @migration; EXECUTE add_reps_source; DEALLOCATE PREPARE add_reps_source;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'user_rating');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN user_rating TINYINT NULL AFTER session_status', 'SELECT 1');
PREPARE add_gym_rating FROM @migration; EXECUTE add_gym_rating; DEALLOCATE PREPARE add_gym_rating;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'notes');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN notes VARCHAR(500) NULL AFTER user_rating', 'SELECT 1');
PREPARE add_gym_notes FROM @migration; EXECUTE add_gym_notes; DEALLOCATE PREPARE add_gym_notes;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'ai_feedback');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN ai_feedback LONGTEXT NULL AFTER notes', 'SELECT 1');
PREPARE add_gym_feedback FROM @migration; EXECUTE add_gym_feedback; DEALLOCATE PREPARE add_gym_feedback;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'ai_analysis_count');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN ai_analysis_count INT NOT NULL DEFAULT 0 AFTER ai_feedback', 'SELECT 1');
PREPARE add_gym_analysis_count FROM @migration; EXECUTE add_gym_analysis_count; DEALLOCATE PREPARE add_gym_analysis_count;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'last_ai_analysis_at');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN last_ai_analysis_at TIMESTAMP NULL AFTER ai_analysis_count', 'SELECT 1');
PREPARE add_gym_analysis_time FROM @migration; EXECUTE add_gym_analysis_time; DEALLOCATE PREPARE add_gym_analysis_time;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND column_name = 'row_version');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE workout_sessions ADD COLUMN row_version BIGINT NOT NULL DEFAULT 0 AFTER last_ai_analysis_at', 'SELECT 1');
PREPARE add_gym_version FROM @migration; EXECUTE add_gym_version; DEALLOCATE PREPARE add_gym_version;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'workout_sessions' AND index_name = 'idx_workout_plan_slot_status');
SET @migration = IF(@index_exists = 0, 'CREATE INDEX idx_workout_plan_slot_status ON workout_sessions (plan_slot_id, session_status, started_at)', 'SELECT 1');
PREPARE add_gym_index FROM @migration; EXECUTE add_gym_index; DEALLOCATE PREPARE add_gym_index;

SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'workout_sessions' AND constraint_name = 'fk_workout_plan_slot');
SET @migration = IF(@constraint_exists = 0, 'ALTER TABLE workout_sessions ADD CONSTRAINT fk_workout_plan_slot FOREIGN KEY (plan_slot_id) REFERENCES roadmap_plan_slots(id)', 'SELECT 1');
PREPARE add_gym_slot_fk FROM @migration; EXECUTE add_gym_slot_fk; DEALLOCATE PREPARE add_gym_slot_fk;

SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'workout_sessions' AND constraint_name = 'fk_workout_roadmap');
SET @migration = IF(@constraint_exists = 0, 'ALTER TABLE workout_sessions ADD CONSTRAINT fk_workout_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)', 'SELECT 1');
PREPARE add_gym_roadmap_fk FROM @migration; EXECUTE add_gym_roadmap_fk; DEALLOCATE PREPARE add_gym_roadmap_fk;

ALTER TABLE workout_sessions MODIFY COLUMN completed_at TIMESTAMP NULL;
