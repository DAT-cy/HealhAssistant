import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { adminService, type AdminDashboard, type AdminUser } from '@/api/services/admin.service';
import { renderScreen } from '@/test-utils/render';
import AdminDashboardPage from './Dashboard';

jest.mock('@/api/services/admin.service', () => ({
  adminService: { dashboard: jest.fn(), users: jest.fn(), setUserStatus: jest.fn(), setUserRole: jest.fn() },
}));
jest.mock('@/routes', () => ({ navigationService: { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() } }));

const mocked = adminService as jest.Mocked<typeof adminService>;

const dashboard: AdminDashboard = {
  totalUsers: 12, activeUsers: 9, totalDoctors: 3, onlineDoctors: 1, totalDiseases: 5, totalDocuments: 7,
  documentsProcessing: 0, documentsFailed: 0, totalRoadmaps: 20, roadmapsAwaitingDoctor: 2, roadmapsConfirmed: 15,
};
const user = (patch: Partial<AdminUser>): AdminUser => ({
  id: 1, username: 'user', email: null, displayName: null, role: 'ROLE_USER', enabled: true, emailVerified: true, createdAt: null, ...patch,
});

beforeEach(() => {
  mocked.dashboard.mockResolvedValue(dashboard);
  mocked.users.mockResolvedValue([
    user({ id: 1, username: 'admin', role: 'ROLE_ADMIN' }),
    user({ id: 2, username: 'bs.an', displayName: 'BS An', role: 'ROLE_DOCTOR' }),
    user({ id: 3, username: 'user', email: 'u@test.vn', enabled: false }),
  ]);
  mocked.setUserStatus.mockResolvedValue(user({}));
});

describe('Admin Dashboard', () => {
  it('hiển thị số liệu tổng quan từ API', async () => {
    await renderScreen(<AdminDashboardPage />);
    expect(await screen.findByText('12')).toBeTruthy();
    expect(screen.getAllByText('Người dùng').length).toBeGreaterThan(0);
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('báo lỗi khi không tải được dashboard', async () => {
    mocked.dashboard.mockRejectedValue(new Error('500'));
    await renderScreen(<AdminDashboardPage />);
    expect(await screen.findByText('Không thể tải dashboard. Hãy thử lại.')).toBeTruthy();
  });

  it('liệt kê người dùng với nhãn role; admin không có nút khoá', async () => {
    await renderScreen(<AdminDashboardPage />);
    expect(await screen.findByText('BS An')).toBeTruthy();
    expect(screen.getByText('bs.an · Bác sĩ')).toBeTruthy();
    expect(screen.getByText('u@test.vn · Người dùng')).toBeTruthy();
    expect(screen.getByText('ADMIN')).toBeTruthy();
    expect(screen.getByText('3 bản ghi')).toBeTruthy();
  });

  it('bấm trạng thái -> đảo enabled của đúng user rồi tải lại danh sách', async () => {
    await renderScreen(<AdminDashboardPage />);
    await screen.findByText('u@test.vn · Người dùng');
    const locked = screen.getAllByText('Đã khóa'); // [0] = chip lọc, [cuối] = nút trạng thái của user #3
    await fireEvent.press(locked[locked.length - 1]);
    await waitFor(() => expect(mocked.setUserStatus).toHaveBeenCalledWith(3, true));
    await waitFor(() => expect(mocked.users).toHaveBeenCalledTimes(2));
  });

  it('lọc "Đã khóa" và tìm kiếm truyền đúng tham số', async () => {
    await renderScreen(<AdminDashboardPage />);
    await screen.findByText('BS An');
    await fireEvent.press(screen.getAllByText('Đã khóa')[0]); // chip lọc nằm trước danh sách
    await waitFor(() => expect(mocked.users).toHaveBeenLastCalledWith('', false));
    await fireEvent.changeText(screen.getByPlaceholderText('Tìm tên, email, tài khoản'), 'an');
    await waitFor(() => expect(mocked.users).toHaveBeenLastCalledWith('an', false));
  });
});
