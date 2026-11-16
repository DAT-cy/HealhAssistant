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

