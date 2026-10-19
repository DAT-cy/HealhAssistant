USE health_assistant;

-- Normalized domain tables. Existing auth/profile/roadmap/workout/daily-plan tables stay intact.
CREATE TABLE IF NOT EXISTS health_goals (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    goal_type VARCHAR(30) NOT NULL,
    start_weight_kg DECIMAL(5,2) NULL,
    target_weight_kg DECIMAL(5,2) NULL,
    start_date DATE NOT NULL,
    target_date DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_health_goals_user_status (user_id, status),
    CONSTRAINT fk_health_goals_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS availability_slots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    day_of_week TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    activity_type VARCHAR(30) NOT NULL,
    location_type VARCHAR(30) NOT NULL,
    equipment_notes VARCHAR(500) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_availability_user_day (user_id, day_of_week, is_active),
    CONSTRAINT fk_availability_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT chk_availability_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT chk_availability_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exercise_catalog (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(160) NOT NULL,
    muscle_group VARCHAR(80) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    equipment VARCHAR(160) NULL,
    instructions TEXT NOT NULL,
    safety_notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    UNIQUE KEY uk_exercise_catalog_code (code),
    KEY idx_exercise_catalog_group (muscle_group, difficulty, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS food_catalog (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(180) NOT NULL,
    serving_name VARCHAR(100) NOT NULL,
    serving_grams DECIMAL(8,2) NOT NULL,
    calories_kcal DECIMAL(8,2) NOT NULL,
    protein_g DECIMAL(8,2) NOT NULL DEFAULT 0,
    carbohydrates_g DECIMAL(8,2) NOT NULL DEFAULT 0,
    fat_g DECIMAL(8,2) NOT NULL DEFAULT 0,
    source VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id),
    KEY idx_food_catalog_name (name, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    logged_at DATETIME NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'EATEN',
    notes VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_meal_logs_user_date (user_id, logged_at),
    CONSTRAINT fk_meal_logs_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS meal_log_items (
    id BIGINT NOT NULL AUTO_INCREMENT,
    meal_log_id BIGINT NOT NULL,
    food_id BIGINT NULL,
    food_name_snapshot VARCHAR(180) NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    serving_grams DECIMAL(8,2) NOT NULL,
    calories_kcal DECIMAL(8,2) NOT NULL,
    protein_g DECIMAL(8,2) NOT NULL DEFAULT 0,
    carbohydrates_g DECIMAL(8,2) NOT NULL DEFAULT 0,
    fat_g DECIMAL(8,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_meal_items_log (meal_log_id),
    CONSTRAINT fk_meal_items_log FOREIGN KEY (meal_log_id) REFERENCES meal_logs(id) ON DELETE CASCADE,
    CONSTRAINT fk_meal_items_food FOREIGN KEY (food_id) REFERENCES food_catalog(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS weight_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    measured_on DATE NOT NULL,
    weight_kg DECIMAL(5,2) NOT NULL,
    note VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_weight_log_user_date (user_id, measured_on),
    CONSTRAINT fk_weight_log_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT chk_weight_positive CHECK (weight_kg > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_adjustments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    roadmap_id BIGINT NULL,
    trigger_type VARCHAR(40) NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    proposed_changes JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    KEY idx_plan_adjustments_user_status (user_id, status, created_at),
    CONSTRAINT fk_plan_adjustments_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_plan_adjustments_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
