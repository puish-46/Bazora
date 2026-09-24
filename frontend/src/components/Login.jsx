import { useState, useEffect } from "react";
import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function Login() {
  const { login, isAuthenticated, user, authError, sessionExpiredNotice, clearError } = useAuth();
  const { navigate } = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // If already logged in, redirect to their role dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getRoleDefaultRoute(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Client-side quick checks
    if (!email.trim() || !password) {
      setLocalError("Please enter both your email address and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await login(email.trim(), password);
      // Navigate to role dashboard upon success
      if (res?.user?.role) {
        navigate(getRoleDefaultRoute(res.user.role));
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      // Backend error message is captured by authError in context and/or local error
      setLocalError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge-icon">🔐</div>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Sign in to your Bazora account</p>
        </div>

        {sessionExpiredNotice && (
          <div className="alert alert-warning" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{sessionExpiredNotice}</span>
          </div>
        )}

        {displayError && (
          <div className="alert alert-danger" role="alert">
            <span className="alert-icon">✕</span>
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localError) setLocalError(null);
              }}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localError) setLocalError(null);
              }}
              required
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? (
              <span className="btn-spinner-wrap">
                <span className="btn-spinner"></span>
                <span>Authenticating...</span>
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                clearError();
                navigate("/register");
              }}
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
