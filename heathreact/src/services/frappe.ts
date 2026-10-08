import { network } from '@/config/net.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Types
// ============================================================
export interface FrappeCallOptions {
  url?: string;
  method?: 'GET' | 'POST';
  args?: Record<string, unknown>;
}

export interface FrappeResponse<T = unknown> {
  message: T;
  exception?: string;
  exc?: string;
  data?: T;
}

// ============================================================
// Core
// ============================================================
async function call<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T>;
async function call<T>(options: FrappeCallOptions): Promise<T>;
async function call<T>(
  optionsOrCmd: FrappeCallOptions | string,
  maybeArgs?: Record<string, unknown>,
): Promise<T> {
  let opts: FrappeCallOptions;

  if (typeof optionsOrCmd === 'string') {
    // Gọi kiểu: frappe.call('cmd.name', { key: value })
    opts = { args: { cmd: optionsOrCmd, ...maybeArgs } };
  } else {
    opts = optionsOrCmd;
  }

  const siteUrl = opts.url ?? (await network.getSiteUrl());
  if (!siteUrl) throw new Error('Chưa cấu hình Frappe site URL.');

  const sid = await AsyncStorage.getItem(network.SID_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (sid) headers['Cookie'] = `sid=${sid}`;

  const method = opts.method ?? 'POST';
  let body: string | undefined;
  let finalUrl = siteUrl;

  if (method === 'GET' && opts.args) {
    const params = new URLSearchParams(
      Object.entries(opts.args).map(([k, v]) => [k, String(v)]),
    ).toString();
    finalUrl += `?${params}`;
  } else {
    body = JSON.stringify(opts.args);
  }

  const response = await fetch(finalUrl, { method, headers, body });
  const text = await response.text();

  let data: FrappeResponse<T>;
  try {
    data = JSON.parse(text) as FrappeResponse<T>;
  } catch {
    throw new Error(`Phản hồi không hợp lệ: ${text.slice(0, 200)}`);
  }

  if (data.exception || data.exc) {
    const msg: string = data.exception ?? (data.message as string) ?? 'Lỗi Frappe.';
    throw new Error(msg);
  }

  return data.message as T;
}

// ============================================================
// Auth
// ============================================================
async function login({
  usr,
  pwd,
  siteUrl,
}: {
  usr: string;
  pwd: string;
  siteUrl: string;
}): Promise<{ sid: string; home_page?: string; full_name?: string }> {
  await network.setSiteUrl(siteUrl);

  const data = await call<{ sid: string; home_page?: string; full_name?: string }>({
    url: `${siteUrl}/api/method/login`,
    method: 'POST',
    args: { usr, pwd },
  });

  if (data.sid) await AsyncStorage.setItem(network.SID_KEY, data.sid);
  return data;
}

async function logout(): Promise<void> {
  try {
    const siteUrl = await network.getSiteUrl();
    if (siteUrl) {
      await call({ url: `${siteUrl}/api/method/logout`, method: 'POST' });
    }
  } catch {
    // ignore
  }
  await AsyncStorage.removeItem(network.SID_KEY);
}

async function isLoggedIn(): Promise<boolean> {
  return !!(await AsyncStorage.getItem(network.SID_KEY));
}

// ============================================================
// Export
// ============================================================
export const frappe = {
  call,
  login,
  logout,
  isLoggedIn,
};