import { ApiEnvelope } from './types';
import { baseURL } from '@/config/api.config';

const TIMEOUT = 10000;
const AI_TIMEOUT = 100000;

export class ApiError extends Error {
  constructor(public status: number, public code: string | null, message: string, public validationErrors: Record<string, string> = {}) { super(message); this.name = 'ApiError'; }
}

let sessionToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const apiClient = {
  setToken(token: string | null) { sessionToken = token; },
  setUnauthorizedHandler(handler: (() => void) | null) { onUnauthorized = handler; },
  async request<T>(path: string, init: RequestInit & { ai?: boolean } = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.ai ? AI_TIMEOUT : TIMEOUT);
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json;charset=UTF-8';
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
    let response: Response;
    try {
      response = await fetch(`${baseURL}${path}`, { ...init, headers, signal: controller.signal });
    } catch (error) {
      throw new ApiError(0, 'NETWORK', error instanceof Error && error.name === 'AbortError' ? 'Yêu cầu quá thời gian chờ.' : 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.');
    } finally { clearTimeout(timeout); }
    let envelope: ApiEnvelope<T>;
    try { envelope = (await response.json()) as ApiEnvelope<T>; } catch { throw new ApiError(response.status, null, 'Phản hồi máy chủ không hợp lệ.'); }
    if (envelope.statusCode === 401) {
      if (onUnauthorized) onUnauthorized();
      throw new ApiError(401, envelope.responseCode, 'Phiên đăng nhập đã hết hạn.');
    }
    if (envelope.statusCode >= 400 || !response.ok) {
      const errors = envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data) ? (envelope.data as Record<string, string>) : {};
      throw new ApiError(envelope.statusCode, envelope.responseCode, envelope.responseMessage || 'Yêu cầu thất bại.', errors);
    }
    if (envelope.data === null || envelope.data === undefined) throw new ApiError(envelope.statusCode, envelope.responseCode, 'Không có dữ liệu để hiển thị.');
    return envelope.data;
  },
};
