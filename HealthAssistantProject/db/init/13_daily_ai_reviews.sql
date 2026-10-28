USE health_assistant;

CREATE TABLE IF NOT EXISTS daily_ai_reviews
(
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    user_id            BIGINT       NOT NULL,
    roadmap_id         BIGINT       NOT NULL,
    review_date        DATE         NOT NULL,
    status             VARCHAR(24)  NOT NULL,
    snapshot_json      LONGTEXT     NOT NULL,
    review_json        LONGTEXT     NOT NULL,
    proposal_json      LONGTEXT     NULL,
    applied_roadmap_id BIGINT       NULL,
    decision_reason    VARCHAR(500) NULL,
    source             VARCHAR(20)  NOT NULL DEFAULT 'GEMINI',
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at         TIMESTAMP    NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_daily_ai_review_user_date_roadmap (user_id, review_date, roadmap_id),
    KEY idx_daily_ai_review_user_date (user_id, review_date),
    CONSTRAINT fk_daily_ai_review_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_daily_ai_review_roadmap FOREIGN KEY (roadmap_id) REFERENCES roadmaps(id),
    CONSTRAINT fk_daily_ai_review_applied_roadmap FOREIGN KEY (applied_roadmap_id) REFERENCES roadmaps(id),
    CONSTRAINT chk_daily_ai_review_status CHECK (status IN ('AWAITING_CONFIRMATION', 'NO_CHANGE', 'ACCEPTED', 'REJECTED')),
    CONSTRAINT chk_daily_ai_review_source CHECK (source IN ('GEMINI', 'RULE_FALLBACK'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
