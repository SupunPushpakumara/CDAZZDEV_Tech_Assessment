import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Custom base64 decoder for React Native environments (buffer/atob are missing natively)
function decodeBase64(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ) {
    buffer = chars.indexOf(buffer);
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

export function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedPayload = decodeBase64(base64);
    return JSON.parse(decodedPayload);
  } catch (e) {
    return null;
  }
}

// Dynamically resolve Backend Endpoint depending on Platform Executing
export const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator loops back to localhost via 10.0.2.2
    return 'http://10.0.2.2:3000';
  }
  // iOS simulator or default web local loops directly
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await SecureStore.getItemAsync('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Self-Healing Interceptor: If access token is expired, perform a silent rotation refresh
  if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (refreshToken) {
      console.log('🔄 Mobile client: Access token expired. Attempting rotation refresh...');
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshResponse.ok) {
          const tokens = await refreshResponse.json();
          await SecureStore.setItemAsync('accessToken', tokens.accessToken);
          await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);

          // Retry the failed transaction with the new access token
          headers['Authorization'] = `Bearer ${tokens.accessToken}`;
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
          });
        }
      } catch (err) {
        console.error('Silent token refresh failed:', err);
      }
    }
  }

  return response;
}
