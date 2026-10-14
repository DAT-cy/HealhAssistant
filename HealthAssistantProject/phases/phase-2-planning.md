# Phase 2 - Profile and Roadmap Planning

## Scope

- Tạo hồ sơ tập luyện, consent, mục tiêu, chiều cao/cân nặng và giới hạn người dùng khai báo.
- Home tài khoản mới là empty state, không dựng kế hoạch hay tiến độ giả.
- Preview đúng ba phương án theo thời lượng; chưa chọn thì không ghi active.
- Activation lưu một lựa chọn, archive lựa chọn cũ trong transaction.
- Daily plan là luồng riêng; không khẳng định calories/macros nếu chưa có calculator và kiểm thử tương ứng.
- LLM đề xuất nội dung có cấu trúc; backend xác thực profile, schema và safety.

## Done criteria

- JSON schema versioned và reject output không hợp lệ.
- Có fallback plan khi LLM timeout hoặc trả dữ liệu lỗi.
- Có source AI/fallback rõ ràng cho kế hoạch.
- Home hiển thị calendar theo start date và duration; completion chỉ lấy từ workout record.
- Có prompt/schema version và trace khi được triển khai.
- Có kiểm thử hallucination, unsafe advice và output không đúng schema.
