import { ApiError, apiClient } from './client';
import { envelope, fetchCall, mockFetch } from '@/test-utils/fetch';

describe('apiClient.request', () => {
  afterEach(() => {
    apiClient.setToken(null);
    apiClient.setUnauthorizedHandler(null);
  });

  it('ghép baseURL + path và trả về `data` trong envelope', async () => {
    const fetchMock = mockFetch({ body: envelope({ id: 1 }) });
    await expect(apiClient.request('/api/v1/x')).resolves.toEqual({ id: 1 });
    expect(fetchCall(fetchMock).url).toBe('http://api.test/api/v1/x');
  });

  it('gắn Authorization Bearer khi đã có token, và bỏ đi sau khi xoá token', async () => {
    const fetchMock = mockFetch({ body: envelope(true) }, { body: envelope(true) });
    apiClient.setToken('abc');
    await apiClient.request('/a');
    apiClient.setToken(null);
    await apiClient.request('/b');
    expect(fetchCall(fetchMock, 0).headers.Authorization).toBe('Bearer abc');
    expect(fetchCall(fetchMock, 1).headers.Authorization).toBeUndefined();
  });

  it('mặc định gửi JSON, nhưng không ép Content-Type khi body là FormData', async () => {
    const fetchMock = mockFetch({ body: envelope(true) }, { body: envelope(true) });
    await apiClient.request('/json', { method: 'POST', body: '{}' });
    await apiClient.request('/upload', { method: 'POST', body: new FormData() });
    expect(fetchCall(fetchMock, 0).headers['Content-Type']).toContain('application/json');
    expect(fetchCall(fetchMock, 1).headers['Content-Type']).toBeUndefined();
  });

  it('401 ở API thường: gọi handler đăng xuất và báo phiên hết hạn', async () => {
    mockFetch({ body: envelope(null, 401, 'COMMON-ERR-402', 'UNAUTHORIZED'), httpStatus: 401 });
    const onUnauthorized = jest.fn();
    apiClient.setUnauthorizedHandler(onUnauthorized);
    await expect(apiClient.request('/api/v1/profile')).rejects.toMatchObject({ status: 401, message: 'Phiên đăng nhập đã hết hạn.' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['AUTH-ERR-408', 'Tài khoản hoặc mật khẩu không chính xác.'],
    ['AUTH-ERR-413', 'Tài khoản đã bị vô hiệu hóa.'],
  ])('401 khi đăng nhập (%s): KHÔNG đăng xuất, trả thông báo dễ hiểu', async (code, message) => {
    mockFetch({ body: envelope(null, 401, code, 'x'), httpStatus: 401 });
    const onUnauthorized = jest.fn();
    apiClient.setUnauthorizedHandler(onUnauthorized);
    await expect(apiClient.request('/api/v1/auth/login', { method: 'POST' })).rejects.toMatchObject({ status: 401, code, message });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('lỗi 400 kèm validationErrors theo field', async () => {
    mockFetch({ body: envelope({ email: 'Email không hợp lệ' }, 400, 'COMMON-ERR-400', 'Dữ liệu không hợp lệ'), httpStatus: 400 });
    const error = await apiClient.request('/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Dữ liệu không hợp lệ', validationErrors: { email: 'Email không hợp lệ' } });
  });

  it('mất mạng -> ApiError NETWORK', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    await expect(apiClient.request('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('quá thời gian chờ -> báo timeout', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    global.fetch = jest.fn().mockRejectedValue(abort) as unknown as typeof fetch;
    await expect(apiClient.request('/x')).rejects.toMatchObject({ code: 'NETWORK', message: 'Yêu cầu quá thời gian chờ.' });
  });

  it('phản hồi không phải JSON -> báo phản hồi không hợp lệ', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new SyntaxError('bad'); } }) as unknown as typeof fetch;
    await expect(apiClient.request('/x')).rejects.toMatchObject({ status: 502, message: 'Phản hồi máy chủ không hợp lệ.' });
  });

  it('thành công nhưng data null -> báo không có dữ liệu', async () => {
    mockFetch({ body: envelope(null) });
    await expect(apiClient.request('/x')).rejects.toMatchObject({ message: 'Không có dữ liệu để hiển thị.' });
  });
});
