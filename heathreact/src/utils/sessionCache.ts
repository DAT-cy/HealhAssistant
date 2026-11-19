import type { QueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/stores/user';

/**
 * Xoá toàn bộ dữ liệu đã lưu tạm (React Query) mỗi khi đổi phiên đăng nhập
 * (đăng xuất, đăng nhập tài khoản khác). Nếu không, tài khoản mới sẽ thấy
 * hồ sơ / lộ trình của tài khoản trước.
 * @returns hàm huỷ đăng ký
 */
export function clearCacheOnSessionChange(queryClient: QueryClient) {
  return useUserStore.subscribe((state, previous) => {
    if (state.token !== previous.token || state.username !== previous.username) queryClient.clear();
  });
}
