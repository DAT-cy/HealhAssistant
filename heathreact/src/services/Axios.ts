import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { settings } from '@/config/settings';

// ============================================================
// Axios instance – singleton
// ============================================================
let instance: ReturnType<typeof axios.create> | null = null;

function getInstance() {
  if (instance) return instance;

  instance = axios.create({
    baseURL: settings.baseURL,
    timeout: settings.requestTimeout,
    headers: { 'Content-Type': settings.contentType },
  });

  // ── Request interceptor: gắn token ──
  instance.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItem(settings.tokenName);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // ── Response interceptor: check status code ──
  instance.interceptors.response.use(
    (response) => {
      const code = response.data.code ?? response.data.statusCode;
      const codes = Array.isArray(settings.successCode) ? settings.successCode : [settings.successCode];
      if (codes.includes(code)) return response.data;
      handleError(code, response.data.msg ?? response.data.message ?? '', response.config.url!);
      return Promise.reject(response.data);
    },
    (error) => {
      const { response, message } = error;
      if (response?.data) {
        handleError(response.status, response.data.msg ?? message, response.config?.url ?? '');
      } else {
        const msg =
          message === 'Network Error' ? 'Không thể kết nối server.' :
          message.includes('timeout') ? 'Yêu cầu bị timeout.' :
          'Đã xảy ra lỗi không xác định.';
        handleError(-1, msg, error.config?.url ?? '');
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

// ============================================================
// Error handler
// ============================================================
function handleError(code: number, msg: string, url: string) {
  console.warn(`[Axios Error] url=${url} code=${code} msg=${msg}`);
  // TODO: gắn Toast / Alert / navigate tùy code
}

// ============================================================
// API methods
// ============================================================
export const Axios = {
  get: <T = unknown>(url: string, params = {}, config = {}) =>
    getInstance().get<T>(url, { params, ...config }),

  post: <T = unknown>(url: string, data = {}, config = {}) =>
    getInstance().post<T>(url, data, config),

  put: <T = unknown>(url: string, data = {}, config = {}) =>
    getInstance().put<T>(url, data, config),

  patch: <T = unknown>(url: string, data = {}, config = {}) =>
    getInstance().patch<T>(url, data, config),

  delete: <T = unknown>(url: string, data = {}, config = {}) =>
    getInstance().delete<T>(url, { data, ...config }),
};
