# PROMPT: XÂY DỰNG ADMIN MOBILE APP – HEALTH ASSISTANT

## 1. VAI TRÒ VÀ MỤC TIÊU

Bạn là Senior Mobile UI/UX Designer và Senior React Native Developer, có kinh nghiệm xây dựng ứng dụng quản trị trên iOS.

Tôi đang phát triển dự án Health Assistant – hệ thống quản lý sức khỏe cá nhân kết hợp AI, bác sĩ và người dùng.

Nhiệm vụ của bạn là xây dựng lại toàn bộ giao diện và trải nghiệm sử dụng dành cho **ROLE ADMIN** trên ứng dụng mobile.

### Công nghệ bắt buộc
- React Native.
- Expo SDK.
- Expo Go.
- TypeScript.
- React Navigation hoặc Expo Router theo kiến trúc hiện tại của dự án.
- Tương thích iOS và có khả năng responsive với nhiều kích thước iPhone.

LƯU Ý QUAN TRỌNG:
- Đây là ứng dụng MOBILE, không phải website responsive.
- Không sử dụng tư duy thiết kế Admin Dashboard trên desktop rồi thu nhỏ xuống mobile.
- Giao diện phải được thiết kế ưu tiên iPhone.
- Không sử dụng các thư viện native yêu cầu custom native code hoặc development build nếu không tương thích Expo Go.
- Tận dụng các thư viện tương thích Expo Go và Expo SDK hiện tại.

---

# 2. YÊU CẦU QUAN TRỌNG NHẤT: XÂY DỰNG DESIGN SYSTEM TRƯỚC

Tuyệt đối KHÔNG được xây dựng từng màn hình với các component, style và màu sắc riêng biệt.

Trước khi phát triển các màn hình Admin, phải xây dựng một Design System và thư viện Shared Components dùng chung.

Mọi màn hình trong Admin bắt buộc phải sử dụng chung Design System này.

## 2.1. Design Tokens

Tạo một hệ thống Design Tokens tập trung:

### Colors

Sử dụng bảng màu nhất quán:

- Primary: #2563EB
- Primary Dark: #1D4ED8
- AI Accent: #7C3AED
- Background: #F8FAFC
- Surface: #FFFFFF
- Text Primary: #0F172A
- Text Secondary: #64748B
- Border: #E2E8F0
- Success: #16A34A
- Warning: #F59E0B
- Error: #DC2626
- Info: #0EA5E9

Không tự ý tạo thêm màu mới ở từng màn hình.

### Typography

Xây dựng typography thống nhất:

- Display: Tiêu đề tổng quan.
- Heading 1: Tiêu đề màn hình.
- Heading 2: Tiêu đề section.
- Body: Nội dung thông thường.
- Caption: Mô tả phụ.
- Label: Nhãn input.
- Button: Chữ trên nút.

Sử dụng font phù hợp với iOS, ưu tiên hệ thống San Francisco thông qua font mặc định của iOS.

Quy định rõ:
- Font size.
- Font weight.
- Line height.
- Letter spacing.

### Spacing

Sử dụng spacing scale thống nhất:

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px

Không sử dụng margin và padding tùy tiện.

### Border Radius

- Small: 8px.
- Medium: 12px.
- Large: 16px.
- Extra Large: 20px.
- Pill: 999px.

### Shadows và Elevation

Định nghĩa shadow dùng chung cho:
- Card.
- Modal.
- Dropdown.
- Floating Action Button.

Ưu tiên giao diện phẳng, sạch sẽ, hạn chế shadow quá đậm.

---

# 3. XÂY DỰNG SHARED COMPONENT LIBRARY

Tạo các component tái sử dụng trước khi xây dựng màn hình.

Tất cả component phải lấy màu sắc, typography, spacing từ Design Tokens.

## 3.1. Button System

Tạo component AppButton với các biến thể:

- Primary Button.
- Secondary Button.
- Outline Button.
- Ghost Button.
- Danger Button.
- Icon Button.

Các trạng thái:
- Default.
- Pressed.
- Disabled.
- Loading.

Yêu cầu:
- Vùng nhấn đủ lớn, tối thiểu khoảng 44x44pt.
- Bo góc thống nhất.
- Không sử dụng button mặc định tùy tiện ở từng màn hình.
- Hỗ trợ fullWidth.
- Hỗ trợ icon trái/phải.
- Hỗ trợ loading indicator.

## 3.2. Card System

Tạo các component:

- AppCard.
- StatCard.
- InfoCard.
- ListCard.
- EmptyStateCard.
- DocumentCard.
- DiseaseCard.
- ExerciseCard.
- UserCard.
- DoctorCard.
- PlanCard.

Các Card phải có:
- Padding thống nhất.
- Border radius thống nhất.
- Border thống nhất.
- Typography thống nhất.
- Khoảng cách giữa các thành phần thống nhất.

Không tạo lại card bằng View và StyleSheet riêng ở từng màn hình nếu đã có component phù hợp.

## 3.3. Input System

Tạo:
- AppTextInput.
- AppSearchInput.
- AppTextArea.
- AppSelect.
- AppDatePicker.
- AppNumberInput.
- AppCheckbox.
- AppRadioGroup.
- AppSwitch.

Hỗ trợ:
- Label.
- Placeholder.
- Error message.
- Helper text.
- Required indicator.
- Disabled state.

Input phải thân thiện với bàn phím iOS, hỗ trợ KeyboardAvoidingView và tự động cuộn đến trường đang nhập khi cần.

## 3.4. Modal và Bottom Sheet

Tạo các component dùng chung:

- AppModal.
- AppBottomSheet.
- AppConfirmDialog.
- AppActionSheet.

Dùng cho:
- Xác nhận xóa.
- Xác nhận thao tác.
- Thêm mới dữ liệu.
- Chỉnh sửa dữ liệu.
- Lọc dữ liệu.
- Xem thông tin chi tiết.

Ưu tiên Bottom Sheet trên iPhone đối với các thao tác lựa chọn và lọc dữ liệu.

Không để modal vượt quá kích thước màn hình.

## 3.5. Các component dùng chung khác

- AppHeader.
- AppTabBar.
- AppBadge.
- AppAvatar.
- AppDivider.
- AppSkeleton.
- AppLoading.
- AppEmptyState.
- AppErrorState.
- AppPagination hoặc Load More.
- AppToast.
- AppFilterChips.
- AppSectionHeader.
- AppListItem.

Đặc biệt, AppHeader phải hỗ trợ:
- Nút quay lại.
- Tiêu đề.
- Mô tả phụ.
- Action bên phải.
- Tùy chọn tìm kiếm.

---

# 4. CẤU TRÚC ADMIN MOBILE

Admin chỉ có các chức năng sau:

1. Dashboard.
2. Quản lý bệnh lý.
3. Quản lý bài tập.
4. Quản lý bác sĩ.
5. Quản lý người dùng.
6. Quản lý lộ trình.

Không tự ý tạo thêm các module quản trị khác.

Sử dụng Bottom Tab Navigation hoặc cấu trúc navigation phù hợp với số lượng chức năng. Có thể sử dụng Dashboard, Bệnh lý, Bài tập, Người dùng và mục Khác để chứa Bác sĩ và Lộ trình nếu cần.

Không nhồi nhét quá nhiều tab khiến giao diện iPhone chật chội.

## 4.1. DASHBOARD

Mục tiêu: Giúp Admin nhìn nhanh tình trạng toàn hệ thống.

Các thành phần:

### Header
- Lời chào Admin.
- Avatar.
- Tiêu đề Dashboard.
- Ngày hiện tại.

### Thống kê tổng quan

Hiển thị các StatCard:

- Tổng số người dùng.
- Tổng số bác sĩ.
- Tổng số bệnh lý.
- Tổng số bài tập.
- Tổng số lộ trình.
- Lộ trình đang chờ duyệt.

Không hiển thị số liệu giả trong môi trường production.

### Biểu đồ

Nếu dữ liệu có sẵn, hiển thị:
- Số lượng người dùng theo thời gian.
- Số lộ trình được tạo.
- Số lộ trình đã được duyệt.
- Tỷ lệ hoàn thành lộ trình.

Biểu đồ phải responsive, không tràn chiều ngang.

### Hoạt động gần đây

Hiển thị:
- Người dùng mới.
- Bác sĩ mới.
- Bệnh lý mới được thêm.
- Bài tập mới được upload.
- Lộ trình vừa được tạo hoặc duyệt.

Có trạng thái EmptyState nếu không có dữ liệu.

## 4.2. QUẢN LÝ BỆNH LÝ

Đây là module quản lý dữ liệu bệnh lý và kiến thức chăm sóc sức khỏe.

### Danh sách bệnh lý

Mỗi DiseaseCard hiển thị:
- Tên bệnh.
- Nhóm bệnh.
- Mô tả ngắn.
- Mức độ hoặc phân loại rủi ro.
- Trạng thái hoạt động.
- Chế độ xét duyệt.

Có:
- Tìm kiếm.
- Lọc theo nhóm bệnh.
- Lọc theo trạng thái.
- Lọc theo yêu cầu bác sĩ duyệt.
- Sắp xếp.

### Thêm và chỉnh sửa bệnh lý

Các trường:
- Tên bệnh.
- Mã bệnh nếu có.
- Nhóm bệnh.
- Mô tả.
- Triệu chứng.
- Mức độ rủi ro.
- Những điều nên làm.
- Những điều cần tránh.
- Chế độ xử lý lộ trình.
- Có yêu cầu bác sĩ duyệt hay không.
- Tài liệu liên quan.

### Quản lý tài liệu bệnh lý

Cho phép:
- Upload PDF.
- Upload DOCX.
- Upload hình ảnh.
- Nhập mô tả tài liệu.
- Gắn tài liệu với bệnh lý.
- Phân loại tài liệu.
- Xem tài liệu.
- Xóa tài liệu.
- Quản lý nguồn tài liệu.
- Theo dõi người upload.

Phân biệt rõ tài liệu do Admin upload và tài liệu do Doctor upload.

Tài liệu phải có trạng thái kiểm duyệt và nguồn gốc rõ ràng trước khi được AI sử dụng.

## 4.3. QUẢN LÝ BÀI TẬP

Mục tiêu: Quản lý thư viện bài tập để AI ưu tiên sử dụng khi tạo lộ trình.

### Danh sách bài tập

Mỗi ExerciseCard hiển thị:
- Tên bài tập.
- Hình ảnh minh họa.
- Nhóm cơ.
- Loại bài tập.
- Mức độ.
- Thời lượng.
- Trạng thái.

### Thêm và chỉnh sửa bài tập

Thông tin:
- Tên bài tập.
- Mô tả.
- Nhóm cơ.
- Loại bài tập.
- Mức độ khó.
- Số hiệp.
- Số lần.
- Thời gian nghỉ.
- Hướng dẫn thực hiện.
- Các bước thực hiện đúng tư thế.
- Những lỗi thường gặp.
- Lưu ý an toàn.
- Chống chỉ định.
- Hình ảnh hoặc video hướng dẫn.
- Tài liệu tham khảo.
- Bệnh lý phù hợp hoặc không phù hợp.

### Quản lý tài liệu tập luyện

- Upload tài liệu.
- Phân loại.
- Gắn bài tập.
- Gắn nhóm cơ.
- Quản lý nguồn.
- Theo dõi người upload.
- Trạng thái kiểm duyệt.

AI phải ưu tiên các bài tập có trong thư viện nội bộ đã được xác thực. Nếu dữ liệu không đủ, mới sử dụng nguồn bên ngoài đáng tin cậy.

## 4.4. QUẢN LÝ BÁC SĨ

Mục tiêu: Quản lý tài khoản và thông tin chuyên môn của Doctor.

### Danh sách bác sĩ

DoctorCard hiển thị:
- Avatar.
- Họ tên.
- Chuyên khoa.
- Email.
- Số điện thoại.
- Trạng thái tài khoản.
- Số lộ trình đang chờ xử lý.

### Chi tiết bác sĩ

Thông tin:
- Họ tên.
- Ngày sinh.
- Giới tính.
- Email.
- Số điện thoại.
- Chuyên khoa.
- Bằng cấp.
- Kinh nghiệm.
- Nơi công tác.
- Giấy phép hành nghề hoặc thông tin xác thực.
- Trạng thái xác thực.

### Các chức năng

- Thêm bác sĩ.
- Chỉnh sửa thông tin.
- Xác thực bác sĩ.
- Kích hoạt hoặc khóa tài khoản.
- Xem tài liệu bác sĩ đã upload.
- Xem lịch sử hoạt động.
- Xem các lộ trình bác sĩ đã duyệt.

Không được tự ý xác nhận một bác sĩ là hợp lệ nếu chưa có thông tin xác minh.

## 4.5. QUẢN LÝ NGƯỜI DÙNG

Mục tiêu: Quản lý toàn bộ User sử dụng Health Assistant.

### Danh sách người dùng

UserCard hiển thị:
- Avatar.
- Họ tên.
- Email.
- Tuổi nếu có dữ liệu.
- Mục tiêu sức khỏe.
- Trạng thái tài khoản.
- Ngày đăng ký.

Có:
- Tìm kiếm.
- Lọc trạng thái.
- Lọc theo mục tiêu.
- Sắp xếp.
- Load More hoặc phân trang.

### Chi tiết người dùng

Các tab hoặc section:
- Thông tin cá nhân.
- Hồ sơ sức khỏe.
- Bệnh lý.
- Lộ trình hiện tại.
- Lịch sử lộ trình.
- Tiến độ thực hiện.
- Lịch sử hoạt động.

Lưu ý: Thông tin sức khỏe là dữ liệu nhạy cảm. Chỉ hiển thị cho Admin trong phạm vi quyền hạn được hệ thống cho phép, không hiển thị tràn lan.

## 4.6. QUẢN LÝ LỘ TRÌNH

Mục tiêu: Theo dõi và quản lý các lộ trình do AI tạo ra và các lộ trình đang chờ bác sĩ duyệt.

### Danh sách lộ trình

PlanCard hiển thị:
- Tên lộ trình.
- Người tạo.
- Người dùng sở hữu.
- Mục tiêu.
- Thời gian.
- Trạng thái.
- Bác sĩ phụ trách nếu có.
- Thời gian tạo.

Các trạng thái:
- Draft.
- Pending Doctor Review.
- Under Review.
- Revision Requested.
- Approved.
- Active.
- Completed.
- Rejected.
- Cancelled.

### Bộ lọc

- Tất cả.
- Chờ bác sĩ duyệt.
- Đang xử lý.
- Yêu cầu chỉnh sửa.
- Đã duyệt.
- Đang thực hiện.
- Đã hoàn thành.
- Từ chối.

### Chi tiết lộ trình

Hiển thị:
- Thông tin người dùng.
- Hồ sơ sức khỏe liên quan.
- Mục tiêu.
- Các bệnh lý.
- Nội dung lộ trình.
- Kế hoạch theo ngày.
- Các hoạt động.
- Dữ liệu AI sử dụng.
- Tài liệu tham khảo.
- Lịch sử thay đổi.
- Phiên bản lộ trình.
- Trạng thái xét duyệt.

Admin có quyền theo dõi và quản lý, không tự động có quyền thay thế quyết định chuyên môn của Doctor.

---

# 5. RESPONSIVE VÀ TỐI ƯU CHO IOS

Đây là yêu cầu bắt buộc.

### Safe Area

- Sử dụng SafeAreaView phù hợp với Expo.
- Không để nội dung đè lên Dynamic Island.
- Không để Tab Bar đè lên nội dung.
- Tôn trọng vùng an toàn phía dưới iPhone.
- Xử lý đúng khi mở bàn phím.

### Responsive

Thiết kế phải hoạt động tốt trên:
- iPhone SE.
- iPhone 13/14.
- iPhone 15/16.
- iPhone Pro và Pro Max.

Yêu cầu:
- Không hardcode width cố định cho toàn bộ màn hình.
- Sử dụng flex, percentage và Dimensions/useWindowDimensions khi cần.
- Card tự co giãn theo chiều rộng.
- Nội dung dài phải tự xuống dòng.
- Không bị tràn ngang.
- Không cắt mất button.
- Không để modal vượt quá chiều cao màn hình.
- Danh sách dài phải sử dụng FlatList hoặc FlashList nếu phù hợp và tương thích môi trường.

### Native iOS Experience

- Ưu tiên trải nghiệm điều hướng tự nhiên của iOS.
- Animation nhẹ nhàng.
- Haptic feedback khi phù hợp.
- Pull to refresh.
- Swipe gesture nếu thực sự cần thiết.
- Keyboard handling chuẩn iOS.
- Không sử dụng hiệu ứng quá nặng gây giật lag.

---

# 6. CẤU TRÚC SOURCE CODE

Không viết toàn bộ logic, UI và style vào một file.

Hãy tổ chức code theo hướng có thể mở rộng.

Ví dụ:

src/
├── theme/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── radius.ts
│   ├── shadows.ts
│   └── index.ts
│
├── components/
│   ├── common/
│   │   ├── AppButton.tsx
│   │   ├── AppCard.tsx
│   │   ├── AppHeader.tsx
│   │   ├── AppInput.tsx
│   │   ├── AppModal.tsx
│   │   ├── AppBottomSheet.tsx
│   │   ├── AppBadge.tsx
│   │   ├── AppSearchInput.tsx
│   │   ├── AppEmptyState.tsx
│   │   └── AppLoading.tsx
│   │
│   └── admin/
│       ├── StatCard.tsx
│       ├── DiseaseCard.tsx
│       ├── ExerciseCard.tsx
│       ├── DoctorCard.tsx
│       ├── UserCard.tsx
│       └── PlanCard.tsx
│
├── navigation/
│   └── AdminNavigator.tsx
│
├── screens/
│   └── admin/
│       ├── DashboardScreen.tsx
│       ├── DiseaseScreen.tsx
│       ├── ExerciseScreen.tsx
│       ├── DoctorScreen.tsx
│       ├── UserScreen.tsx
│       └── PlanScreen.tsx
│
├── services/
│   └── admin/
│
├── hooks/
├── types/
└── utils/

Đây là cấu trúc tham khảo. Hãy kiểm tra kiến trúc hiện tại và điều chỉnh phù hợp, không tạo thêm một hệ thống source song song không cần thiết.

---

# 7. QUY TẮC CODE VÀ CHẤT LƯỢNG

1. Tái sử dụng component tối đa.
2. Không copy-paste style giữa các màn hình.
3. Không hardcode màu sắc riêng.
4. Không tạo button mới khi đã có AppButton.
5. Không tạo modal riêng khi đã có AppModal.
6. Tách UI khỏi nghiệp vụ.
7. TypeScript phải có type rõ ràng.
8. Không sử dụng any tùy tiện.
9. Không tạo dữ liệu giả trong production.
10. Không phá vỡ chức năng hiện tại của ứng dụng.
11. Không thay đổi API hoặc backend nếu không thực sự cần thiết.
12. Không tạo component quá lớn chứa toàn bộ màn hình và nghiệp vụ.
13. Kiểm tra tương thích Expo Go trước khi cài thư viện mới.

---

# 8. QUY TRÌNH TRIỂN KHAI BẮT BUỘC

Không được triển khai tất cả màn hình cùng một lúc theo cách thiếu kiểm soát.

### PHASE 1 – AUDIT

- Đọc cấu trúc source code hiện tại.
- Kiểm tra Expo SDK.
- Kiểm tra React Native.
- Kiểm tra thư viện đang sử dụng.
- Kiểm tra navigation.
- Kiểm tra các màn hình Admin hiện tại.
- Xác định component có thể tái sử dụng.
- Không tự ý xóa code cũ khi chưa đánh giá.

### PHASE 2 – DESIGN SYSTEM

Xây dựng hoàn chỉnh:
- Design Tokens.
- Typography.
- Spacing.
- Colors.
- Radius.
- Shadows.
- Shared Components.
- Button System.
- Card System.
- Input System.
- Modal System.

Tạo một màn hình hoặc khu vực showcase component để kiểm tra tất cả biến thể trước khi áp dụng toàn bộ.

### PHASE 3 – ADMIN NAVIGATION

Xây dựng cấu trúc điều hướng dành riêng cho Admin.

Navigation phải:
- Dễ sử dụng bằng một tay.
- Không quá nhiều tab.
- Có trạng thái active rõ ràng.
- Có tiêu đề màn hình thống nhất.
- Có điều hướng chi tiết và quay lại tự nhiên.

### PHASE 4 – BUILD SCREENS

Triển khai lần lượt:

1. Dashboard.
2. Quản lý bệnh lý.
3. Quản lý bài tập.
4. Quản lý bác sĩ.
5. Quản lý người dùng.
6. Quản lý lộ trình.

Mỗi màn hình phải sử dụng Shared Components.

### PHASE 5 – TESTING

Kiểm tra:
- iPhone màn hình nhỏ.
- iPhone màn hình lớn.
- Safe Area.
- Bàn phím.
- Scroll.
- Modal.
- Bottom Sheet.
- Navigation.
- Loading.
- Empty State.
- Error State.
- Dữ liệu dài.
- Mất kết nối API.

---

# 9. TIÊU CHÍ NGHIỆM THU

Chỉ coi là hoàn thành khi:

- Tất cả màn hình Admin có cùng Design System.
- Button đồng nhất.
- Card đồng nhất.
- Font và typography đồng nhất.
- Khoảng cách đồng nhất.
- Modal và Bottom Sheet đồng nhất.
- Không có màn hình bị tràn ngang.
- Không bị che bởi Dynamic Island hoặc Home Indicator.
- Không bị lỗi bàn phím iOS.
- Responsive trên nhiều kích thước iPhone.
- Chạy được trên Expo Go.
- Không phát sinh lỗi TypeScript.
- Không làm hỏng các chức năng đang có.

## YÊU CẦU CUỐI CÙNG

Trước tiên, hãy phân tích source code hiện tại và đưa ra kế hoạch triển khai.

Sau đó bắt đầu từ PHASE 1 và PHASE 2.

Ưu tiên hoàn thiện Design System và Shared Component Library trước. Chỉ khi các component dùng chung đã ổn định mới triển khai các màn hình Admin.

Không được bỏ qua bước này và không được tự ý xây dựng mỗi màn hình theo một phong cách riêng.

Mục tiêu cuối cùng là tạo ra một Admin Mobile App chuyên nghiệp, hiện đại, nhất quán, dễ sử dụng trên iPhone và có kiến trúc đủ tốt để tiếp tục mở rộng dự án Health Assistant.