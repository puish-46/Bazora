import { useState } from "react";
import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";
import { api } from "../services/api.js";
import SellerPortal from "./seller/SellerPortal.jsx";
import AdminPortal from "./admin/AdminPortal.jsx";

/**
 * Shared test component to demonstrate automatic JWT attachment on API requests.
 */
function ApiTokenTester() {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleTestToken = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await api.get("/auth/me");
      setTestResult({
        success: true,
        message: "Successfully verified token with backend /api/auth/me!",
        payload: data,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || "Failed to verify token with backend",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="api-tester-card">
      <div className="api-tester-header">
        <h4>🔒 Authenticated API Client Verification</h4>
        <button
          type="button"
          className="btn-tester"
          onClick={handleTestToken}
          disabled={testing}
        >
          {testing ? "Testing..." : "Verify /api/auth/me"}
        </button>
      </div>
      <p className="api-tester-desc">
        Click to verify that your session automatically attaches the Bearer JWT to backend requests.
      </p>

      {testResult && (
        <div
          className={`tester-output ${testResult.success ? "tester-success" : "tester-error"}`}
        >
          <div className="tester-message">{testResult.message}</div>
          {testResult.payload && (
            <pre className="tester-payload">
              {JSON.stringify(testResult.payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Customer Dashboard View
 */
export function CustomerDashboard() {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <span className="dashboard-badge">Customer Account</span>
        <h1>Welcome, {user?.name || "Customer"}!</h1>
        <p className="dashboard-subtitle">
          Manage your orders, profile, and marketplace activity from your personal dashboard.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>👤 User Profile</h3>
          <ul className="profile-details-list">
            <li>
              <strong>Name:</strong> {user?.name}
            </li>
            <li>
              <strong>Email:</strong> {user?.email}
            </li>
            <li>
              <strong>Account Role:</strong>{" "}
              <span className={`role-pill role-${user?.role}`}>{user?.role}</span>
            </li>
            <li>
              <strong>User ID:</strong> <span className="mono-id">{user?.id}</span>
            </li>
          </ul>
        </div>

        <div className="dashboard-card">
          <h3>📦 Shopping & Quick Actions</h3>
          <p className="card-hint">
            As a registered customer, explore products, manage your wishlist, add items to cart,
            and proceed to checkout.
          </p>
          <div className="action-buttons-wrap">
            <button
              type="button"
              className="tag-available action-btn"
              onClick={() => navigate("/products")}
            >
              🛍️ Browse Products
            </button>
            <button
              type="button"
              className="tag-available action-btn"
              onClick={() => navigate("/cart")}
            >
              🛒 My Cart
            </button>
            <button
              type="button"
              className="tag-available action-btn"
              onClick={() => navigate("/wishlist")}
            >
              ❤️ My Wishlist
            </button>
          </div>
        </div>
      </div>

      <ApiTokenTester />
    </div>
  );
}

/**
 * Seller Portal View
 */
export function SellerDashboard() {
  return <SellerPortal />;
}

/**
 * Admin Panel View
 */
export function AdminDashboard() {
  return <AdminPortal />;
}

/**
 * Support Dashboard View
 */
export function SupportDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <span className="dashboard-badge badge-support">Customer Support</span>
        <h1>Support Desk: {user?.name}</h1>
        <p className="dashboard-subtitle">
          Manage customer inquiries, dispute resolutions, and return authorizations.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>🎧 Support Representative</h3>
          <ul className="profile-details-list">
            <li>
              <strong>Name:</strong> {user?.name}
            </li>
            <li>
              <strong>Email:</strong> {user?.email}
            </li>
            <li>
              <strong>Role:</strong>{" "}
              <span className="role-pill role-support">support</span>
            </li>
          </ul>
        </div>
      </div>

      <ApiTokenTester />
    </div>
  );
}

/**
 * Delivery Dashboard View
 */
export function DeliveryDashboard() {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      <div className="dashboard-hero">
        <span className="dashboard-badge badge-delivery">Logistics & Delivery</span>
        <h1>Delivery Operations: {user?.name}</h1>
        <p className="dashboard-subtitle">
          View assigned shipments, transit updates, and delivery confirmations.
        </p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>🚚 Dispatch Agent</h3>
          <ul className="profile-details-list">
            <li>
              <strong>Name:</strong> {user?.name}
            </li>
            <li>
              <strong>Email:</strong> {user?.email}
            </li>
            <li>
              <strong>Role:</strong>{" "}
              <span className="role-pill role-delivery">delivery</span>
            </li>
          </ul>
        </div>
      </div>

      <ApiTokenTester />
    </div>
  );
}

/**
 * Unauthorized / Access Denied Page
 */
export function UnauthorizedPage() {
  const { user, isAuthenticated } = useAuth();
  const { navigate } = useNavigation();

  const allowedDashboard = user?.role ? getRoleDefaultRoute(user.role) : "/login";

  return (
    <div className="unauthorized-container">
      <div className="unauthorized-card">
        <div className="unauthorized-icon">🚫</div>
        <h2>Access Restricted</h2>
        <p className="unauthorized-text">
          You do not have the required permissions to view this page.
        </p>

        {isAuthenticated && user && (
          <div className="unauthorized-role-info">
            <span>Your Current Role:</span>
            <span className={`role-pill role-${user.role}`}>{user.role}</span>
          </div>
        )}

        <div className="unauthorized-actions">
          {isAuthenticated ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate(allowedDashboard)}
            >
              Go to My {user?.role ? user.role.toUpperCase() : ""} Dashboard
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/login")}
            >
              Sign In to Continue
            </button>
          )}

          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/")}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
