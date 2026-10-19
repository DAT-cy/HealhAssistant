-- Schema tối thiểu cho app khởi động được.
--
-- Spring Boot đang chạy với `spring.jpa.hibernate.ddl-auto: update`, nên các bảng
-- sẽ tự được tạo/cập nhật khi app lên. File này chỉ đảm bảo có bảng `tbl_users`
-- sẵn sàng trước khi app kết nối, và khai báo đúng tên cột mà entity User +
-- BaseEntity sử dụng.
--
-- MySQL: Script này được MySQL chạy tự động trong container `health-assistant-mysql`.

CREATE DATABASE IF NOT EXISTS health_assistant
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE health_assistant;

CREATE TABLE IF NOT EXISTS tbl_users
(
    user_id    BIGINT       NOT NULL AUTO_INCREMENT,
    username   VARCHAR(50)  NOT NULL,
    password   VARCHAR(255) NOT NULL,
    enable     BIT(1)       NULL,
    is_deleted BIT(1)       NULL,
    role       VARCHAR(20)  NOT NULL,
    created_at DATETIME     NULL,
    created_id VARCHAR(50)  NULL,
    updated_at DATETIME     NULL,
    updated_id VARCHAR(50)  NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_tbl_users_username (username)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles
(
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    goal            VARCHAR(40)  NOT NULL,
    activity_level  VARCHAR(40)  NOT NULL,
    gender          VARCHAR(10)  NULL,
    age             INT          NULL,
    height_cm       DOUBLE       NULL,
    weight_kg       DOUBLE       NULL,
    restrictions    VARCHAR(1000) NULL,
    pain_areas      VARCHAR(1000) NULL,
    avatar_url      VARCHAR(1000) NULL,
    avatar_public_id VARCHAR(255) NULL,
    consent         BIT(1)       NOT NULL,
    updated_at      TIMESTAMP    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_profile_user (user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posture_reports
(
    id                          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id                     BIGINT       NOT NULL,
    view                        VARCHAR(10)  NOT NULL,
    reliable                    BIT(1)       NOT NULL,
    shoulder_imbalance_degrees  DOUBLE       NOT NULL,
    pelvic_tilt_degrees         DOUBLE       NOT NULL,
    forward_head_degrees        DOUBLE       NOT NULL,
    findings                    VARCHAR(4000) NULL,
    recommendations             VARCHAR(4000) NULL,
    created_at                  TIMESTAMP    NOT NULL,
    PRIMARY KEY (id),
    KEY idx_posture_user_created (user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roadmaps
(
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    user_id      BIGINT       NOT NULL,
    title        VARCHAR(160) NOT NULL,
    overview     TEXT         NULL,
    weekly_plan  MEDIUMTEXT   NULL,
    safety_notes TEXT         NULL,
    source       VARCHAR(30)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    start_date   DATE         NULL,
    duration_weeks INT        NULL,
    created_at   TIMESTAMP    NOT NULL,
    PRIMARY KEY (id),
    KEY idx_roadmap_user_created (user_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workout_sessions
(
    id           BIGINT      NOT NULL AUTO_INCREMENT,
    user_id      BIGINT      NOT NULL,
    exercise     VARCHAR(40) NOT NULL,
    reps         INT         NOT NULL,
    completed_at TIMESTAMP   NOT NULL,
    PRIMARY KEY (id),
    KEY idx_workout_user_completed (user_id, completed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS daily_plans
(
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    user_id      BIGINT       NOT NULL,
    plan_date    DATE         NOT NULL,
    title        VARCHAR(160) NOT NULL,
    duration     VARCHAR(40)  NOT NULL,
    activities   TEXT         NOT NULL,
    safety_notes TEXT         NOT NULL,
    source       VARCHAR(40)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_daily_plan_user_date (user_id, plan_date)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
