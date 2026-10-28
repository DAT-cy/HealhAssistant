import { apiClient, ApiError } from '../client';
import { LoginResponse, ProfileUser } from '../types';
import { apiVersion } from '@/config/api.config';

export type OtpPurpose = 'REGISTER' | 'RESET_PASSWORD';
export interface OtpChallengeResponse { message: string; expiresInSeconds: number; resendAfterSeconds: number }
export interface OtpVerificationResponse { verified: boolean; message: string; login: LoginResponse | null; resetToken: string | null }

export const authService = {
  login: (username: string, password: string) =>
    apiClient.request<LoginResponse>(`${apiVersion}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),
  signUp: (email: string, password: string) =>
    apiClient.request<OtpChallengeResponse>(`${apiVersion}/auth/signup`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  sendPasswordResetOtp: (email: string) => apiClient.request<OtpChallengeResponse>(`${apiVersion}/auth/forgot-password`, { method: 'POST', body: JSON.stringify({ email }) }),
  resendOtp: (email: string, purpose: OtpPurpose) => apiClient.request<OtpChallengeResponse>(`${apiVersion}/auth/otp/resend`, { method: 'POST', body: JSON.stringify({ email, purpose }) }),
  verifyOtp: (email: string, purpose: OtpPurpose, code: string) => apiClient.request<OtpVerificationResponse>(`${apiVersion}/auth/otp/verify`, { method: 'POST', body: JSON.stringify({ email, purpose, code }) }),
  resetPassword: (email: string, resetToken: string, newPassword: string) => apiClient.request<boolean>(`${apiVersion}/auth/reset-password`, { method: 'POST', body: JSON.stringify({ email, resetToken, newPassword }) }),
  googleLogin: (idToken: string) =>
    apiClient.request<LoginResponse>(`${apiVersion}/auth/google`, { method: 'POST', body: JSON.stringify({ idToken }) }),
  profile: () => apiClient.request<ProfileUser>(`${apiVersion}/auth/profile`),
};

export const isFieldError = (error: unknown, field: string): boolean => error instanceof ApiError && Boolean(error.validationErrors[field]);
