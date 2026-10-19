USE health_assistant;

-- Apply once to existing databases; on fresh installs this follows the original schema.
ALTER TABLE tbl_users
    MODIFY username VARCHAR(254) NOT NULL,
    MODIFY password VARCHAR(255) NULL,
    ADD COLUMN email VARCHAR(254) NULL,
    ADD COLUMN display_name VARCHAR(120) NULL;

UPDATE tbl_users
SET email = LOWER(username)
WHERE email IS NULL AND LOWER(username) LIKE '%@gmail.com';

ALTER TABLE tbl_users
    ADD UNIQUE KEY uk_tbl_users_email (email);

CREATE TABLE IF NOT EXISTS auth_identities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    provider_email VARCHAR(254) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_auth_identity_provider_subject (provider, provider_subject),
    UNIQUE KEY uk_auth_identity_user_provider (user_id, provider),
    CONSTRAINT fk_auth_identity_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
