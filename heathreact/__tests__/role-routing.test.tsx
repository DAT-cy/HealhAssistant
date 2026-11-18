/**
 * Điều hướng theo role: cổng vào (app/index) và các layout chặn quyền.
 * Đây là phần hay bị hỏng khi thêm role/màn mới, nên mọi tổ hợp đều được kiểm tra.
 */
import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import type { Role } from '@/api/types';
import { useUserStore } from '@/stores/user';
import IndexRoute from '../app/index';
import UserLayout from '../app/(user)/_layout';
import AdminLayout from '../app/admin/_layout';
import DoctorLayout from '../app/doctor/_layout';

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const Stack = function MockStack() { return <Text>STACK</Text>; };
  Stack.Screen = function MockScreen() { return null; };
  return { router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) }, Stack };
});

const replace = router.replace as jest.Mock;

function setSession(role: Role | null, { initialized = true }: { initialized?: boolean } = {}) {
  useUserStore.setState({ initialized, token: role ? 'tok' : null, role, username: role ? 'u' : '' });
}

describe('app/index: trang đích sau khi khởi động', () => {
  it.each<[Role | null, string]>([
    [null, '/login'],
    ['ROLE_USER', '/(user)'],
    ['ROLE_ADMIN', '/admin'],
    ['ROLE_DOCTOR', '/doctor'],
  ])('role %s -> %s', async (role, expected) => {
    setSession(role);
    await render(<IndexRoute />);
    expect(replace).toHaveBeenCalledWith(expected);
  });

  it('chưa init xong thì chưa điều hướng', async () => {
    setSession('ROLE_USER', { initialized: false });
    await render(<IndexRoute />);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe.each([
  ['(user)', UserLayout, 'ROLE_USER' as Role],
  ['admin', AdminLayout, 'ROLE_ADMIN' as Role],
  ['doctor', DoctorLayout, 'ROLE_DOCTOR' as Role],
])('layout %s', (_name, Layout, ownRole) => {
  it('đúng role -> hiển thị nội dung, không điều hướng', async () => {
    setSession(ownRole);
    const screen = await render(<Layout />);
    expect(screen.getByText('STACK')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('chưa đăng nhập -> về /login, không lộ nội dung', async () => {
    setSession(null);
    const screen = await render(<Layout />);
    expect(replace).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('STACK')).toBeNull();
  });

  it.each((['ROLE_USER', 'ROLE_ADMIN', 'ROLE_DOCTOR'] as Role[]).filter((role) => role !== ownRole))(
    'role khác (%s) -> bị chuyển đi, không lộ nội dung',
    async (otherRole) => {
      setSession(otherRole);
      const screen = await render(<Layout />);
      expect(replace).toHaveBeenCalledTimes(1);
      expect(replace).not.toHaveBeenCalledWith('/login');
      expect(screen.queryByText('STACK')).toBeNull();
    },
  );
});
