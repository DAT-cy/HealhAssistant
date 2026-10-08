import { frappe } from './frappe';

// ============================================================
// Types
// ============================================================
export interface LoginPayload {
  usr: string;
  pwd: string;
  siteUrl: string;
}

export interface LoginResponse {
  sid: string;
  home_page?: string;
  full_name?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  full_name: string;
  user_type?: string;
}

// ============================================================
// User Service
// ============================================================
export const userService = {
  // Login
  login: (payload: LoginPayload) =>
    frappe.login({ usr: payload.usr, pwd: payload.pwd, siteUrl: payload.siteUrl }),

  // Logout
  logout: () => frappe.logout(),

  // Check login
  isLoggedIn: () => frappe.isLoggedIn(),

  // Lấy thông tin user
  getInfo: async (): Promise<UserProfile> => {
    const currentUser = await frappe.call<string>(
      'frappe.auth.get_logged_in_user',
    );
    return frappe.call<UserProfile>('frappe.client.get', {
      doctype: 'User',
      name: currentUser,
      fields: ['name', 'email', 'full_name', 'user_type'],
    });
  },
};