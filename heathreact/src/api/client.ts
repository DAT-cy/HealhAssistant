import { ApiEnvelope } from './types';
import { baseURL } from '@/config/api.config';

const TIMEOUT = 10000;
const AI_TIMEOUT = 150000; // AI tạo 3 phương án có thể mất 1-2 phút

export class ApiError extends Error {
  constructor(public status: number, public code: string | null, message: string, public validationErrors: Record<string, string> = {}) { super(message); this.name = 'ApiError'; }
}

/** Dev: in mọi lỗi API ra console (thấy trong terminal Expo và React Native DevTools). */
function logApiError(method: string, path: string, status: number, code: string | null, message: string, data?: unknown) {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || process.env.NODE_ENV === 'test') return;
  console.warn(`[API] ${method} ${path} -> ${status} ${code ?? ''} ${message}`, data ?? '');
}

/** Dev: ghép chi tiết kỹ thuật (backend trả khi APP_DEBUG_ERRORS=true) vào thông báo lỗi để thấy ngay trên app. */
function withDebugDetail(message: string, code: string | null, errors: Record<string, string>) {
  if (typeof __DEV__ === 'undefined' || !__DEV__ || !errors.detail) return message;
  return `${message}\n[${code ?? 'ERR'}] ${errors.detail}`;
}

let sessionToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const apiClient = {
  setToken(token: string | null) { sessionToken = token; },
  setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; },
  async request<T>(path: string, init: RequestInit & { ai?: boolean; timeoutMs?: number } = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? (init.ai ? AI_TIMEOUT : TIMEOUT));
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json;charset=UTF-8';
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    let response: Response;
    try {
      response = await fetch(`${baseURL}${path}`, { ...init, headers, signal: controller.signal });
    } catch (error) {
      logApiError(init.method ?? 'GET', path, 0, 'NETWORK', error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      throw new ApiError(0, 'NETWORK', error instanceof Error && error.name === 'AbortError' ? 'Yêu cầu quá thời gian chờ.' : 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.');
    } finally { clearTimeout(timeout); }
    let envelope: ApiEnvelope<T>;
    try { envelope = (await response.json()) as ApiEnvelope<T>; } catch {
      logApiError(init.method ?? 'GET', path, response.status, null, 'Response không phải JSON');
      throw new ApiError(response.status, null, 'Phản hồi máy chủ không hợp lệ.');
    }
    if (envelope.statusCode === 401) {
      const isAuthenticationAttempt = /(?:^|\/)auth\/(?:login|signup)(?:\?|$)/.test(path);
      if (!isAuthenticationAttempt && onUnauthorized) onUnauthorized();

      const message = isAuthenticationAttempt
        ? envelope.responseCode === 'AUTH-ERR-408'
          ? 'Tài khoản hoặc mật khẩu không chính xác.'
          : envelope.responseCode === 'AUTH-ERR-413'
            ? 'Tài khoản đã bị vô hiệu hóa.'
            : envelope.responseMessage || 'Đăng nhập không thành công.'
        : 'Phiên đăng nhập đã hết hạn.';
      throw new ApiError(401, envelope.responseCode, message);
    }
    if (envelope.statusCode >= 400 || !response.ok) {
      const errors = envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data) ? (envelope.data as Record<string, string>) : {};
      logApiError(init.method ?? 'GET', path, envelope.statusCode, envelope.responseCode, envelope.responseMessage, envelope.data);
      throw new ApiError(envelope.statusCode, envelope.responseCode, withDebugDetail(envelope.responseMessage || 'Yêu cầu thất bại.', envelope.responseCode, errors), errors);
    }
    if (envelope.data === null || envelope.data === undefined) throw new ApiError(envelope.statusCode, envelope.responseCode, 'Không có dữ liệu để hiển thị.');
    return envelope.data;
  },
};
