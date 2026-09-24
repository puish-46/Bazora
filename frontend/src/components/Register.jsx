import { useState, useEffect } from "react";
import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function Register() {
  const { register, login, isAuthenticated, user, authError, clearError } = useAuth();
  const { navigate } = useNavigation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [localErrors, setLocalErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState(null);

  // If already logged in, redirect to their role dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getRoleDefaultRoute(user.role));
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalErrors([]);
    setSuccessMessage(null);
    clearError();

    const errors = [];
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errors.push("Full name is required.");
    } else if (trimmedName.length < 2) {
      errors.push("Full name must be at least 2 characters long.");
    } else if (trimmedName.length > 50) {
      errors.push("Full name cannot exceed 50 characters.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      errors.push("Email address is required.");
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.push("Please provide a valid email address.");
    }

    if (!password) {
      errors.push("Password is required.");
    } else if (password.length < 6) {
      errors.push("Password must be at least 6 characters long.");
    }

    if (password !== confirmPassword) {
      errors.push("Passwords do not match.");
    }

    if (errors.length > 0) {
      setLocalErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const res = await register(trimmedName, trimmedEmail, password);

      setSuccessMessage(
        res?.message || "Account created successfully! Logging you in..."
      );

      // Backend authentication flow: automatically authenticate the newly registered user
      try {
        const loginRes = await login(trimmedEmail, password);
        if (loginRes?.user?.role) {
          navigate(getRoleDefaultRoute(loginRes.user.role));
          return;
        }
      } catch {
        // If automatic login doesn't complete, smoothly redirect to login page
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
    } catch (err) {
      // Backend validation errors format: array in err.errors or message in err.message
      if (Array.isArray(err.errors) && err.errors.length > 0) {
        // Clean up Joi quote formatting if present
        const cleanedErrors = err.errors.map((msg) =>
          msg.replace(/["\\]/g, "")
        );
        setLocalErrors(cleanedErrors);
      } else {
        setLocalErrors([err.message || "Registration could not be completed. Please try again."]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayErrors = localErrors.length > 0 ? localErrors : authError ? [authError] : [];

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge-icon">✨</div>
          <h2>Join Bazora</h2>
          <p className="auth-subtitle">Create your customer account to start shopping</p>
        </div>

        {successMessage && (
          <div className="alert alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {displayErrors.length > 0 && (
          <div className="alert alert-danger" role="alert">
            <span className="alert-icon">✕</span>
            <div className="alert-error-list">
              {displayErrors.map((errMsg, idx) => (
                <div key={idx} className="alert-error-item">
                  {errMsg}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (localErrors.length > 0) setLocalErrors([]);
              }}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (localErrors.length > 0) setLocalErrors([]);
              }}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password (minimum 6 characters)</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (localErrors.length > 0) setLocalErrors([]);
              }}
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password">Confirm Password</label>
            <input
              id="reg-confirm-password"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (localErrors.length > 0) setLocalErrors([]);
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
                <span>Creating Account...</span>
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <button
              type="button"
              className="link-button"
              onClick={() => {
                clearError();
                navigate("/login");
              }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
