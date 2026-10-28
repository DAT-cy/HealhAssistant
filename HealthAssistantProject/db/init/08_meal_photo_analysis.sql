USE health_assistant;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'meal_date');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN meal_date DATE NULL AFTER logged_at', 'SELECT 1');
PREPARE add_meal_date FROM @migration; EXECUTE add_meal_date; DEALLOCATE PREPARE add_meal_date;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'reviewed_at');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN reviewed_at DATETIME NULL AFTER logged_at', 'SELECT 1');
PREPARE add_reviewed_at FROM @migration; EXECUTE add_reviewed_at; DEALLOCATE PREPARE add_reviewed_at;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'roadmap_id');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN roadmap_id BIGINT NULL AFTER user_id', 'SELECT 1');
PREPARE add_meal_roadmap FROM @migration; EXECUTE add_meal_roadmap; DEALLOCATE PREPARE add_meal_roadmap;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'plan_day_index');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN plan_day_index SMALLINT NULL AFTER roadmap_id', 'SELECT 1');
PREPARE add_plan_day FROM @migration; EXECUTE add_plan_day; DEALLOCATE PREPARE add_plan_day;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'planned_meal');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN planned_meal VARCHAR(240) NULL AFTER notes', 'SELECT 1');
PREPARE add_planned_meal FROM @migration; EXECUTE add_planned_meal; DEALLOCATE PREPARE add_planned_meal;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'dish_name');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN dish_name VARCHAR(180) NULL AFTER planned_meal', 'SELECT 1');
PREPARE add_dish_name FROM @migration; EXECUTE add_dish_name; DEALLOCATE PREPARE add_dish_name;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'portion_notes');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN portion_notes VARCHAR(500) NULL AFTER dish_name', 'SELECT 1');
PREPARE add_portion_notes FROM @migration; EXECUTE add_portion_notes; DEALLOCATE PREPARE add_portion_notes;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'ingredients');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN ingredients VARCHAR(500) NULL AFTER portion_notes', 'SELECT 1');
PREPARE add_ingredients FROM @migration; EXECUTE add_ingredients; DEALLOCATE PREPARE add_ingredients;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'photo_url');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN photo_url VARCHAR(1000) NULL AFTER ingredients', 'SELECT 1');
PREPARE add_photo_url FROM @migration; EXECUTE add_photo_url; DEALLOCATE PREPARE add_photo_url;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'photo_public_id');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN photo_public_id VARCHAR(255) NULL AFTER photo_url', 'SELECT 1');
PREPARE add_photo_public_id FROM @migration; EXECUTE add_photo_public_id; DEALLOCATE PREPARE add_photo_public_id;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'analysis_json');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN analysis_json LONGTEXT NULL AFTER photo_public_id', 'SELECT 1');
PREPARE add_analysis_json FROM @migration; EXECUTE add_analysis_json; DEALLOCATE PREPARE add_analysis_json;

SET @column_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND column_name = 'recommendation_source');
SET @migration = IF(@column_exists = 0, 'ALTER TABLE meal_logs ADD COLUMN recommendation_source VARCHAR(30) NULL AFTER analysis_json', 'SELECT 1');
PREPARE add_recommendation_source FROM @migration; EXECUTE add_recommendation_source; DEALLOCATE PREPARE add_recommendation_source;

SET @index_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'meal_logs' AND index_name = 'idx_meal_logs_roadmap_day');
SET @migration = IF(@index_exists = 0, 'CREATE INDEX idx_meal_logs_roadmap_day ON meal_logs (user_id, roadmap_id, plan_day_index, meal_date)', 'SELECT 1');
PREPARE add_meal_plan_index FROM @migration; EXECUTE add_meal_plan_index; DEALLOCATE PREPARE add_meal_plan_index;

SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema = DATABASE() AND table_name = 'meal_logs' AND constraint_name = 'fk_meal_logs_roadmap');
SET @migration = IF(@constraint_exists = 0, 'ALTER TABLE meal_logs ADD CONSTRAINT fk_meal_logs_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)', 'SELECT 1');
PREPARE add_meal_roadmap_fk FROM @migration; EXECUTE add_meal_roadmap_fk; DEALLOCATE PREPARE add_meal_roadmap_fk;
