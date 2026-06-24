import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { decodeJwt, API_BASE_URL } from '../api/client';
import { clearCachedTasks } from './taskCache';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session from SecureStore on startup
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) {
          const decoded = decodeJwt(token);
          if (decoded && decoded.sub) {
            // Check expiry
            const isExpired = decoded.exp && decoded.exp * 1000 < Date.now();
            if (!isExpired) {
              setAccessToken(token);
              setUser({
                id: decoded.sub,
                email: decoded.email,
                name: decoded.name,
                role: decoded.role,
              });
            } else {
              // Token expired, clear or let client.ts refresh handle it on first API request
              // For simplicity, we can load refresh token and try to refresh here
              const refresh = await SecureStore.getItemAsync('refreshToken');
              if (refresh) {
                try {
                  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: refresh }),
                  });
                  if (response.ok) {
                    const tokens = await response.json();
                    await SecureStore.setItemAsync('accessToken', tokens.accessToken);
                    await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
                    const newDecoded = decodeJwt(tokens.accessToken);
                    setAccessToken(tokens.accessToken);
                    setUser({
                      id: newDecoded.sub,
                      email: newDecoded.email,
                      name: newDecoded.name,
                      role: newDecoded.role,
                    });
                  } else {
                    // Failed to refresh (e.g., invalid/expired refresh token), clear credentials
                    await SecureStore.deleteItemAsync('accessToken');
                    await SecureStore.deleteItemAsync('refreshToken');
                  }
                } catch (fetchErr) {
                  // Network error (likely offline): DO NOT clear credentials!
                  // Boot in offline mode by utilizing the user info from the expired token.
                  console.log('🔄 Mobile authContext: Network request failed during token refresh (likely offline). Allowing offline login...');
                  setAccessToken(token);
                  setUser({
                    id: decoded.sub,
                    email: decoded.email,
                    name: decoded.name,
                    role: decoded.role,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load authentication state', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Login failed. Please check credentials.');
      }

      const data = await response.json();
      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: userData } = data;

      await SecureStore.setItemAsync('accessToken', newAccessToken);
      await SecureStore.setItemAsync('refreshToken', newRefreshToken);

      setAccessToken(newAccessToken);
      setUser(userData);
    } catch (e) {
      setIsLoading(false);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        // Optional backend call to clear refresh token hash
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }).catch((err) => console.log('Error during backend logout:', err));
      }
    } catch (err) {
      console.log('Logout API call failed:', err);
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      await clearCachedTasks();
      setAccessToken(null);
      setUser(null);
      setIsLoading(false);
    }
  }, [user, accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
