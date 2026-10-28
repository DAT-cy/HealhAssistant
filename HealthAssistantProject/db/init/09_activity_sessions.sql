USE health_assistant;

CREATE TABLE IF NOT EXISTS activity_sessions
(
    id                   BIGINT       NOT NULL AUTO_INCREMENT,
    user_id              BIGINT       NOT NULL,
    roadmap_id           BIGINT       NOT NULL,
    plan_slot_id         BIGINT       NOT NULL,
    activity_type        VARCHAR(20)  NOT NULL,
    status               VARCHAR(16)  NOT NULL DEFAULT 'IN_PROGRESS',
    started_at           TIMESTAMP    NOT NULL,
    ended_at             TIMESTAMP    NULL,
    paused_at            TIMESTAMP    NULL,
    paused_seconds        BIGINT       NOT NULL DEFAULT 0,
    duration_seconds     BIGINT       NULL,
    distance_meters      DOUBLE       NULL,
    steps                INT          NULL,
    pace_seconds_per_km  DOUBLE       NULL,
    average_speed_kmh    DOUBLE       NULL,
    distance_source      VARCHAR(16)  NOT NULL DEFAULT 'UNAVAILABLE',
    steps_source         VARCHAR(20)  NOT NULL DEFAULT 'UNAVAILABLE',
    duration_source      VARCHAR(12)  NOT NULL DEFAULT 'TIMER',
    gps_sample_count     INT          NOT NULL DEFAULT 0,
    notes                VARCHAR(500) NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    row_version          BIGINT       NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_activity_session_user_started (user_id, started_at),
    KEY idx_activity_session_slot (plan_slot_id, status),
    CONSTRAINT fk_activity_session_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_activity_session_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id),
    CONSTRAINT fk_activity_session_slot FOREIGN KEY (plan_slot_id) REFERENCES roadmap_plan_slots(id),
    CONSTRAINT chk_activity_session_status CHECK (status IN ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_activity_session_type CHECK (activity_type IN ('RUNNING', 'WALKING')),
    CONSTRAINT chk_activity_session_distance CHECK (distance_meters IS NULL OR distance_meters BETWEEN 0 AND 500000),
    CONSTRAINT chk_activity_session_steps CHECK (steps IS NULL OR steps BETWEEN 0 AND 200000),
    CONSTRAINT chk_activity_session_duration CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 0 AND 86400),
    CONSTRAINT chk_activity_session_sources CHECK (
        distance_source IN ('GPS', 'MANUAL', 'UNAVAILABLE') AND
        steps_source IN ('SENSOR', 'MANUAL', 'UNAVAILABLE') AND
        duration_source IN ('TIMER', 'MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
