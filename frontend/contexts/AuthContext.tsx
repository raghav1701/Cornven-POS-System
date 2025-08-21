"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, AuthState, LoginCredentials } from "@/types/auth";
import { authService } from "@/services/authService";

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    if (!isHydrated) return;

    const savedUser = localStorage.getItem("cornven_user");
    const token = authService.getAuthToken();

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem("cornven_user");
        authService.removeAuthToken();
      }
    }
    setIsLoading(false);
  }, [isHydrated]);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { user, token } = await authService.login(credentials);
      console.log(user, token);

      // Store user data and token
      setUser(user);
      if (typeof window !== "undefined") {
        localStorage.setItem("cornven_user", JSON.stringify(user));
      }
      authService.setAuthToken(token);

      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("cornven_user");
    }
    authService.removeAuthToken();
    setError(null);
    // Redirect to auth page after logout
    if (typeof window !== "undefined") {
      window.location.href = '/auth';
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
