/**
 * Centralized API client for Bazora Frontend.
 * Automatically manages JWT token attachment, centralized 401 handling,
 * error standardization, and session persistence.
 */

// Normalize base URL to ensure clean formatting with /api prefix and no trailing slashes
const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const cleanBaseUrl = rawBaseUrl.trim().replace(/\/+$/, "");
const API_BASE_URL = cleanBaseUrl.endsWith("/api")
  ? cleanBaseUrl
  : `${cleanBaseUrl}/api`;

const TOKEN_KEY = "bazora_jwt_token";
const USER_KEY = "bazora_user_data";

/**
 * Retrieve the stored JWT from localStorage.
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.error("Failed to read token from localStorage:", err);
    return null;
  }
};

/**
 * Persist the JWT to localStorage.
 */
export const setToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error("Failed to write token to localStorage:", err);
  }
};

/**
 * Retrieve stored user metadata from localStorage.
 */
export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to read user data from localStorage:", err);
    return null;
  }
};

/**
 * Persist user metadata to localStorage.
 */
export const setUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error("Failed to write user data to localStorage:", err);
  }
};

/**
 * Clear all authentication state from localStorage.
 */
export const clearAuth = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error("Failed to clear auth from localStorage:", err);
  }
};

/**
 * Decode JWT token payload client-side without external dependencies.
 */
export const parseJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

/**
 * Check if the stored JWT is expired.
 */
export const isTokenExpired = (token) => {
  const decoded = parseJwt(token);
  if (!decoded || !decoded.exp) return true;
  // exp is in seconds, convert to milliseconds with 5 second clock skew buffer
  return decoded.exp * 1000 <= Date.now() + 5000;
};

/**
 * Core HTTP request handler wrapping fetch.
 * Automatically injects Bearer token, standardizes responses, and manages 401s.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = {
    ...options.headers,
  };

  // Automatically attach JWT if present
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Set default JSON content-type if body is an object and not FormData
  let body = options.body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  const config = {
    ...options,
    headers,
    body,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    const error = new Error("Network connection error. Please check your connection.");
    error.status = 0;
    error.isNetworkError = true;
    throw error;
  }

  let data = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = { message: text };
    } catch {
      data = null;
    }
  }

  // Handle unauthorized/expired token globally
  if (response.status === 401) {
    if (token) {
      // Clear token and notify listeners that session expired
      clearAuth();
      window.dispatchEvent(
        new CustomEvent("bazora:auth-expired", {
          detail: {
            message: data?.message || "Your session has expired. Please log in again.",
          },
        })
      );
    }

    const error = new Error(data?.message || "Authentication required");
    error.status = 401;
    error.data = data;
    error.errors = data?.errors || [];
    throw error;
  }

  // Handle non-2xx responses
  if (!response.ok) {
    const message =
      data?.message ||
      (Array.isArray(data?.errors) ? data.errors.join(", ") : null) ||
      `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    error.errors = Array.isArray(data?.errors) ? data.errors : [];
    throw error;
  }

  return data;
}

/**
 * Standardize and sanitize error messages from API responses.
 * Prevents raw database errors, stack traces, and internal secrets from being displayed to users.
 */
export const formatApiError = (err, fallback = "An unexpected error occurred.") => {
  if (!err) return fallback;

  if (err.isNetworkError || err.status === 0) {
    return "Unable to connect to the server. Please check your internet connection.";
  }

  if (err.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (err.status === 403) {
    const rawMsg = err.message || "";
    if (rawMsg.toLowerCase().includes("approved") || rawMsg.toLowerCase().includes("approval")) {
      return "Your seller account is awaiting administrator review and approval.";
    }
    return rawMsg || "You do not have permission to perform this action.";
  }

  if (err.status === 404) {
    return err.message || "The requested resource could not be found.";
  }

  if (err.status === 409) {
    const rawMsg = err.message || "";
    if (rawMsg.toLowerCase().includes("slug")) {
      return "A product with this URL slug already exists. Please choose a different slug.";
    }
    if (rawMsg.toLowerCase().includes("sku")) {
      return "A variant with this SKU code already exists for this product.";
    }
    if (rawMsg.toLowerCase().includes("store")) {
      return "A storefront is already configured for your account.";
    }
    return rawMsg || "A conflict occurred with an existing record.";
  }

  if (err.status === 422 || err.status === 400) {
    if (Array.isArray(err.errors) && err.errors.length > 0) {
      return err.errors.join(". ");
    }
    const rawMsg = err.message || "";
    if (rawMsg.includes("E11000") || rawMsg.includes("dup key")) {
      return "A record with this identifier (such as slug or SKU) already exists.";
    }
    return rawMsg || "Invalid details provided. Please review the form values.";
  }

  if (err.status >= 500) {
    return "A server error occurred. Please try again later.";
  }

  // General sanitization of raw database / error strings
  if (typeof err.message === "string") {
    const msg = err.message;
    if (msg.includes("E11000") || msg.includes("dup key")) {
      return "A record with this unique identifier already exists.";
    }
    if (msg.includes("Cast to ObjectId") || msg.includes("BSONError") || msg.includes("MongoError")) {
      return "Invalid resource reference.";
    }
    if (msg.includes("\n    at ") || msg.includes("node_modules")) {
      return "An unexpected server error occurred.";
    }
    return msg;
  }

  return fallback;
};

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: "GET" }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "POST", body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PUT", body }),
  patch: (endpoint, body, options = {}) => request(endpoint, { ...options, method: "PATCH", body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: "DELETE" }),
  getToken,
  setToken,
  getUser,
  setUser,
  clearAuth,
  parseJwt,
  isTokenExpired,
  formatApiError,
};

export default api;
