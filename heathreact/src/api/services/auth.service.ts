import { apiClient, ApiError } from '../client';
import { LoginResponse, ProfileUser } from '../types';
import { apiVersion } from '@/config/api.config';

export const authService = {
  login: (username: string, password: string) =>
    apiClient.request<LoginResponse>(`${apiVersion}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),
  signUp: (email: string, password: string) =>
    apiClient.request<LoginResponse>(`${apiVersion}/auth/signup`, { method: 'POST', body: JSON.stringify({ email, password }) }),
  googleLogin: (idToken: string) =>
    apiClient.request<LoginResponse>(`${apiVersion}/auth/google`, { method: 'POST', body: JSON.stringify({ idToken }) }),
  profile: () => apiClient.request<ProfileUser>(`${apiVersion}/auth/profile`),
};

export const isFieldError = (error: unknown, field: string): boolean => error instanceof ApiError && Boolean(error.validationErrors[field]);
