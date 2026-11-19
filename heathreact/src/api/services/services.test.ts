/**
 * Kiểm tra mỗi service gọi đúng method + URL + body như backend đang expose.
 * Nếu ai đó đổi đường dẫn API mà quên đổi frontend (hoặc ngược lại), test này báo đỏ.
 */
import { envelope, fetchCall, mockFetch } from '@/test-utils/fetch';
import { adminService } from './admin.service';
import { authService } from './auth.service';
import { diseaseService } from './disease.service';
import { doctorRequestService } from './doctor-request.service';
import { doctorService } from './doctor.service';
import { profileService } from './profile.service';

const API = 'http://api.test/api/v1';

async function call(run: () => Promise<unknown>) {
  const fetchMock = mockFetch({ body: envelope({}) });
  await run();
  const { url, init, body } = fetchCall(fetchMock);
  return { url, method: init.method ?? 'GET', body };
}

describe('authService', () => {
  it('login', async () => {
    expect(await call(() => authService.login('user', 'pw'))).toEqual({ url: `${API}/auth/login`, method: 'POST', body: { username: 'user', password: 'pw' } });
  });
  it('signUp', async () => {
    expect(await call(() => authService.signUp('a@b.c', 'pw'))).toEqual({ url: `${API}/auth/signup`, method: 'POST', body: { email: 'a@b.c', password: 'pw' } });
  });
  it('verifyOtp', async () => {
    expect(await call(() => authService.verifyOtp('a@b.c', 'REGISTER', '123456'))).toEqual({ url: `${API}/auth/otp/verify`, method: 'POST', body: { email: 'a@b.c', purpose: 'REGISTER', code: '123456' } });
  });
  it('profile', async () => {
    expect(await call(() => authService.profile())).toMatchObject({ url: `${API}/auth/profile`, method: 'GET' });
  });
});

describe('profileService', () => {
  it('getMine', async () => {
    expect(await call(() => profileService.getMine())).toMatchObject({ url: `${API}/profiles/me`, method: 'GET' });
  });
});

describe('adminService', () => {
  it('users: encode từ khoá tìm kiếm và lọc enabled', async () => {
    expect((await call(() => adminService.users('nguyễn a&b', false))).url).toBe(`${API}/admin/users?q=nguy%E1%BB%85n%20a%26b&enabled=false`);
  });
  it('users: không truyền enabled thì không thêm param', async () => {
    expect((await call(() => adminService.users())).url).toBe(`${API}/admin/users?q=`);
  });
  it('setUserStatus / setUserRole', async () => {
    expect(await call(() => adminService.setUserStatus(7, true))).toMatchObject({ url: `${API}/admin/users/7/status?enabled=true`, method: 'PATCH' });
    expect(await call(() => adminService.setUserRole(7, 'ROLE_DOCTOR'))).toMatchObject({ url: `${API}/admin/users/7/role?role=ROLE_DOCTOR`, method: 'PATCH' });
  });
});

describe('doctorService', () => {
  it('dashboard / reviews', async () => {
    expect(await call(() => doctorService.dashboard())).toMatchObject({ url: `${API}/doctor/dashboard`, method: 'GET' });
    expect((await call(() => doctorService.reviews('PENDING'))).url).toBe(`${API}/doctor/reviews?status=PENDING`);
  });
  it('decide gửi action + note', async () => {
    expect(await call(() => doctorService.decide(3, 'APPROVE', 'Ổn'))).toEqual({ url: `${API}/doctor/reviews/3/decision`, method: 'POST', body: { action: 'APPROVE', note: 'Ổn' } });
  });
  it('updatePolicy gửi đủ body', async () => {
    const body = { severity: 'HIGH' as const, doctorRequired: true, roadmapConfirmationRequired: true, aiAllowed: false, priority: 1, reason: 'test' };
    expect(await call(() => doctorService.updatePolicy(5, body))).toEqual({ url: `${API}/doctor/diseases/5/policy`, method: 'PATCH', body });
  });
});

describe('diseaseService / doctorRequestService', () => {
  it('list bệnh cho người dùng', async () => {
    expect((await call(() => diseaseService.list('tim mạch'))).url).toBe(`${API}/health/diseases?q=tim%20m%E1%BA%A1ch`);
  });
  it('yêu cầu bác sĩ của tôi', async () => {
    expect((await call(() => doctorRequestService.mine())).url).toBe(`${API}/doctor-requests`);
    expect((await call(() => doctorRequestService.get(9))).url).toBe(`${API}/doctor-requests/9`);
    const reply = await call(() => doctorRequestService.reply(9, 'Đang uống thuốc'));
    expect(reply.url).toBe(`${API}/doctor-requests/9/reply`);
    expect(reply.method).toBe('POST');
    expect(reply.body).toEqual({ message: 'Đang uống thuốc' });
  });

  it('profile: chỉ bật đồng ý sử dụng dữ liệu bằng PATCH riêng', async () => {
    const { profileService } = jest.requireActual('./profile.service');
    const req = await call(() => profileService.updateConsent(true));
    expect(req.url).toBe(`${API}/profiles/me/consent`);
    expect(req.method).toBe('PATCH');
    expect(req.body).toEqual({ consent: true });
  });
});
