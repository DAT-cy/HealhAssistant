import * as SecureStore from 'expo-secure-store';
import { apiClient } from '@/api/client';
import { authService } from '@/api/services/auth.service';
import { navigationService } from '@/routes';
import { useUserStore } from './user';

jest.mock('@/api/services/auth.service', () => ({ authService: { login: jest.fn(), profile: jest.fn() } }));
jest.mock('@/routes', () => ({ navigationService: { replace: jest.fn(), navigate: jest.fn(), goBack: jest.fn() } }));

const secureStore = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const mockedAuth = authService as jest.Mocked<typeof authService>;
const initialState = useUserStore.getState();

beforeEach(() => {
  secureStore.clear();
  apiClient.setToken(null);
  useUserStore.setState(initialState, true);
});

describe('useUserStore.init', () => {
  it('không có token -> chưa đăng nhập, đã khởi tạo', async () => {
    await useUserStore.getState().init();
    expect(useUserStore.getState()).toMatchObject({ token: null, role: null, initialized: true });
    expect(mockedAuth.profile).not.toHaveBeenCalled();
  });

  it('có token hợp lệ -> nạp username + role từ /auth/profile', async () => {
    secureStore.set('auth_token', 'tok-1');
    mockedAuth.profile.mockResolvedValue({ username: 'bs.an', role: 'ROLE_DOCTOR' });
    await useUserStore.getState().init();
    expect(useUserStore.getState()).toMatchObject({ token: 'tok-1', username: 'bs.an', role: 'ROLE_DOCTOR', initialized: true });
  });

  it('token hết hạn -> xoá token khỏi máy và về trạng thái chưa đăng nhập', async () => {
    secureStore.set('auth_token', 'expired');
    mockedAuth.profile.mockRejectedValue(new Error('401'));
    await useUserStore.getState().init();
    expect(useUserStore.getState()).toMatchObject({ token: null, role: null, initialized: true });
    expect(secureStore.has('auth_token')).toBe(false);
  });
});

describe('useUserStore.login / logout', () => {
  it('login lưu token vào SecureStore và cập nhật role', async () => {
    mockedAuth.login.mockResolvedValue({ token: 'tok-2', username: 'admin', role: 'ROLE_ADMIN' });
    await useUserStore.getState().login('admin', 'admin');
    expect(mockedAuth.login).toHaveBeenCalledWith('admin', 'admin');
    expect(secureStore.get('auth_token')).toBe('tok-2');
    expect(useUserStore.getState()).toMatchObject({ token: 'tok-2', username: 'admin', role: 'ROLE_ADMIN', initialized: true });
  });

  it('login thất bại -> giữ nguyên trạng thái chưa đăng nhập', async () => {
    mockedAuth.login.mockRejectedValue(new Error('sai mật khẩu'));
    await expect(useUserStore.getState().login('admin', 'x')).rejects.toThrow('sai mật khẩu');
    expect(useUserStore.getState().token).toBeNull();
    expect(secureStore.has('auth_token')).toBe(false);
  });

  it('logout xoá token, reset state và chuyển về Login', async () => {
    await useUserStore.getState().completeLogin({ token: 'tok-3', username: 'user', role: 'ROLE_USER' });
    await useUserStore.getState().logout();
    expect(secureStore.has('auth_token')).toBe(false);
    expect(useUserStore.getState()).toMatchObject({ token: null, username: '', role: null });
    expect(navigationService.replace).toHaveBeenCalledWith('Login');
  });
});
