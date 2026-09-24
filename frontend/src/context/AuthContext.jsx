import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

export const SUPPORTED_ROLES = ["customer", "seller", "admin", "support", "delivery"];

export const getRoleDefaultRoute = (role) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "seller":
      return "/seller";
    case "delivery":
      return "/delivery";
    case "support":
      return "/support";
    case "customer":
    default:
      return "/dashboard";
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(null);

  // Clear auth error banner
  const clearError = useCallback(() => {
    setAuthError(null);
    setSessionExpiredNotice(null);
  }, []);

  // Logout action: completely clears local state and storage
  const logout = useCallback(() => {
    api.clearAuth();
    setUser(null);
    setToken(null);
    setAuthError(null);
    setSessionExpiredNotice(null);
  }, []);

  // Restore session on application initial load/refresh
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const storedToken = api.getToken();
        const storedUser = api.getUser();

        // 1. If no stored token exists, finish restoration immediately (avoid unnecessary API calls)
        if (!storedToken) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        // 2. Client-side expiration check
        if (api.isTokenExpired(storedToken)) {
          console.warn("Stored JWT is expired. Clearing local session.");
          api.clearAuth();
          if (isMounted) {
            setUser(null);
            setToken(null);
            setSessionExpiredNotice("Your session has expired. Please log in again.");
            setLoading(false);
          }
          return;
        }

        // 3. Verify session validity with backend /api/auth/me
        try {
          const res = await api.get("/auth/me");
          if (isMounted) {
            // Merge verified role and userId from backend token payload with stored profile info
            const verifiedUser = {
              ...(storedUser || {}),
              id: res?.user?.userId || storedUser?.id,
              role: res?.user?.role || storedUser?.role || "customer",
            };
            api.setUser(verifiedUser);
            setUser(verifiedUser);
            setToken(storedToken);
          }
        } catch (verifyErr) {
          // If token verification returned 401 or was rejected by backend
          if (verifyErr.status === 401) {
            console.warn("Backend rejected token verification:", verifyErr.message);
            api.clearAuth();
            if (isMounted) {
              setUser(null);
              setToken(null);
              setSessionExpiredNotice("Your previous session is invalid. Please log in again.");
            }
          } else if (verifyErr.isNetworkError) {
            // On temporary network disconnection, preserve cached session so user is not logged out while offline
            if (isMounted && storedUser) {
              setUser(storedUser);
              setToken(storedToken);
            }
          } else {
            api.clearAuth();
            if (isMounted) {
              setUser(null);
              setToken(null);
            }
          }
        }
      } catch (err) {
        console.error("Session restoration error:", err);
        api.clearAuth();
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    // Listen to global 401 events emitted by api.js
    const handleAuthExpired = (event) => {
      logout();
      setSessionExpiredNotice(
        event.detail?.message || "Your session has expired. Please log in again."
      );
    };

    window.addEventListener("bazora:auth-expired", handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener("bazora:auth-expired", handleAuthExpired);
    };
  }, [logout]);

  // Login action
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    setSessionExpiredNotice(null);

    try {
      const response = await api.post("/auth/login", { email, password });

      if (response && response.token && response.user) {
        api.setToken(response.token);
        api.setUser(response.user);
        setToken(response.token);
        setUser(response.user);
        return {
          success: true,
          user: response.user,
          message: response.message || "Login successful",
        };
      }

      throw new Error(response?.message || "Invalid response from authentication server");
    } catch (err) {
      const message =
        err.message ||
        (Array.isArray(err.errors) ? err.errors.join(", ") : null) ||
        "Login failed. Please check your credentials.";
      setAuthError(message);
      throw err;
    }
  }, []);

  // Register action
  const register = useCallback(async (name, email, password) => {
    setAuthError(null);
    setSessionExpiredNotice(null);

    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password,
      });

      return {
        success: true,
        user: response.user,
        message: response.message || "User registered successfully",
      };
    } catch (err) {
      const message =
        err.message ||
        (Array.isArray(err.errors) ? err.errors.join(", ") : null) ||
        "Registration failed. Please review the details provided.";
      setAuthError(message);
      throw err;
    }
  }, []);

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    loading,
    authError,
    sessionExpiredNotice,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
