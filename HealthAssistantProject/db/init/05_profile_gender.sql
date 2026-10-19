USE health_assistant;

SET @has_profile_gender = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'user_profiles'
      AND column_name = 'gender'
);
SET @profile_gender_ddl = IF(
    @has_profile_gender = 0,
    'ALTER TABLE user_profiles ADD COLUMN gender VARCHAR(10) NULL AFTER activity_level',
    'SELECT 1'
);
PREPARE add_profile_gender FROM @profile_gender_ddl;
EXECUTE add_profile_gender;
DEALLOCATE PREPARE add_profile_gender;
