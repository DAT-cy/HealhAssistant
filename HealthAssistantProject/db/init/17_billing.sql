USE health_assistant;

CREATE TABLE IF NOT EXISTS billing_plans (
    code VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    duration_days INT NOT NULL,
    features_json TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (code),
    CONSTRAINT chk_billing_plan_price CHECK (price_minor >= 0),
    CONSTRAINT chk_billing_plan_duration CHECK (duration_days >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO billing_plans (code, name, price_minor, currency, duration_days, features_json, enabled)
VALUES ('FREE', 'Free', 0, 'USD', 0, '[]', TRUE),
       ('PREMIUM_30D', 'Premium · 30 ngày', 499, 'USD', 30,
        '["AI_PLAN_RESCHEDULE","AI_PERSONAL_ASSISTANT","AI_GYM_CAMERA"]', TRUE)
ON DUPLICATE KEY UPDATE code = VALUES(code);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    transaction_ref VARCHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    plan_code VARCHAR(40) NOT NULL,
    provider VARCHAR(12) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
    provider_status VARCHAR(40) NULL,
    provider_order_id VARCHAR(160) NULL,
    provider_payment_id VARCHAR(160) NULL,
    provider_subscription_id VARCHAR(160) NULL,
    checkout_url VARCHAR(1200) NULL,
    amount_minor BIGINT NOT NULL,
    currency CHAR(3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at TIMESTAMP NULL,
    failure_code VARCHAR(80) NULL,
    row_version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_transaction_ref (transaction_ref),
    UNIQUE KEY uk_payment_provider_order (provider, provider_order_id),
    UNIQUE KEY uk_payment_provider_payment (provider, provider_payment_id),
    KEY idx_payment_user_created (user_id, created_at),
    KEY idx_payment_status (status, updated_at),
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_payment_plan FOREIGN KEY (plan_code) REFERENCES billing_plans(code),
    CONSTRAINT chk_payment_provider CHECK (provider IN ('STRIPE','PAYPAL')),
    CONSTRAINT chk_payment_status CHECK (status IN ('PENDING','PAID','FAILED','CANCELLED','EXPIRED','REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    plan_code VARCHAR(40) NOT NULL,
    payment_transaction_id BIGINT NOT NULL,
    provider VARCHAR(12) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP NULL,
    refunded_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_subscription_transaction (payment_transaction_id),
    KEY idx_subscription_user_status_end (user_id, status, ends_at),
    CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id),
    CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_code) REFERENCES billing_plans(code),
    CONSTRAINT fk_subscription_payment FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id),
    CONSTRAINT chk_subscription_provider CHECK (provider IN ('STRIPE','PAYPAL')),
    CONSTRAINT chk_subscription_status CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED','REFUNDED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_provider_events (
    id BIGINT NOT NULL AUTO_INCREMENT,
    provider VARCHAR(12) NOT NULL,
    event_id VARCHAR(200) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload_sha256 CHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'RECEIVED',
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_event_provider_id (provider, event_id),
    KEY idx_payment_event_status (status, received_at),
    CONSTRAINT chk_payment_event_status CHECK (status IN ('RECEIVED','PROCESSED','IGNORED','FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
