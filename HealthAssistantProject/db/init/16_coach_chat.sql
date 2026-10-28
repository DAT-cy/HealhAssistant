USE health_assistant;

CREATE TABLE IF NOT EXISTS coach_chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    role VARCHAR(12) NOT NULL,
    message TEXT NOT NULL,
    response_source VARCHAR(30) NULL,
    sources_json TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_coach_chat_user_thread (user_id, thread_id, created_at),
    CONSTRAINT fk_coach_chat_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT chk_coach_chat_role CHECK (role IN ('USER', 'ASSISTANT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
