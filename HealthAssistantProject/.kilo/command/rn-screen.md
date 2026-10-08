---
description: Viết một màn hình React Native của app Health Assistant đúng chuẩn skill
agent: code
---

Hãy load skill `rn-health-assistant` trước khi bắt đầu, rồi đọc `references/` liên quan tới màn hình cần làm.

Viết màn hình sau: **$ARGUMENTS**

## Quy trình

1. **Đọc backend trước.** Xác định endpoint nào phục vụ màn hình này và đọc DTO/controller Java tương ứng để lấy shape chính xác. Nếu endpoint chưa tồn tại trong `src/main/java/health_assistant/`, nói rõ và dựng service local fallback có nhãn nguồn dữ liệu.
2. **Khai báo types** trong `src/api/types.ts`, khớp 1-1 với DTO Java.
3. **Viết service** trong `src/api/services/`, chỉ gọi qua `apiClient`, tự bóc envelope, ném `ApiError`.
4. **Viết hook** trong `src/hooks/`, dùng TanStack Query nếu là dữ liệu server, Zustand nếu là trạng thái client.
5. **Viết UI** trong `src/features/<ten-tinh-nang>/`, dùng component gốc và token từ `src/theme/tokens.ts`.
6. **Chuỗi tiếng Việt** đưa vào `src/i18n/vi.ts`, không hardcode trong component.
7. **Đăng ký route** trong `app/`, giữ route file mỏng.

## Bắt buộc có trong màn hình

- Trạng thái loading, empty, error, success với dữ liệu thật từ API.
- Xử lý 401 một lần ở tầng client, không lặp lại trong màn hình.
- Bám lỗi validation của server (`data` là map field → message) vào đúng trường form.
- Tuân thủ visibility gate và quy tắc an toàn nếu màn hình liên quan tư thế, đau đau hoặc tập luyện.
- Nhãn tiếng Việt đầy đủ, có dấu.
- Accessibility: `accessibilityLabel` tiếng Việt, `accessibilityRole`, touch target tối thiểu 44x44.

## Cấm

- Gọi `fetch` trực tiếp trong component.
- Dùng `any`, hoặc ép kiểu không kiểm tra.
- Hardcode secret, URL production, magic number cho ngưỡng.
- Dựng dữ liệu giả mà không ghi nhãn nguồn.
- Để màn hình trắng khi endpoint lỗi.

## Xác minh

Chạy typecheck, lint và test liên quan. Báo cáo: file đã tạo/sửa, endpoint dùng, trạng thái nào đã xử lý, cách kiểm chứng thủ công, và phần nào còn phụ thuộc backend chưa có.
