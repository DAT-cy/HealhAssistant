---
description: Rà soát code React Native của app Health Assistant theo tiêu chuẩn skill
agent: code
---

Hãy load skill `rn-health-assistant` trước khi bắt đầu, rồi đọc `references/`.

Review phạm vi: **$ARGUMENTS**

## Cách review

Đây là review, không phải viết lại. Với mỗi file trong phạm vi:

1. Đọc kỹ, không đoán. Đối chiếu với DTO Java khi có liên quan network.
2. Kiểm tra theo thứ tự ưu tiên: an toàn người dùng, đúng contract API, sau đó mới đến chất lượng code.
3. Mỗi phát hiện phải kèm `file:line` và mức độ.

## Checklist

**Quy tắc sản phẩm (báo cáo nghiêm trọng nếu vi phạm)**
- [ ] Hiển thị kết luận tư thế khi `reliable` là false
- [ ] Từ chẩn đoán, điều trị, bệnh, chấn thương trong chuỗi UI
- [ ] Thiếu đường thoát dừng bài hoặc thiếu hỏi mức đau ở luồng tập
- [ ] Gọi LLM hoặc API mạng ở mỗi frame camera
- [ ] Camera loop phụ thuộc mạng
- [ ] Dữ liệu demo giả không có nhãn nguồn
- [ ] Thiếu disclaimer không thay thế chẩn đoán y khoa

**API contract**
- [ ] Envelope `DefaultRes` được bóc đúng, đọc `data`
- [ ] Type khớp DTO Java, đặc biệt `Point3D` và `WorkoutFeedback`
- [ ] `/workout-engine/track` truyền tham số qua query string, không phải body
- [ ] `/coach/roadmap` phân biệt `source: 'fallback'`
- [ ] Signup có validate Gmail ở client
- [ ] Xử lý 401 đúng một lần ở tầng client
- [ ] Lỗi validation bám đúng trường form

**Kiến trúc**
- [ ] Component gọi `fetch` trực tiếp
- [ ] Lớp bị xuyên vòng: UI dùng service, service dùng client
- [ ] Lặp query key thay vì dùng `queryKeys`
- [ ] Rò rỉ token ra log hoặc AsyncStorage thay vì SecureStore

**Chất lượng**
- [ ] `any` hoặc ép kiểu không kiểm tra
- [ ] Magic number cho ngưỡng (`0.5`, `3.0`, `10.0`, `95`, `155`)
- [ ] Hardcode secret, API key, URL production
- [ ] Chữ tiếng Việt thiếu dấu
- [ ] setState mỗi frame trong luồng pose
- [ ] Thiếu test cho logic thuần (smoothing, FSM, landmarks, thresholds)

**Accessibility**
- [ ] Thiếu `accessibilityLabel` tiếng Việt
- [ ] Truyền đạt nghĩa bằng màu đơn độc
- [ ] Touch target nhỏ hơn 44x44
- [ ] Contrast dưới 4.5:1

## Đầu ra

Bảng: mức độ, file:line, vấn đề, cách sửa. Mức độ: `nghiêm trọng`, `cao`, `trung bình`, `thấp`.

Cuối bảng nêu các điểm đã làm đúng để không bỏ sót phần tốt. Nếu có mục nào trong checklist không áp dụng, ghi rõ lý do thay vì im lặng.
