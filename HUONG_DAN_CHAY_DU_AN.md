# Hướng dẫn chạy dự án từ đầu

## 1. Cài phần mềm trên máy mới

Trên Windows, cài các phần mềm sau:

1. **Git for Windows:** <https://git-scm.com/download/win>
2. **Node.js LTS:** <https://nodejs.org/en/download> (Node.js `22.13.0` trở lên)
3. **Docker Desktop:** <https://www.docker.com/products/docker-desktop/>
4. **Expo Go:** cài từ Google Play hoặc App Store nếu chạy bằng điện thoại thật.

Muốn chạy Android Emulator thì cài thêm Android Studio, Android SDK và một Android Virtual Device: <https://developer.android.com/studio>

Mở Docker Desktop và chờ Docker báo đang chạy.

## 2. Lấy mã nguồn

Nếu chưa có source code, mở PowerShell tại thư mục muốn lưu dự án:

```powershell
git clone <URL_REPOSITORY>
cd "D:\Do An Heath React"
```

Thay `<URL_REPOSITORY>` bằng URL Git thật của dự án. Nếu source đã được chép sẵn vào máy, bỏ qua bước `git clone`.

Kiểm tra Node.js, npm và Docker:

```powershell
docker --version
node --version
npm --version
```

Node.js cần phiên bản `22.13.0` trở lên. Nếu PowerShell chặn script npm, chạy một lần:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## 3. Chạy Backend và MySQL

Mở PowerShell tại thư mục dự án:

```powershell
cd "D:\Do An Heath React"
Copy-Item HealthAssistantProject\.env.example HealthAssistantProject\.env
docker compose -f HealthAssistantProject\docker-compose.yml up -d --build mysql backend
```

Kiểm tra backend:

- API: <http://localhost:8084/api/v1>
- Swagger: <http://localhost:8084/swagger-ui/index.html>

Xem log backend nếu cần:

```powershell
docker compose -f HealthAssistantProject\docker-compose.yml logs -f backend
```

## 4. Cài và chạy Frontend

Mở PowerShell khác:

```powershell
cd "D:\Do An Heath React\heathreact"
Copy-Item .env.example .env
npm ci
```

Mở file `heathreact/.env`, chọn API URL phù hợp:

```env
# Android Emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8084
```

Hoặc:

```env
# iOS Simulator hoặc trình duyệt
EXPO_PUBLIC_API_BASE_URL=http://localhost:8084
```

```env
# Điện thoại thật, thay bằng IP LAN của máy tính
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8084
```

Chạy Expo:

```powershell
npm start
```

## 5. Chọn cách mở ứng dụng

Khi Expo hiện menu trong terminal:

- Nhấn `a`: mở Android Emulator.
- Nhấn `w`: mở trên trình duyệt.
- Nhấn `i`: mở iOS Simulator, chỉ dùng trên macOS.
- Quét mã QR bằng ứng dụng Expo Go trên điện thoại thật.

Nếu dùng điện thoại thật, máy tính và điện thoại phải cùng Wi-Fi.

## 6. Khi sửa file `.env`

Dừng Expo bằng `Ctrl + C`, sau đó chạy lại:

```powershell
npm start
```

## 7. Dừng dự án

Dừng frontend bằng `Ctrl + C`. Dừng backend nhưng giữ lại dữ liệu MySQL:

```powershell
cd "D:\Do An Heath React"
docker compose -f HealthAssistantProject\docker-compose.yml down
```

Không dùng `down -v` nếu vẫn muốn giữ dữ liệu database.
