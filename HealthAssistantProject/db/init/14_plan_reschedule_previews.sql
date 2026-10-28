USE health_assistant;

CREATE TABLE IF NOT EXISTS plan_reschedule_previews
(
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    preview_id            VARCHAR(36)  NOT NULL,
    user_id               BIGINT       NOT NULL,
    roadmap_id            BIGINT       NOT NULL,
    base_version_number   INT          NULL,
    scope                 VARCHAR(20)  NOT NULL,
    target_date           DATE         NOT NULL,
    status                VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    request_json          LONGTEXT     NOT NULL,
    snapshot_json         LONGTEXT     NOT NULL,
    proposal_json         LONGTEXT     NOT NULL,
    proposal_summary      VARCHAR(1000) NOT NULL,
    proposal_differences  LONGTEXT     NOT NULL,
    safety_notes          LONGTEXT     NOT NULL,
    expires_at            TIMESTAMP    NOT NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at            TIMESTAMP    NULL,
    applied_roadmap_id    BIGINT       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reschedule_preview_id (preview_id),
    KEY idx_reschedule_preview_user_status (user_id, status, created_at),
    KEY idx_reschedule_preview_expiry (expires_at),
    CONSTRAINT fk_reschedule_preview_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_reschedule_preview_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id),
    CONSTRAINT fk_reschedule_applied_roadmap FOREIGN KEY (applied_roadmap_id) REFERENCES roadmaps(id),
    CONSTRAINT chk_reschedule_preview_scope CHECK (scope IN ('SINGLE_SLOT', 'DAY', 'REMAINING_DAYS', 'NEW_VERSION')),
    CONSTRAINT chk_reschedule_preview_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
