USE health_assistant;

-- Preview schedules are temporary; activated time slots are normalized below.
CREATE TABLE IF NOT EXISTS roadmap_previews
(
    id                 VARCHAR(36) NOT NULL,
    user_id            BIGINT      NOT NULL,
    profile_updated_at TIMESTAMP   NOT NULL,
    options_json       LONGTEXT    NOT NULL,
    schedule_json      LONGTEXT    NULL,
    expires_at         TIMESTAMP   NOT NULL,
    consumed_at        TIMESTAMP   NULL,
    PRIMARY KEY (id),
    KEY idx_roadmap_preview_owner (user_id, expires_at),
    CONSTRAINT fk_roadmap_preview_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @schedule_column_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'roadmap_previews' AND column_name = 'schedule_json'
);
SET @schedule_column_migration = IF(@schedule_column_exists = 0,
    'ALTER TABLE roadmap_previews ADD COLUMN schedule_json LONGTEXT NULL AFTER options_json', 'SELECT 1');
PREPARE add_schedule_column FROM @schedule_column_migration;
EXECUTE add_schedule_column;
DEALLOCATE PREPARE add_schedule_column;

CREATE TABLE IF NOT EXISTS roadmap_plan_slots
(
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    roadmap_id       BIGINT       NOT NULL,
    day_index        SMALLINT     NOT NULL,
    session_period   VARCHAR(12)  NOT NULL,
    start_time       TIME         NOT NULL,
    end_time         TIME         NOT NULL,
    duration_minutes INT          NOT NULL,
    activity_type    VARCHAR(20)  NOT NULL,
    activity         VARCHAR(100) NOT NULL,
    status           VARCHAR(16)  NOT NULL DEFAULT 'UPCOMING',
    started_at       TIMESTAMP    NULL,
    completed_at     TIMESTAMP    NULL,
    actual_duration_minutes INT   NULL,
    notes            VARCHAR(500) NULL,
    skip_reason      VARCHAR(300) NULL,
    created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_roadmap_slots_day (roadmap_id, day_index, session_period),
    KEY idx_roadmap_slots_status (roadmap_id, status),
    CONSTRAINT fk_roadmap_slot_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id) ON DELETE CASCADE,
    CONSTRAINT chk_roadmap_slot_day CHECK (day_index >= 0),
    CONSTRAINT chk_roadmap_slot_time CHECK (end_time > start_time),
    CONSTRAINT chk_roadmap_slot_duration CHECK (duration_minutes BETWEEN 15 AND 240),
    CONSTRAINT chk_roadmap_slot_period CHECK (session_period IN ('MORNING', 'AFTERNOON', 'EVENING')),
    CONSTRAINT chk_roadmap_slot_status CHECK (status IN ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
