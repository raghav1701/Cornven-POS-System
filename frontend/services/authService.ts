import { LoginCredentials, User } from "@/types/auth";

const API_BASE_URL = typeof window !== 'undefined' 
  ? `${window.location.origin}/api` 
  : 'http://localhost:3000/api';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
}

class AuthService {
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; token: string }> {
    const response = await this.makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    // Transform API response to match our User interface
    const user: User = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      role: this.mapApiRoleToUserRole(response.user.role),
      createdAt: new Date().toISOString(), // API doesn't provide this, so we'll use current time
    };

    return {
      user,
      token: response.token,
    };
  }

  private mapApiRoleToUserRole(
    apiRole: string
  ): "admin" | "inventory" | "pos" | "tenant" {
    switch (apiRole.toUpperCase()) {
      case "ADMIN":
        return "admin";
      case "INVENTORY":
        return "inventory";
      case "POS":
        return "pos";
      case "TENANT":
        return "tenant";
      default:
        return "pos"; // Default fallback
    }
  }

  // Store token in localStorage
  setAuthToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("cornven_token", token);
    }
  }

  // Get token from localStorage
  getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("cornven_token");
    }
    return null;
  }

  // Remove token from localStorage
  removeAuthToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("cornven_token");
    }
  }

  // Check if user is authenticated (has valid token)
  isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

export const authService = new AuthService();
