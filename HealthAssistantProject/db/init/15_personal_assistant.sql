USE health_assistant;

CREATE TABLE IF NOT EXISTS personal_assistant_profiles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    fitness_goal VARCHAR(500) NOT NULL,
    current_condition VARCHAR(500) NULL,
    fitness_level VARCHAR(120) NULL,
    diet_preferences VARCHAR(1000) NULL,
    daily_routine VARCHAR(1000) NULL,
    available_training_time VARCHAR(500) NULL,
    available_equipment VARCHAR(500) NULL,
    health_limits VARCHAR(1000) NULL,
    personal_rules VARCHAR(3000) NULL,
    additional_guidance VARCHAR(2000) NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id), UNIQUE KEY uk_personal_assistant_profile_user (user_id),
    CONSTRAINT fk_personal_assistant_profile_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_knowledge_documents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(1000) NULL,
    content_type VARCHAR(80) NOT NULL,
    original_filename VARCHAR(255) NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(700) NULL,
    content_sha256 VARCHAR(64) NOT NULL,
    extracted_text LONGTEXT NULL,
    chunk_count INT NOT NULL DEFAULT 0,
    processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    processing_error VARCHAR(500) NULL,
    source_type VARCHAR(12) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id), KEY idx_personal_doc_owner_status (user_id, processing_status),
    KEY idx_personal_doc_created (user_id, created_at),
    CONSTRAINT fk_personal_doc_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT chk_personal_doc_status CHECK (processing_status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
    CONSTRAINT chk_personal_doc_source CHECK (source_type IN ('PDF','TEXT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_knowledge_chunks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    document_id BIGINT NOT NULL,
    chunk_index INT NOT NULL,
    content MEDIUMTEXT NOT NULL,
    PRIMARY KEY (id), KEY idx_personal_chunk_doc (document_id, chunk_index),
    CONSTRAINT fk_personal_chunk_document FOREIGN KEY (document_id) REFERENCES personal_knowledge_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_assistant_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    thread_id VARCHAR(36) NOT NULL,
    role VARCHAR(12) NOT NULL,
    content TEXT NOT NULL,
    sources_json TEXT NULL,
    response_source VARCHAR(24) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_personal_message_user_thread (user_id, thread_id, created_at),
    CONSTRAINT fk_personal_message_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT chk_personal_message_role CHECK (role IN ('USER','ASSISTANT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
