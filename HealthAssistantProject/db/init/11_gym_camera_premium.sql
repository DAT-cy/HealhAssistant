USE health_assistant;

CREATE TABLE IF NOT EXISTS feature_entitlements
(
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NOT NULL,
    feature_code    VARCHAR(50)  NOT NULL,
    enabled         BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP    NULL,
    revoked_at      TIMESTAMP    NULL,
    grant_reference VARCHAR(120) NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_entitlement_user_feature (user_id, feature_code, enabled, expires_at),
    CONSTRAINT fk_feature_entitlement_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO exercise_catalog (code, name, muscle_group, difficulty, equipment, instructions, safety_notes, is_active)
VALUES
    ('BODYWEIGHT_SQUAT', 'Squat không tạ', 'Chân và mông', 'BEGINNER', 'Không cần',
     'Đứng hai chân rộng bằng vai; đẩy hông ra sau, gối cùng hướng mũi chân; hạ trong biên độ thoải mái rồi đứng lên có kiểm soát.',
     'Giữ thân người ổn định; giảm độ sâu nếu mất thăng bằng hoặc khó chịu ở gối/hông.', TRUE),
    ('WALL_PUSH_UP', 'Chống đẩy tường', 'Ngực và tay', 'BEGINNER', 'Tường chắc chắn',
     'Đặt tay lên tường ngang ngực; thân người thành một đường thẳng; gập khuỷu đưa ngực gần tường rồi đẩy về vị trí đầu.',
     'Chọn khoảng cách dễ kiểm soát; không khóa cứng khuỷu tay.', TRUE),
    ('GLUTE_BRIDGE', 'Nâng hông', 'Mông và thân giữa', 'BEGINNER', 'Thảm',
     'Nằm ngửa, co gối và đặt bàn chân trên sàn; siết mông nâng hông đến khi thân người thẳng, rồi hạ chậm.',
     'Không ưỡn lưng quá mức; dừng nếu đau lưng hoặc hông.', TRUE),
    ('DUMBBELL_ROW', 'Kéo tạ một tay', 'Lưng và tay', 'BEGINNER', 'Tạ nhẹ, điểm tựa vững',
     'Chống tay còn lại lên điểm tựa; giữ lưng trung lập; kéo tạ về hông có kiểm soát rồi hạ chậm.',
     'Bắt đầu với tải nhẹ; không xoay vặn thân hoặc giật tạ.', TRUE),
    ('HIP_HINGE', 'Gập hông không tạ', 'Hông và gân kheo', 'BEGINNER', 'Không cần',
     'Đứng vững, gối hơi chùng; đẩy hông ra sau, giữ lưng trung lập đến khi cảm thấy căng nhẹ phía sau đùi rồi đứng thẳng.',
     'Không cố chạm sàn; dừng nếu đau lưng hoặc tê.', TRUE);
