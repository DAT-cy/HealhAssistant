# Test frontend (heathreact)

Mục tiêu: **mỗi lần thêm hoặc sửa chức năng, chạy `npm run check` mà vẫn xanh thì chức năng cũ không bị hỏng.**

## Lệnh

| Lệnh | Khi nào dùng |
|---|---|
| `npm test` | Chạy toàn bộ test (khoảng 3 giây) |
| `npm run test:watch` | Đang code: tự chạy lại test liên quan mỗi khi lưu file |
| `npm run typecheck` | Kiểm tra lỗi TypeScript toàn project |
| `npm run check` | **Chạy trước khi commit/push**: typecheck + test |
| `npm run test:ci` | Giống CI, có báo cáo coverage trong `coverage/` |

GitHub Actions (`.github/workflows/frontend-ci.yml`) tự chạy typecheck + test mỗi lần push hoặc mở PR có sửa `heathreact/`.

## Đang có test cho

| File test | Bảo vệ điều gì |
|---|---|
| `src/api/client.test.ts` | Gắn token, xử lý 401 (đăng xuất / sai mật khẩu), lỗi validate 400, mất mạng, timeout |
| `src/api/services/services.test.ts` | Mỗi service gọi đúng method + URL + body của backend |
| `src/stores/user.test.ts` | Khởi động app, đăng nhập, token hết hạn, đăng xuất |
| `src/utils/profileCompletion.test.ts` | Điều kiện "hồ sơ đã hoàn thành" trước khi tạo lộ trình |
| `__tests__/role-routing.test.tsx` | Điều hướng theo role (USER / ADMIN / DOCTOR) và chặn truy cập sai khu vực |
| `src/features/Admin/pages/Dashboard.test.tsx` | Dashboard admin: số liệu, danh sách user, khoá/mở, lọc |
| `src/features/Doctor/pages/Dashboard.test.tsx` | Dashboard bác sĩ: tổng quan, bệnh lý, yêu cầu duyệt |

## Quy ước khi viết chức năng mới

1. **Đặt test cạnh file code**: `Foo.tsx` → `Foo.test.tsx`. Riêng test cho route trong `app/` thì để ở `__tests__/`.
   Không đặt file test trong `app/`, vì Expo Router sẽ coi nó là một màn hình.
2. **Service mới** → thêm vài dòng vào `services.test.ts` để khoá URL/method/body.
3. **Logic thuần** (tính toán, validate, chuyển đổi dữ liệu) → tách ra `src/utils` hoặc `src/features/*/utils` rồi test trực tiếp, không cần render.
4. **Màn hình** → mock service bằng `jest.mock(...)`, render bằng `renderScreen()` trong `src/test-utils/render.tsx`.
   Kiểm tra theo những gì người dùng thấy và bấm (`getByText`, `fireEvent.press`), không kiểm tra style.
5. **Sửa bug** → viết test tái hiện bug trước (đỏ), sửa code cho xanh. Bug đó sẽ không quay lại.

### Mẫu test màn hình

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { fooService } from '@/api/services/foo.service';
import { renderScreen } from '@/test-utils/render';
import FooPage from './Foo';

jest.mock('@/api/services/foo.service', () => ({ fooService: { list: jest.fn(), save: jest.fn() } }));
const mocked = fooService as jest.Mocked<typeof fooService>;

it('lưu xong thì gọi API đúng tham số', async () => {
  mocked.list.mockResolvedValue([]);
  await renderScreen(<FooPage />);
  await fireEvent.press(await screen.findByText('Lưu'));
  await waitFor(() => expect(mocked.save).toHaveBeenCalledWith(/* ... */));
});
```

Lưu ý: với `@testing-library/react-native` v14, `render`, `fireEvent.*` đều là hàm async, nhớ `await`.
