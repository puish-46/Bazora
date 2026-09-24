import { useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

/**
 * ProtectedRoute Guard
 * Protects child components based on authentication status and allowed user roles.
 *
 * Supported Roles:
 * - customer
 * - seller
 * - admin
 * - support
 * - delivery
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, role, loading } = useAuth();
  const { navigate } = useNavigation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate("/login");
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        navigate("/unauthorized");
      }
    }
  }, [isAuthenticated, role, loading, allowedRoles, navigate]);

  // Loading state while checking session
  if (loading) {
    return (
      <div className="auth-loading-state" role="status" aria-live="polite">
        <div className="auth-spinner"></div>
        <p className="auth-loading-text">Verifying your session...</p>
      </div>
    );
  }

  // Unauthenticated fallback
  if (!isAuthenticated) {
    return null;
  }

  // Unauthorized role fallback
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return null;
  }

  return children;
}
