import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:4000';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

// undefined = not yet loaded; null = no token; string = has token
let _cachedToken: string | null | undefined = undefined;

export const saveTokens = async (accessToken: string, refreshToken: string) => {
  _cachedToken = accessToken;
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
};

export const clearTokens = async () => {
  _cachedToken = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
};

export const getAccessToken = async () => {
  if (_cachedToken !== undefined) return _cachedToken;
  _cachedToken = await SecureStore.getItemAsync(ACCESS_KEY);
  return _cachedToken;
};

export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY);

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log(`[api] → ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

api.interceptors.response.use(
  (r) => {
    console.log(`[api] ← ${r.status} ${r.config.url}`);
    return r;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    console.warn(`[api] ✗ ${status ?? 'NETWORK_ERROR'} ${url}`, error.message);

    const original = error.config;
    if (status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        _cachedToken = data.accessToken;
        await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
        if (data.refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        await clearTokens();
      }
    }
    return Promise.reject(error);
  }
);
