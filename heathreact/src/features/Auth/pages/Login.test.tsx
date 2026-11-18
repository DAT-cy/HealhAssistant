import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ApiError } from '@/api/client';
import { authService } from '@/api/services/auth.service';
import { useUserStore } from '@/stores/user';
import { renderScreen } from '@/test-utils/render';
import LoginPage, { validateAuthForm } from './Login';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' }, NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@/api/services/auth.service', () => ({
  authService: { signUp: jest.fn(), verifyOtp: jest.fn(), resendOtp: jest.fn(), resetPassword: jest.fn() },
}));

const mockedAuth = authService as jest.Mocked<typeof authService>;
const login = jest.fn();
const completeLogin = jest.fn();

beforeEach(() => {
  login.mockResolvedValue(undefined);
  useUserStore.setState({ login, completeLogin });
});

describe('validateAuthForm', () => {
  it('đăng nhập: chỉ cần tài khoản + mật khẩu', () => {
    expect(validateAuthForm('login', { username: 'user', pwd: 'x', confirmPwd: '' })).toBeNull();
    expect(validateAuthForm('login', { username: '  ', pwd: 'x', confirmPwd: '' })).toBe('Vui lòng nhập tài khoản hoặc email.');
    expect(validateAuthForm('login', { username: 'user', pwd: '', confirmPwd: '' })).toBe('Vui lòng nhập mật khẩu.');
  });

  it('đăng ký: bắt buộc Gmail, mật khẩu >= 8 ký tự và xác nhận trùng khớp', () => {
    expect(validateAuthForm('signup', { username: 'a@yahoo.com', pwd: '12345678', confirmPwd: '12345678' })).toContain('@gmail.com');
    expect(validateAuthForm('signup', { username: 'a@gmail.com', pwd: '123', confirmPwd: '123' })).toContain('8 ký tự');
    expect(validateAuthForm('signup', { username: 'a@gmail.com', pwd: '12345678', confirmPwd: '87654321' })).toBe('Mật khẩu xác nhận không trùng khớp.');
    expect(validateAuthForm('signup', { username: 'a@gmail.com', pwd: '12345678', confirmPwd: '12345678' })).toBeNull();
  });
});

describe('Màn đăng nhập', () => {
  it('gõ được vào ô tài khoản / mật khẩu và đăng nhập đúng tham số (đã trim)', async () => {
    await renderScreen(<LoginPage />);
    await fireEvent.changeText(screen.getByTestId('login-username'), '  user  ');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'user');
    expect(screen.getByTestId('login-username').props.value).toBe('  user  ');
    await fireEvent.press(screen.getByLabelText('Đăng nhập'));
    await waitFor(() => expect(login).toHaveBeenCalledWith('user', 'user'));
  });

  it('bấm "next" trên bàn phím ở ô tài khoản thì chuyển sang ô mật khẩu (không lỗi)', async () => {
    await renderScreen(<LoginPage />);
    await fireEvent(screen.getByTestId('login-username'), 'submitEditing');
    expect(login).not.toHaveBeenCalled();
  });

  it('thiếu mật khẩu -> báo lỗi, không gọi API', async () => {
    await renderScreen(<LoginPage />);
    await fireEvent.changeText(screen.getByTestId('login-username'), 'user');
    await fireEvent.press(screen.getByLabelText('Đăng nhập'));
    expect(await screen.findByText('Vui lòng nhập mật khẩu.')).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
  });

  it('sai mật khẩu -> hiện thông báo từ server, gõ lại thì thông báo biến mất', async () => {
    login.mockRejectedValue(new ApiError(401, 'AUTH-ERR-408', 'Tài khoản hoặc mật khẩu không chính xác.'));
    await renderScreen(<LoginPage />);
    await fireEvent.changeText(screen.getByTestId('login-username'), 'user');
    await fireEvent.changeText(screen.getByTestId('login-password'), 'sai');
    await fireEvent.press(screen.getByLabelText('Đăng nhập'));
    expect(await screen.findByText('Tài khoản hoặc mật khẩu không chính xác.')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('login-password'), 'sai2');
    expect(screen.queryByText('Tài khoản hoặc mật khẩu không chính xác.')).toBeNull();
  });

  it('chuyển sang Đăng ký: có ô xác nhận, gửi signUp rồi sang bước nhập OTP', async () => {
    mockedAuth.signUp.mockResolvedValue({ message: 'Đã gửi mã', resendAfterSeconds: 60, expiresInSeconds: 300 } as never);
    await renderScreen(<LoginPage />);
    await fireEvent.press(screen.getByText('Đăng ký ngay'));
    await fireEvent.changeText(screen.getByTestId('login-username'), 'an@gmail.com');
    await fireEvent.changeText(screen.getByTestId('login-password'), '12345678');
    await fireEvent.changeText(screen.getByTestId('login-confirm-password'), '12345678');
    await fireEvent.press(screen.getByLabelText('Đăng ký'));
    await waitFor(() => expect(mockedAuth.signUp).toHaveBeenCalledWith('an@gmail.com', '12345678'));
    expect(await screen.findByText('Xác minh email')).toBeTruthy();
    expect(screen.getByTestId('otp-input')).toBeTruthy();
  });

  it('chỉ có MỘT nút Đăng nhập (không còn nút rỗng thừa)', async () => {
    await renderScreen(<LoginPage />);
    expect(screen.getAllByLabelText('Đăng nhập')).toHaveLength(1);
  });
});
