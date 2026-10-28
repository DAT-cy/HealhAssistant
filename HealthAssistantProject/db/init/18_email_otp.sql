USE health_assistant;

SET @email_verified_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'tbl_users' AND column_name = 'email_verified'
);
SET @email_verified_migration = IF(@email_verified_exists = 0,
    'ALTER TABLE tbl_users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE AFTER is_deleted', 'SELECT 1');
PREPARE add_email_verified FROM @email_verified_migration;
EXECUTE add_email_verified;
DEALLOCATE PREPARE add_email_verified;

SET @auth_version_exists = (
    SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'tbl_users' AND column_name = 'auth_version'
);
SET @auth_version_migration = IF(@auth_version_exists = 0,
    'ALTER TABLE tbl_users ADD COLUMN auth_version INT NOT NULL DEFAULT 0 AFTER email_verified', 'SELECT 1');
PREPARE add_auth_version FROM @auth_version_migration;
EXECUTE add_auth_version;
DEALLOCATE PREPARE add_auth_version;

ALTER TABLE tbl_users MODIFY COLUMN username VARCHAR(254) NOT NULL;

UPDATE tbl_users SET email_verified = TRUE WHERE email_verified IS NULL;

CREATE TABLE IF NOT EXISTS otp_challenges (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    code_hash VARCHAR(100) NOT NULL,
    pending_password_hash VARCHAR(100) NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    consumed_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    KEY idx_otp_owner_purpose_created (email, purpose, created_at),
    KEY idx_otp_expiry (expires_at),
    CONSTRAINT chk_otp_purpose CHECK (purpose IN ('REGISTER','RESET_PASSWORD')),
    CONSTRAINT chk_otp_status CHECK (status IN ('PENDING','USED','SUPERSEDED','LOCKED','EXPIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_rate_limit_buckets (
    bucket_hash CHAR(64) NOT NULL,
    window_started_at TIMESTAMP NOT NULL,
    last_requested_at TIMESTAMP NULL,
    request_count INT NOT NULL DEFAULT 0,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket_hash),
    KEY idx_otp_rate_window (window_started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_grants (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_password_reset_token_hash (token_hash),
    KEY idx_reset_grant_email_expiry (email, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
