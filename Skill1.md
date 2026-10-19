# PROMPT PHẦN 2 — MỞ RỘNG TOÀN DIỆN HEALTH ASSISTANT

## 1. Vai trò và nhiệm vụ

Bạn tiếp tục đóng vai trò Senior Software Architect, Senior Java Backend Engineer, React Native Engineer và AI Engineer.

Tôi đã có prompt nền tảng để xây dựng ứng dụng Health Assistant bằng React Native + Expo + TypeScript ở Frontend, Java + Spring Boot ở Backend, MySQL làm cơ sở dữ liệu và tích hợp AI.

Bây giờ, hãy **mở rộng dự án hiện có thành một hệ thống quản lý sức khỏe và thể lực thông minh, có nhiều nghiệp vụ liên kết, dữ liệu xuyên suốt và khả năng cá nhân hóa theo thời gian**.

Đây là yêu cầu tiếp tục phát triển dự án, không phải tạo một dự án mới.

### Nguyên tắc bắt buộc

1. Đọc toàn bộ mã nguồn hiện tại trước khi chỉnh sửa.
2. Kiểm tra các màn hình, route, API, entity, repository, service, database migration và chức năng AI đã tồn tại.
3. Tận dụng code hiện có, tránh tạo các module trùng lặp.
4. Giữ nguyên những chức năng đang hoạt động tốt.
5. Xây dựng các nghiệp vụ có luồng xử lý thực tế, không chỉ tạo UI hoặc endpoint rỗng.
6. Mọi màn hình mới phải được kết nối vào hệ thống routing hiện tại.
7. Mọi nghiệp vụ phải có API, validation, quyền truy cập và cơ chế lưu trữ phù hợp.
8. Không sử dụng mock data để thay thế nghiệp vụ thật trong các luồng production.
9. Chủ động chạy kiểm thử, sửa lỗi và tiếp tục triển khai đến khi hoàn thành phạm vi công việc.
10. Nếu có giới hạn môi trường, phải ghi rõ những gì chưa thể kiểm thử; không tuyên bố thành công khi chưa xác minh.

---

## 2. Mục tiêu mở rộng

Sau khi hoàn thành, Health Assistant phải có các khả năng:

- Quản lý sức khỏe cá nhân theo thời gian.
- Theo dõi việc thực hiện kế hoạch ăn uống và tập luyện.
- Tạo lộ trình cá nhân hóa bằng AI.
- Tự đánh giá sự khác biệt giữa kế hoạch và kết quả thực tế.
- Đề xuất điều chỉnh lộ trình dựa trên dữ liệu mới.
- Quản lý lịch tập, bữa ăn, cân nặng và thói quen.
- Lưu lịch sử phiên bản lộ trình.
- Hỏi đáp với AI dựa trên hồ sơ và knowledge base được phép sử dụng.
- Phân tích tiến độ và đưa ra báo cáo dễ hiểu.
- Nhắc nhở người dùng thực hiện các hoạt động đã lên kế hoạch.
- Quản trị nội dung sức khỏe và giám sát chất lượng AI.
- Có kiến trúc đủ rõ ràng để bổ sung thiết bị sức khỏe, huấn luyện viên và cộng đồng trong tương lai.

Không triển khai tất cả theo cách dàn trải. Hãy ưu tiên các nghiệp vụ có quan hệ trực tiếp với nhau và hoàn thiện luồng end-to-end.

---

# 3. MODULE 1 — HEALTH PROFILE & HEALTH JOURNAL

## 3.1. Hồ sơ sức khỏe mở rộng

Cho phép người dùng quản lý:

- Thông tin cá nhân cần thiết.
- Ngày sinh và các dữ liệu phục vụ đánh giá phù hợp.
- Chiều cao, cân nặng và các số đo cơ thể.
- Mục tiêu: giảm cân, duy trì cân nặng hoặc tăng cân/cải thiện thể lực.
- Mức độ vận động.
- Kinh nghiệm tập luyện.
- Địa điểm tập và thiết bị có sẵn.
- Lịch rảnh trong tuần.
- Sở thích ăn uống, dị ứng và các hạn chế liên quan.
- Các thông tin sức khỏe có ảnh hưởng đến việc lập kế hoạch.
- Mức độ sẵn sàng và giới hạn vận động do người dùng khai báo.

Yêu cầu:

- Phân biệt dữ liệu hiện tại và dữ liệu lịch sử.
- Có lịch sử cập nhật các chỉ số quan trọng.
- Cho phép cập nhật hồ sơ mà không làm mất dữ liệu cũ.
- Chỉ yêu cầu thông tin cần thiết.
- Có validation ở cả Frontend và Backend.
- Dữ liệu nhạy cảm phải được bảo vệ và chỉ người có quyền mới được truy cập.

## 3.2. Nhật ký sức khỏe hằng ngày

Xây dựng chức năng Daily Check-in.

Người dùng có thể ghi nhận:

- Cân nặng nếu có cân đo.
- Mức năng lượng.
- Thời gian và chất lượng giấc ngủ tự khai báo.
- Mức độ mệt mỏi.
- Tâm trạng nếu người dùng muốn theo dõi.
- Hoạt động thể chất.
- Tình trạng hoàn thành bữa ăn và buổi tập.
- Ghi chú tự do.
- Các thông tin khác thực sự cần cho việc điều chỉnh lộ trình.

Không bắt buộc người dùng nhập tất cả thông tin mỗi ngày.

Các chức năng cần có:

1. Check-in theo ngày.
2. Xem lại nhật ký.
3. Chỉnh sửa bản ghi.
4. Xem lịch sử.
5. Tổng hợp theo tuần và tháng.
6. Nhắc check-in nếu người dùng bật nhắc nhở.
7. Phát hiện dữ liệu thiếu hoặc bất thường để yêu cầu xác nhận.

Không tự suy diễn tình trạng bệnh từ nhật ký hoặc các chỉ số đơn lẻ.

---

# 4. MODULE 2 — ADAPTIVE AI PLANNING

Đây là module trọng tâm của toàn hệ thống.

## 4.1. Tạo kế hoạch ban đầu

AI nhận dữ liệu cần thiết từ:

- Hồ sơ sức khỏe.
- Mục tiêu.
- Lịch rảnh.
- Sở thích và hạn chế ăn uống.
- Khả năng tập luyện.
- Knowledge base phù hợp.
- Các dữ liệu lịch sử được phép sử dụng.

AI đề xuất một lộ trình có cấu trúc gồm:

- Mục tiêu và thời gian dự kiến.
- Lịch tập theo ngày.
- Kế hoạch dinh dưỡng theo ngày.
- Bữa ăn và khẩu phần.
- Bài tập, số hiệp, số lần lặp hoặc thời lượng.
- Ngày nghỉ và thời gian phục hồi.
- Các chỉ số cần theo dõi.
- Các giả định, cảnh báo và giới hạn của dự báo.

Kết quả phải được validate theo schema trước khi lưu vào database.

Không cho phép AI trả về nội dung tự do rồi lưu trực tiếp mà không kiểm tra.

## 4.2. Theo dõi kế hoạch thực tế

Mỗi ngày, hệ thống tổng hợp:

- Các bữa ăn đã ghi nhận.
- Các buổi tập đã hoàn thành, bị bỏ lỡ hoặc bị hủy.
- Cân nặng và số đo mới.
- Nhật ký sức khỏe.
- Lịch rảnh mới nếu người dùng thay đổi.
- Mức độ hoàn thành mục tiêu trong ngày.

Phân biệt rõ:

- Planned: theo kế hoạch.
- Completed: đã hoàn thành.
- Skipped: đã bỏ lỡ.
- Cancelled: đã hủy.
- Rescheduled: đã chuyển lịch.
- Adjusted: đã được điều chỉnh.

Không tự động đánh dấu hoàn thành khi người dùng chưa xác nhận.

## 4.3. Bộ máy đánh giá và điều chỉnh

Không để LLM tự quyết định tất cả.

Hãy xây dựng một workflow trong Backend:

1. Tiếp nhận sự kiện mới.
2. Kiểm tra tính hợp lệ của dữ liệu.
3. Xác định kế hoạch hiện tại và phiên bản đang áp dụng.
4. Đánh giá sai lệch giữa kế hoạch và thực tế.
5. Áp dụng các quy tắc an toàn và nghiệp vụ.
6. Xác định có cần đề xuất điều chỉnh hay không.
7. Nếu cần, cung cấp ngữ cảnh phù hợp cho AI.
8. AI trả về phương án điều chỉnh có cấu trúc.
9. Backend kiểm tra kết quả.
10. Lưu phương án thành phiên bản nháp.
11. Thông báo cho người dùng.
12. Chỉ áp dụng sau khi người dùng xác nhận.

Ví dụ nghiệp vụ:

- Người dùng bận và bỏ lỡ buổi tập.
- Người dùng muốn thay thế một món ăn.
- Người dùng cập nhật lịch rảnh.
- Người dùng liên tục không thực hiện được kế hoạch.
- Dữ liệu cân nặng thay đổi khác với xu hướng dự kiến.
- Người dùng báo mệt mỏi và cần xem xét lịch tập.
- Người dùng không có đủ nguyên liệu cho thực đơn.

Mỗi trường hợp phải có quy tắc xử lý phù hợp. Không phải sự kiện nào cũng cần gọi AI.

## 4.4. Lưu lịch sử điều chỉnh

Mỗi lần điều chỉnh phải lưu:

- Kế hoạch gốc.
- Phiên bản hiện tại.
- Phiên bản được đề xuất.
- Lý do điều chỉnh.
- Các sự kiện liên quan.
- Dữ liệu đầu vào cần thiết.
- Thời gian tạo.
- Người xác nhận.
- Thời gian áp dụng.
- Trạng thái chấp nhận, từ chối hoặc hết hạn.

Không ghi đè lịch sử phiên bản cũ.

Cho phép người dùng xem sự khác biệt giữa hai phiên bản và hiểu vì sao kế hoạch thay đổi.

---

# 5. MODULE 3 — NUTRITION MANAGEMENT

Mở rộng dinh dưỡng thành một module nghiệp vụ hoàn chỉnh.

## 5.1. Quản lý thực phẩm

Xây dựng dữ liệu thực phẩm với các thông tin phù hợp:

- Tên thực phẩm.
- Nhóm thực phẩm.
- Đơn vị đo.
- Khối lượng tham chiếu.
- Năng lượng ước tính.
- Protein, carbohydrate và chất béo nếu có dữ liệu.
- Nguồn dữ liệu.
- Trạng thái xác minh dữ liệu.

Phân biệt thực phẩm đã có số liệu xác minh với thực phẩm do AI ước tính.

Không tự tạo số liệu dinh dưỡng rồi coi là dữ liệu chính xác.

## 5.2. Quản lý bữa ăn

Người dùng có thể:

- Xem thực đơn hôm nay.
- Xem chi tiết món ăn.
- Xem nguyên liệu và khẩu phần.
- Đánh dấu đã ăn.
- Ghi nhận lượng ăn thực tế.
- Thay thế món ăn.
- Thêm món ngoài kế hoạch.
- Xem tổng dinh dưỡng ước tính.
- Xem lịch sử bữa ăn.
- Ghi chú lý do không thực hiện đúng kế hoạch.

Khi thay món, hệ thống phải kiểm tra các ràng buộc như dị ứng, sở thích và mục tiêu trước khi đề xuất lựa chọn thay thế.

## 5.3. Danh sách mua sắm

Tạo danh sách nguyên liệu từ thực đơn của một khoảng thời gian.

Cho phép:

- Chọn ngày hoặc tuần.
- Tổng hợp nguyên liệu trùng nhau.
- Chỉnh sửa số lượng.
- Đánh dấu đã mua.
- Loại bỏ nguyên liệu không cần thiết.
- Chuyển nguyên liệu thành danh sách mua sắm cá nhân.

Nếu có dữ liệu khẩu phần, hãy tính lượng nguyên liệu dựa trên số người và số bữa phù hợp.

---

# 6. MODULE 4 — WORKOUT & RECOVERY

## 6.1. Thư viện bài tập

Mỗi bài tập nên có:

- Tên và mô tả.
- Nhóm cơ mục tiêu.
- Loại bài tập.
- Thiết bị cần dùng.
- Mức độ khó.
- Hướng dẫn thực hiện.
- Lỗi thường gặp.
- Phương án thay thế.
- Tài liệu minh họa nếu có.

Không bắt buộc mọi bài tập phải có video ngay từ đầu. Hãy thiết kế schema để bổ sung media sau.

## 6.2. Buổi tập

Cho phép người dùng:

- Xem lịch tập.
- Bắt đầu buổi tập.
- Ghi nhận từng bài tập.
- Ghi số hiệp, số lần lặp, thời lượng hoặc mức tạ phù hợp.
- Tạm dừng hoặc kết thúc.
- Đánh dấu hoàn thành.
- Xem lịch sử.
- Ghi nhận cảm nhận sau buổi tập.

Phải xử lý tình huống app bị đóng giữa chừng, request gửi lại hoặc người dùng vô tình bấm hoàn thành nhiều lần.

## 6.3. Lịch tập thích ứng

Khi người dùng không thể tập vào thời gian đã chọn:

- Kiểm tra các khung giờ còn trống.
- Kiểm tra xung đột lịch.
- Xét thời gian nghỉ giữa các buổi tập.
- Đề xuất đổi lịch.
- Cho người dùng xác nhận.

Không tự động nhồi hai buổi tập vào cùng một khoảng thời gian hoặc tăng cường độ để bù cho buổi bị bỏ lỡ.

---

# 7. MODULE 5 — HEALTH ANALYTICS

Tạo trung tâm phân tích sức khỏe.

## 7.1. Các loại báo cáo

- Xu hướng cân nặng.
- Thay đổi số đo.
- Mức độ hoàn thành kế hoạch.
- Số buổi tập hoàn thành.
- Tỷ lệ bữa ăn được ghi nhận.
- Tiến độ mục tiêu.
- Tính đều đặn của thói quen.
- So sánh các giai đoạn.
- Báo cáo tuần và tháng.

## 7.2. Nguyên tắc tính toán

- Các chỉ số có thể tính bằng quy tắc xác định nên được xử lý trong Backend.
- Không dùng LLM để tính các phép toán đơn giản thay cho code.
- Tách dữ liệu đo được khỏi dữ liệu ước tính.
- Có thể hiển thị khoảng dự báo thay vì một con số chắc chắn.
- Không khẳng định kết quả giảm cân trong tương lai sẽ xảy ra chính xác.
- Xử lý trường hợp thiếu dữ liệu và khoảng thời gian không đủ dài.

Frontend chỉ hiển thị kết quả từ API, không tự tính các chỉ số nghiệp vụ quan trọng theo cách khác với Backend.

---

# 8. MODULE 6 — AI HEALTH COACH VÀ RAG

Xây dựng AI Coach có ngữ cảnh.

## 8.1. Các khả năng

Người dùng có thể hỏi:

- Vì sao kế hoạch của tôi được thiết kế như vậy?
- Tôi có thể thay thế bữa ăn này không?
- Tôi đã bỏ lỡ buổi tập, nên xử lý thế nào?
- Tiến độ tuần này khác tuần trước ra sao?
- Bài tập nào phù hợp với thiết bị tôi đang có?
- Kiến thức nào trong tài liệu hệ thống hỗ trợ lời khuyên này?

## 8.2. Luồng xử lý

1. Xác thực người dùng.
2. Xác định câu hỏi thuộc loại nào.
3. Lấy dữ liệu hồ sơ hoặc kế hoạch mà người dùng được phép truy cập.
4. Truy xuất tài liệu liên quan từ knowledge base nếu cần.
5. Xây dựng context tối thiểu.
6. Gọi AI provider.
7. Validate kết quả.
8. Trả câu trả lời, nguồn tham khảo nếu có và giới hạn phù hợp.
9. Lưu lịch sử theo cấu hình quyền riêng tư của ứng dụng.

## 8.3. Yêu cầu kỹ thuật

- AI provider abstraction.
- Timeout.
- Retry có giới hạn.
- Kiểm soát chi phí và số lượng request.
- Không gửi toàn bộ dữ liệu cá nhân vào mọi câu hỏi.
- Không cho phép prompt injection từ tài liệu truy xuất làm thay đổi chính sách bảo mật.
- Không trả dữ liệu người dùng khác.
- Có trạng thái dịch vụ không khả dụng.
- Không tự nhận đã tìm thấy nguồn nếu không có tài liệu hỗ trợ.

Nếu RAG chưa tồn tại, triển khai theo từng bước và giữ các chức năng không dùng RAG vẫn hoạt động bình thường.

---

# 9. MODULE 7 — NOTIFICATIONS & SCHEDULER

Xây dựng hệ thống thông báo và tác vụ nền.

## 9.1. Các loại thông báo

- Nhắc check-in.
- Nhắc lịch tập.
- Nhắc ghi nhận bữa ăn.
- Thông báo lộ trình mới được tạo.
- Thông báo đề xuất điều chỉnh.
- Thông báo hoàn thành cột mốc.
- Thông báo lỗi tạo lộ trình khi cần người dùng xử lý.

Cho phép người dùng bật, tắt và chọn thời gian phù hợp.

## 9.2. Tác vụ nền

Xây dựng các tác vụ cần thiết như:

- Kiểm tra các lịch sắp diễn ra.
- Tạo nhắc nhở.
- Xử lý job AI bất đồng bộ.
- Theo dõi job quá hạn.
- Dọn dữ liệu tạm theo chính sách lưu trữ.
- Tạo báo cáo định kỳ khi cần.

Yêu cầu:

- Không tạo thông báo trùng khi scheduler chạy nhiều lần.
- Dùng múi giờ phù hợp với người dùng.
- Có retry giới hạn và ghi log lỗi.
- Không để một job lỗi làm dừng toàn bộ scheduler.
- Không tạo nhiều job AI cho cùng một yêu cầu do client gửi lặp.
- Có thể sử dụng Spring Scheduler ở giai đoạn đầu.
- Chỉ bổ sung message broker khi thực sự cần thiết.

---

# 10. MODULE 8 — GAMIFICATION

Xây dựng hệ thống động lực nhưng không khuyến khích hành vi sức khỏe thiếu an toàn.

Các chức năng:

- Chuỗi ngày duy trì thói quen.
- Huy hiệu.
- Mục tiêu tuần.
- Thử thách cá nhân.
- Cột mốc hoàn thành lộ trình.
- Lịch sử thành tích.

Quy tắc:

- Thành tích phải được tính từ dữ liệu thực.
- Không cho phép client tự gửi điểm thưởng tùy ý.
- Chống cộng thưởng trùng.
- Không dùng cân nặng giảm được làm tiêu chí thưởng duy nhất.
- Cho phép người dùng tắt các yếu tố gamification.

Đây là module mở rộng; ưu tiên sau khi các nghiệp vụ sức khỏe cốt lõi đã ổn định.

---

# 11. MODULE 9 — ADMIN VÀ QUẢN LÝ KNOWLEDGE BASE

Nếu repository hiện tại chưa có Admin, hãy thiết kế Backend và API để hỗ trợ quản trị.

Các chức năng định hướng:

- Quản lý danh mục bài tập.
- Quản lý thực phẩm và nguồn dữ liệu.
- Quản lý bài viết kiến thức.
- Tải tài liệu vào knowledge base.
- Theo dõi trạng thái xử lý tài liệu.
- Quản lý các lần tạo lộ trình AI bị lỗi.
- Xem thống kê tổng hợp.
- Xem audit log theo quyền.
- Quản lý cấu hình nghiệp vụ an toàn.

Phân quyền rõ ràng giữa USER và ADMIN; bổ sung các role khác khi có nghiệp vụ thực sự cần thiết.

Không để Admin đọc toàn bộ dữ liệu sức khỏe chi tiết của người dùng một cách mặc định.

Nếu đã có trang quản trị Web trong repository, hãy mở rộng trang đó. Nếu chưa có, ưu tiên hoàn thiện Backend và tài liệu API trước; không để module Admin làm trì hoãn các luồng mobile chính.

---

# 12. THIẾT KẾ DATABASE VÀ MIGRATION

Trước khi tạo bảng mới:

1. Đọc toàn bộ schema hiện tại.
2. Tìm các entity và bảng có thể tái sử dụng.
3. Xác định quan hệ giữa module.
4. Thiết kế migration tương thích với dữ liệu đã có.
5. Tránh xóa bảng hoặc cột đang được sử dụng.
6. Tạo index theo truy vấn thực tế.
7. Bảo đảm khóa ngoại và unique constraint hợp lý.

Các nhóm dữ liệu cần được hỗ trợ gồm:

- Hồ sơ và lịch sử sức khỏe.
- Check-in hằng ngày.
- Lộ trình và phiên bản lộ trình.
- Sự kiện hoàn thành kế hoạch.
- Bữa ăn và nhật ký dinh dưỡng.
- Buổi tập và lịch sử thực hiện.
- Job tạo lộ trình AI.
- Lịch sử điều chỉnh.
- Hội thoại AI khi được bật.
- Tài liệu và chunk knowledge base.
- Thông báo và cấu hình nhắc nhở.
- Thành tích và thử thách khi triển khai.
- Audit log phù hợp.

Đây là các nhóm dữ liệu cần đánh giá, không phải danh sách bắt buộc phải tạo bảng riêng cho mọi mục.

Mỗi bảng nghiệp vụ phải có JPA entity ánh xạ đầy đủ. Backend hiện dùng Hibernate `ddl-auto: update` để tạo/cập nhật bảng từ entity khi khởi động; không thêm công cụ migration khác. Không xóa bảng hoặc cột đang dùng khi cập nhật schema.

---

# 13. FRONTEND MOBILE VÀ ROUTING

Mọi module phải có giao diện React Native tương ứng, dùng chung design system hiện tại.

## 13.1. Các màn hình cần bổ sung

### Health
- Health overview.
- Daily check-in.
- Measurement history.
- Measurement detail.
- Health report.

### Planning
- Plan overview.
- Plan calendar.
- Plan day detail.
- Plan adjustment preview.
- Plan version history.
- Plan version comparison.
- Plan confirmation.

### Nutrition
- Nutrition dashboard.
- Meal detail.
- Food search.
- Meal logging.
- Meal substitution.
- Grocery list.

### Workout
- Workout calendar.
- Workout session.
- Exercise detail.
- Exercise history.
- Session summary.
- Reschedule workout.

### AI
- AI Coach chat.
- Chat history nếu được bật.
- AI-generated plan preview.
- AI recommendation detail.
- AI service error state.

### Notifications
- Notification center.
- Notification settings.

### Gamification
- Achievements.
- Weekly challenge.
- Habit streaks.

### Admin
Chỉ tạo màn hình nếu repository có Admin Web hoặc có kế hoạch phát triển Web riêng. Không đưa trang quản trị desktop vào mobile app người dùng thông thường.

## 13.2. Routing

- Dùng Expo Router.
- Giữ các route hiện tại nếu đang hoạt động.
- Bổ sung route theo cấu trúc hiện có.
- Dùng route động cho plan ID, meal ID, session ID và article ID.
- Có auth guard và xử lý route không tồn tại.
- Tích hợp deep link khi phù hợp.
- Nút bấm phải dẫn đến đúng màn hình.
- Bottom navigation không xuất hiện ở những màn hình không phù hợp.
- Không để vòng lặp điều hướng khi tải dữ liệu hoặc làm mới token.
- Không để người dùng mất dữ liệu biểu mẫu khi điều hướng ngoài ý muốn.

## 13.3. Chất lượng UI

Mỗi màn hình phải có:

- Loading state.
- Empty state.
- Error state.
- Retry action khi phù hợp.
- Validation.
- Trạng thái disabled.
- Xử lý dữ liệu dài.
- Hỗ trợ bàn phím và safe area.
- Điều hướng Back hợp lý.
- Xử lý mất kết nối.

Không dùng một màn hình chung cho nhiều chức năng chỉ bằng cách đổi tiêu đề.

---

# 14. API VÀ QUY TẮC TÍCH HỢP

Đọc API hiện có trước khi bổ sung.

Mỗi nghiệp vụ phải được triển khai đầy đủ qua:

- Request DTO.
- Response DTO.
- Controller.
- Service.
- Repository khi cần.
- Validation.
- Exception handling.
- Security.
- Database persistence.
- Unit test và integration test phù hợp.

Đảm bảo Frontend dùng đúng contract của Backend.

Nếu thay đổi response, hãy cập nhật đồng bộ API client, TypeScript types, các màn hình sử dụng và tài liệu API.

Không được để FE sử dụng dữ liệu giả khi API trả lỗi mà không hiển thị trạng thái rõ ràng.

Không trả entity trực tiếp ra API. Không tin ID người dùng do client truyền vào. Mọi truy vấn tài nguyên cá nhân phải kiểm tra quyền sở hữu.

---

# 15. BẢO MẬT VÀ AN TOÀN

- Bảo vệ dữ liệu sức khỏe.
- Kiểm tra quyền truy cập theo người dùng.
- Không log thông tin nhạy cảm.
- Validate dữ liệu cả FE và BE.
- Chống thao tác trùng lặp.
- Bảo vệ endpoint AI khỏi lạm dụng.
- Giới hạn kích thước file và loại file nếu có tải tài liệu.
- Không đưa secret vào mã nguồn.
- Có chính sách lưu trữ và xóa dữ liệu phù hợp.
- Không đưa ra chẩn đoán bệnh từ dữ liệu không đủ.
- Không tự động áp dụng thay đổi lộ trình quan trọng khi chưa có sự xác nhận cần thiết.
- Có cơ chế xử lý lỗi an toàn khi AI đưa ra kết quả không hợp lệ.

---

# 16. KIỂM THỬ VÀ NGHIỆM THU

## Backend

Kiểm thử các tình huống:

- Người dùng chỉ đọc được dữ liệu của mình.
- Check-in được lưu và truy vấn đúng.
- Tạo lộ trình không bị trùng.
- Phiên bản mới không làm mất lịch sử.
- Chỉ áp dụng kế hoạch sau khi xác nhận.
- Lịch tập không bị trùng thời gian.
- Thay món không vi phạm các hạn chế đã khai báo.
- Thống kê tính đúng theo dữ liệu thực.
- Job AI lỗi không làm hỏng kế hoạch hiện tại.
- Scheduler không gửi thông báo trùng.
- AI provider không khả dụng nhưng các chức năng khác vẫn chạy.
- Migration chạy được trên database phù hợp.

## Frontend

Kiểm thử:

- Routing từ Home tới các màn hình chi tiết.
- Route động nhận đúng ID.
- Back navigation.
- Auth guard.
- Form validation.
- Check-in và lịch sử.
- Tạo lộ trình và xác nhận.
- So sánh phiên bản.
- Thay thế món ăn.
- Hoàn thành buổi tập.
- Biểu đồ và báo cáo.
- Thông báo và cài đặt.
- Loading, empty, error và offline states.

## Kiểm thử end-to-end

Ưu tiên hoàn thành các luồng sau:

**Luồng A:** Đăng nhập → cập nhật hồ sơ → tạo lộ trình → xem trước → xác nhận → xem kế hoạch.

**Luồng B:** Xem lịch tập → thực hiện buổi tập → ghi nhận kết quả → xem tiến độ.

**Luồng C:** Xem thực đơn → thay món → ghi nhận bữa ăn → xem nhật ký dinh dưỡng.

**Luồng D:** Check-in → đánh giá sai lệch → tạo đề xuất điều chỉnh → xem so sánh → xác nhận phiên bản mới.

**Luồng E:** Hỏi AI Coach → truy xuất kiến thức phù hợp → nhận câu trả lời có nguồn khi có thể.

**Luồng F:** Đặt nhắc nhở → scheduler xử lý → nhận thông báo → mở đúng nội dung trong ứng dụng.

Chỉ báo cáo luồng nào đã được chạy và xác minh thực tế.

---

# 17. THỨ TỰ TRIỂN KHAI

Không phát triển mọi module đồng thời.

### Đợt 1 — Health Journal
Hoàn thiện hồ sơ sức khỏe, check-in, lịch sử cân nặng và dashboard.

### Đợt 2 — Adaptive Planning
Hoàn thiện kế hoạch, sự kiện thực tế, phiên bản lộ trình và quy trình đề xuất điều chỉnh.

### Đợt 3 — Nutrition
Hoàn thiện dữ liệu thực phẩm, thực đơn, nhật ký bữa ăn, thay thế món và danh sách mua sắm.

### Đợt 4 — Workout
Hoàn thiện thư viện bài tập, buổi tập, lịch tập và lịch sử.

### Đợt 5 — Analytics
Hoàn thiện báo cáo, biểu đồ, chỉ số tuân thủ và phân tích xu hướng.

### Đợt 6 — AI Coach & RAG
Hoàn thiện hội thoại có ngữ cảnh, truy xuất kiến thức, kiểm tra nguồn và đánh giá chất lượng kết quả.

### Đợt 7 — Notification & Scheduler
Hoàn thiện nhắc nhở, tác vụ nền, chống trùng và retry.

### Đợt 8 — Gamification & Admin
Chỉ triển khai sau khi các module cốt lõi hoạt động ổn định.

Sau mỗi đợt:

1. Kiểm tra code hiện có.
2. Triển khai Backend.
3. Cập nhật database migration.
4. Tích hợp Frontend.
5. Cập nhật routing.
6. Chạy test.
7. Sửa lỗi.
8. Cập nhật tài liệu.
9. Chuyển sang đợt tiếp theo.

Không dừng sau khi chỉ viết kế hoạch.

---

# 18. ĐIỀU KIỆN HOÀN THÀNH

Dự án mở rộng chỉ được xem là hoàn thành khi:

- Các module đã triển khai có liên kết nghiệp vụ thực tế.
- Frontend và Backend sử dụng contract thống nhất.
- Các route quan trọng hoạt động đúng.
- Database lưu dữ liệu bền vững.
- Lịch sử và phiên bản lộ trình được quản lý đúng.
- AI có kiểm tra đầu ra và xử lý lỗi.
- Các luồng quan trọng có kiểm thử.
- Không có nút bấm quan trọng chỉ để trang trí.
- Không có dữ liệu mock bị dùng thay cho kết quả thật trong luồng production.
- Có hướng dẫn chạy và kiểm thử.
- Các hạn chế chưa xử lý được được ghi rõ.

---

# 19. YÊU CẦU THỰC THI

Bắt đầu bằng cách đọc repository hiện tại và lập checklist các module.

Sau đó hãy thực hiện trực tiếp trên codebase hiện có, ưu tiên các nghiệp vụ cốt lõi và tiếp tục theo thứ tự đã nêu.

Không tạo một dự án mới bên cạnh dự án hiện tại. Không xóa code đang hoạt động chỉ để làm cho cấu trúc giống ví dụ trong prompt. Không tạo các class, route, bảng hoặc API rỗng để đánh dấu hoàn thành.

Nếu một phần đã tồn tại, hãy đánh giá và tái sử dụng. Nếu phần đó thiếu, hãy triển khai. Nếu có lỗi, hãy sửa và kiểm tra lại.

**Mục tiêu cuối cùng là mở rộng Health Assistant từ ứng dụng tạo kế hoạch đơn giản thành một hệ thống sức khỏe cá nhân có dữ liệu lịch sử, AI thích ứng, quản lý dinh dưỡng, tập luyện, phân tích tiến độ và các nghiệp vụ hỗ trợ vận hành thực tế.**
