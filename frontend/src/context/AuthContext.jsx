import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);
const TOKEN_KEY = "email_assistant_token";
const USER_KEY = "email_assistant_user";
const GMAIL_CONNECTED_KEY = "email_assistant_gmail_connected";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });

  const persist = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.user?.google?.connected) {
      localStorage.setItem(GMAIL_CONNECTED_KEY, "true");
    } else {
      localStorage.removeItem(GMAIL_CONNECTED_KEY);
    }
    setToken(data.token);
    setUser(data.user);
  };

  const refreshUser = async () => {
    if (!token) return null;
    try {
      const data = await authApi.getMe();
      if (data?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        if (data.user.google?.connected) {
          localStorage.setItem(GMAIL_CONNECTED_KEY, "true");
        } else {
          localStorage.removeItem(GMAIL_CONNECTED_KEY);
        }
        setUser(data.user);
        return data.user;
      }
    } catch (e) {
      console.warn("Failed to refresh user profile:", e);
    }
    return null;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(GMAIL_CONNECTED_KEY);
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("auth:logged-out"));
  };

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:expired", handler);
    return () => window.removeEventListener("auth:expired", handler);
  }, []);

  // Fetch true live user profile on mount if token is present
  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token]);

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token),
    login: async (p) => persist(await authApi.login(p)),
    register: async (p) => persist(await authApi.register(p)),
    refreshUser,
    logout,
    connectGoogle: () => {
      window.location.href = authApi.googleUrl();
    },
    signInWithGoogle: () => {
      window.location.href = authApi.googleSignInUrl();
    },
    disconnectGoogle: async () => {
      await authApi.disconnectGoogle();
      logout();
    },
    updateProfile: async (name) => {
      const data = await authApi.updateProfile(name);
      if (data?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        setUser(data.user);
        return data.user;
      }
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
