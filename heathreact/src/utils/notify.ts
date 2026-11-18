import { toast } from 'sonner-native';

/**
 * Thông báo nổi (toast) dùng chung cho cả app, chạy trên sonner-native.
 * Gọi qua wrapper này thay vì import `toast` trực tiếp, để dễ đổi thư viện và dễ mock trong test.
 * Cần có <Toaster /> ở app/_layout.tsx.
 */
export const notify = {
  success: (title: string, description?: string) => { toast.success(title, { description }); },
  error: (title: string, description?: string) => { toast.error(title, { description }); },
  info: (title: string, description?: string) => { toast.info(title, { description }); },
  warning: (title: string, description?: string) => { toast.warning(title, { description }); },
};
