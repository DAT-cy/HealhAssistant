import type { ApiEnvelope } from '@/api/types';

/** Response giả theo envelope DefaultRes của backend. */
export function envelope<T>(data: T, statusCode = 200, responseCode = 'COMMON-SUC-200', responseMessage = 'OK'): ApiEnvelope<T> {
  return { statusCode, responseCode, responseMessage, data } as ApiEnvelope<T>;
}

/** Thay global.fetch bằng jest.fn trả về lần lượt các response truyền vào. */
export function mockFetch(...responses: { body: unknown; httpStatus?: number }[]) {
  const fn = jest.fn();
  responses.forEach(({ body, httpStatus = 200 }) => {
    fn.mockResolvedValueOnce({
      ok: httpStatus >= 200 && httpStatus < 300,
      status: httpStatus,
      json: async () => body,
    });
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

/** Lấy [url, init] của lần gọi fetch thứ `index`. */
export function fetchCall(fn: jest.Mock, index = 0) {
  const [url, init] = fn.mock.calls[index] as [string, RequestInit];
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
  return { url, init, headers: (init?.headers ?? {}) as Record<string, string>, body };
}
