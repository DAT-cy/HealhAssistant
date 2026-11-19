import { QueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/stores/user';
import { clearCacheOnSessionChange } from './sessionCache';

describe('clearCacheOnSessionChange', () => {
  it('đổi tài khoản thì xoá dữ liệu hồ sơ của tài khoản trước', () => {
    const queryClient = new QueryClient();
    useUserStore.setState({ token: 'token-user1', username: 'user1' });
    const unsubscribe = clearCacheOnSessionChange(queryClient);
    queryClient.setQueryData(['profile', 'me'], { heightCm: 170 });

    useUserStore.setState({ token: null, username: '' }); // đăng xuất
    expect(queryClient.getQueryData(['profile', 'me'])).toBeUndefined();

    queryClient.setQueryData(['profile', 'me'], { heightCm: 170 });
    useUserStore.setState({ token: 'token-test01', username: 'test01' }); // đăng nhập tài khoản khác
    expect(queryClient.getQueryData(['profile', 'me'])).toBeUndefined();
    unsubscribe();
  });

  it('không xoá khi phiên không đổi (vd. cập nhật profileComplete)', () => {
    const queryClient = new QueryClient();
    useUserStore.setState({ token: 't', username: 'u' });
    const unsubscribe = clearCacheOnSessionChange(queryClient);
    queryClient.setQueryData(['profile', 'me'], { heightCm: 170 });
    useUserStore.setState({ profileComplete: true });
    expect(queryClient.getQueryData(['profile', 'me'])).toEqual({ heightCm: 170 });
    unsubscribe();
  });
});
