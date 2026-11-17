USE health_assistant;

CREATE TABLE IF NOT EXISTS doctor_profiles (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    specialty VARCHAR(160) NOT NULL,
    degrees TEXT NULL,
    years_experience INT NOT NULL DEFAULT 0,
    bio TEXT NULL,
    active BIT(1) NOT NULL DEFAULT b'1',
    last_seen_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_doctor_profile_user (user_id),
    KEY idx_doctor_active_seen (active, last_seen_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_diseases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(160) NOT NULL,
    specialty VARCHAR(120) NULL,
    description TEXT NULL,
    symptoms TEXT NULL,
    causes TEXT NULL,
    risk_factors TEXT NULL,
    care_guidance TEXT NULL,
    reference_source VARCHAR(1000) NULL,
    severity VARCHAR(12) NOT NULL DEFAULT 'LOW',
    doctor_required BIT(1) NOT NULL DEFAULT b'0',
    roadmap_confirmation_required BIT(1) NOT NULL DEFAULT b'0',
    ai_allowed BIT(1) NOT NULL DEFAULT b'1',
    priority INT NOT NULL DEFAULT 50,
    special_instructions TEXT NULL,
    active BIT(1) NOT NULL DEFAULT b'1',
    updated_by BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_doctor_disease_code (code),
    KEY idx_disease_active_specialty (active, specialty)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS disease_policy_audits (
    id BIGINT NOT NULL AUTO_INCREMENT,
    disease_id BIGINT NOT NULL,
    version INT NOT NULL,
    changed_by BIGINT NOT NULL,
    reason VARCHAR(500) NOT NULL,
    before_json TEXT NULL,
    after_json TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPLIED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_disease_policy_audit_disease (disease_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_review_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    roadmap_id BIGINT NULL,
    assigned_doctor_id BIGINT NULL,
    decision VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
    priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    reason VARCHAR(2000) NOT NULL,
    disease_codes TEXT NULL,
    risk_summary TEXT NULL,
    full_text LONGTEXT NULL,
    policy_version VARCHAR(80) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    row_version BIGINT NULL,
    PRIMARY KEY (id),
    KEY idx_doctor_review_status_priority (status, priority, created_at),
    KEY idx_doctor_review_assignee (assigned_doctor_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS doctor_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    action VARCHAR(30) NOT NULL,
    note TEXT NULL,
    roadmap_version VARCHAR(80) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_doctor_reviews_request (request_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
