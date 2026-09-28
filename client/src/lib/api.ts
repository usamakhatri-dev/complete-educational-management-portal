import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/auth';
import type { ApiEnvelope, ApiError } from '../types';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) return null;
      try {
        const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
          '/api/auth/refresh',
          { refreshToken },
        );
        const { accessToken: next, refreshToken: nextRefresh } = res.data.data;
        setTokens(next, nextRefresh);
        return next;
      } catch {
        logout();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      const token = await tryRefresh();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Unwraps the API envelope into its payload or throws a readable error. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Partial<ApiError> | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) return data.message.join(', ');
      return data.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
