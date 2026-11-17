import { navigationService } from './index';
import { useUserStore } from '@/stores/user';

/**
 * AppRouter: Trung tâm điều khiển toàn bộ luồng đi của ứng dụng.
 * Thay vì ở giao diện (UI) bạn gọi navigationService.navigate('Home'), 
 * bạn chỉ cần gọi AppRouter.goToHome(). 
 * 
 * Lợi ích: Nếu sau này đổi luồng (ví dụ: login xong bắt phải vào trang Cài đặt thay vì Home),
 * bạn chỉ cần sửa duy nhất ở file này, không cần tìm và sửa trong các màn hình giao diện.
 */
export const AppRouter = {
  // Luồng Đăng nhập / Đăng ký
  goToLogin: () => {
    navigationService.replace('Login');
  },
  onLoginSuccess: () => {
    const role = useUserStore.getState().role;
    const destination = role === 'ROLE_ADMIN' ? 'AdminDashboard' : role === 'ROLE_DOCTOR' ? 'DoctorDashboard' : 'Home';
    navigationService.replace(destination);
  },
  onLogout: () => {
    navigationService.replace('Login');
  },

  // Luồng Trang chủ & Điều hướng thông thường
  goToHome: () => {
    navigationService.navigate('Home');
  },
  // Luồng Báo lỗi
  goToNotFound: () => {
    navigationService.navigate('NotFound');
  },
};
