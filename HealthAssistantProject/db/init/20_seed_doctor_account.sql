USE health_assistant;

ALTER TABLE tbl_users MODIFY COLUMN role VARCHAR(20) NOT NULL;

-- Test doctor account for local development.
-- username: doctor
-- password: password
-- BCrypt hash generated for the password above.
INSERT INTO tbl_users (username, password, email, display_name, enable, is_deleted, email_verified, auth_version, role,
                       created_at, updated_at)
SELECT 'doctor', '$2a$10$8iSA02MrDalkgY364b9ZUemt4nOAv9CuIDqzQDGaWaIE0TCX/ouW6',
       'doctor@healthassistant.local', 'Bác sĩ tổng quát', b'1', b'0', TRUE, 0, 'ROLE_DOCTOR', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM tbl_users WHERE username = 'doctor');

INSERT INTO doctor_profiles (user_id, full_name, specialty, degrees, years_experience, bio, active, updated_at)
SELECT u.user_id, 'Bác sĩ tổng quát', 'Nội tổng quát', 'MD', 5,
       'Tài khoản bác sĩ dùng cho môi trường phát triển.', b'1', NOW()
FROM tbl_users u
WHERE u.username = 'doctor'
  AND NOT EXISTS (SELECT 1 FROM doctor_profiles p WHERE p.user_id = u.user_id);
