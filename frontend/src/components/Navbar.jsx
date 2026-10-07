import { useState, useEffect } from "react";
import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";
import { useShop } from "../context/ShopContext.jsx";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentPath, navigate } = useNavigation();
  const { wishlistCount, cartCount } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPath]);

  const handleNav = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    setMobileOpen(false);
  };

  const roleRoute = user?.role ? getRoleDefaultRoute(user.role) : "/dashboard";
  const isCustomer = isAuthenticated && user?.role === "customer";

  return (
    <>
      {/* Mobile Top Bar (Visible only on screens <= 768px) */}
      <header className="bazora-mobile-bar" aria-label="Mobile Header">
        <div
          className="mobile-bar-brand"
          onClick={() => handleNav("/")}
          role="button"
          tabIndex={0}
        >
          <span className="brand-logo-icon">🛍️</span>
          <span className="brand-name">Bazora</span>
        </div>

        <div className="mobile-bar-actions">
          {isCustomer && cartCount > 0 && (
            <button
              type="button"
              className="mobile-cart-btn"
              onClick={() => handleNav("/cart")}
              title="Shopping Cart"
            >
              <span>🛒</span>
              <span className="nav-badge-count cart-badge">{cartCount}</span>
            </button>
          )}

          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <span className="menu-toggle-icon">{mobileOpen ? "✕" : "☰"}</span>
            <span className="graph-node-pip" title="Navigation"></span>
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Right-Side Vertical Sidebar */}
      <aside
        className={`bazora-sidebar ${mobileOpen ? "mobile-open" : ""}`}
        aria-label="Main sidebar navigation"
      >
        {/* Sidebar Header / Brand */}
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => handleNav("/")}
            role="button"
            tabIndex={0}
          >
            <div className="sidebar-brand-icon-wrap">
              <span className="brand-logo-icon">🛍️</span>
              <span className="graph-node-pip" title="Bazora Network Node"></span>
            </div>
            <div className="sidebar-brand-text">
              <span className="brand-name">Bazora</span>
              <span className="brand-badge">Marketplace</span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation sidebar"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Navigation Body */}
        <nav className="sidebar-nav">
          {/* General Marketplace Section */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Explore</span>
            <button
              type="button"
              className={`sidebar-link ${currentPath === "/" ? "active" : ""}`}
              onClick={() => handleNav("/")}
            >
              <div className="sidebar-link-content">
                <span className="sidebar-link-icon">🏠</span>
                <span className="sidebar-link-label">Home</span>
              </div>
              {currentPath === "/" && <span className="sidebar-active-pip"></span>}
            </button>

            <button
              type="button"
              className={`sidebar-link ${currentPath.startsWith("/products") ? "active" : ""}`}
              onClick={() => handleNav("/products")}
            >
              <div className="sidebar-link-content">
                <span className="sidebar-link-icon">🛍️</span>
                <span className="sidebar-link-label">Products</span>
              </div>
              {currentPath.startsWith("/products") && (
                <span className="sidebar-active-pip"></span>
              )}
            </button>

            <button
              type="button"
              className={`sidebar-link ${currentPath === "/assistant" ? "active" : ""}`}
              onClick={() => handleNav("/assistant")}
              title="Bazora AI Shopping Assistant"
            >
              <div className="sidebar-link-content">
                <span className="sidebar-link-icon">✨</span>
                <span className="sidebar-link-label">AI Assistant</span>
              </div>
              <div className="sidebar-link-meta">
                <span className="sidebar-badge ai-badge">AI</span>
                {currentPath === "/assistant" && (
                  <span className="sidebar-active-pip"></span>
                )}
              </div>
            </button>
          </div>

          {/* Customer Specific Shopping Links */}
          {isCustomer && (
            <div className="sidebar-section">
              <span className="sidebar-section-title">Shopping</span>
              <button
                type="button"
                className={`sidebar-link ${currentPath === "/wishlist" ? "active" : ""}`}
                onClick={() => handleNav("/wishlist")}
                title="My Wishlist"
              >
                <div className="sidebar-link-content">
                  <span className="sidebar-link-icon">❤️</span>
                  <span className="sidebar-link-label">Wishlist</span>
                </div>
                <div className="sidebar-link-meta">
                  {wishlistCount > 0 && (
                    <span className="sidebar-badge wishlist">{wishlistCount}</span>
                  )}
                  {currentPath === "/wishlist" && (
                    <span className="sidebar-active-pip"></span>
                  )}
                </div>
              </button>

              <button
                type="button"
                className={`sidebar-link ${currentPath === "/cart" ? "active" : ""}`}
                onClick={() => handleNav("/cart")}
                title="Shopping Cart"
              >
                <div className="sidebar-link-content">
                  <span className="sidebar-link-icon">🛒</span>
                  <span className="sidebar-link-label">Cart</span>
                </div>
                <div className="sidebar-link-meta">
                  {cartCount > 0 && (
                    <span className="sidebar-badge cart-badge">{cartCount}</span>
                  )}
                  {currentPath === "/cart" && <span className="sidebar-active-pip"></span>}
                </div>
              </button>

              <button
                type="button"
                className={`sidebar-link ${currentPath === "/orders" ? "active" : ""}`}
                onClick={() => handleNav("/orders")}
                title="My Orders"
              >
                <div className="sidebar-link-content">
                  <span className="sidebar-link-icon">📦</span>
                  <span className="sidebar-link-label">Orders</span>
                </div>
                {currentPath === "/orders" && <span className="sidebar-active-pip"></span>}
              </button>

              <button
                type="button"
                className={`sidebar-link ${currentPath === "/become-seller" ? "active" : ""}`}
                onClick={() => handleNav("/become-seller")}
                title="Apply to become a seller on Bazora"
              >
                <div className="sidebar-link-content">
                  <span className="sidebar-link-icon">🏪</span>
                  <span className="sidebar-link-label">Become a Seller</span>
                </div>
                {currentPath === "/become-seller" && <span className="sidebar-active-pip"></span>}
              </button>
            </div>
          )}

          {/* Role-Specific Portal Links */}
          {isAuthenticated && (
            <div className="sidebar-section">
              <span className="sidebar-section-title">Workspace</span>
              {user?.role === "admin" ? (
                <button
                  type="button"
                  className={`sidebar-link ${currentPath.startsWith("/admin") ? "active" : ""}`}
                  onClick={() => handleNav("/admin")}
                >
                  <div className="sidebar-link-content">
                    <span className="sidebar-link-icon">🛡️</span>
                    <span className="sidebar-link-label">Admin Panel</span>
                  </div>
                  {currentPath.startsWith("/admin") && (
                    <span className="sidebar-active-pip"></span>
                  )}
                </button>
              ) : user?.role === "seller" ? (
                <button
                  type="button"
                  className={`sidebar-link ${currentPath.startsWith("/seller") ? "active" : ""}`}
                  onClick={() => handleNav("/seller")}
                >
                  <div className="sidebar-link-content">
                    <span className="sidebar-link-icon">🏪</span>
                    <span className="sidebar-link-label">Seller Portal</span>
                  </div>
                  {currentPath.startsWith("/seller") && (
                    <span className="sidebar-active-pip"></span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className={`sidebar-link ${currentPath === roleRoute ? "active" : ""}`}
                  onClick={() => handleNav(roleRoute)}
                >
                  <div className="sidebar-link-content">
                    <span className="sidebar-link-icon">📊</span>
                    <span className="sidebar-link-label">Dashboard</span>
                  </div>
                  {currentPath === roleRoute && (
                    <span className="sidebar-active-pip"></span>
                  )}
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer / User Profile & Auth Section */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div className="sidebar-user-card">
                <div className="sidebar-user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                  <span className="graph-node-pip success" title="Active session"></span>
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name" title={user?.name || "User"}>
                    {user?.name || "User"}
                  </span>
                  <span className={`role-pill role-${user?.role || "customer"}`}>
                    {user?.role || "customer"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-sidebar-logout"
                onClick={handleLogout}
                title="Log out of your account"
              >
                <span>🚪</span>
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="sidebar-guest-actions">
              <button
                type="button"
                className={`btn-ghost ${currentPath === "/login" ? "active" : ""}`}
                onClick={() => handleNav("/login")}
              >
                🔑 Sign In
              </button>
              <button
                type="button"
                className={`btn-primary ${currentPath === "/register" ? "active" : ""}`}
                onClick={() => handleNav("/register")}
              >
                ✨ Register
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
