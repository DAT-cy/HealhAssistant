import { apiClient, ApiError } from '../client';
import { LoginResponse, ProfileUser } from '../types';
import { apiVersion } from '@/config/api.config';

export const authService = {
  login: (username: string, password: string) =>
    apiClient.request<LoginResponse>(`${apiVersion}/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) }),
  profile: () => apiClient.request<ProfileUser>(`${apiVersion}/auth/profile`),
};

export const isFieldError = (error: unknown, field: string): boolean => error instanceof ApiError && Boolean(error.validationErrors[field]);
