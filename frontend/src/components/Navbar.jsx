import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";
import { useShop } from "../context/ShopContext.jsx";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentPath, navigate } = useNavigation();
  const { wishlistCount, cartCount } = useShop();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleRoute = user?.role ? getRoleDefaultRoute(user.role) : "/dashboard";
  const isCustomer = isAuthenticated && user?.role === "customer";

  return (
    <header className="bazora-navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => navigate("/")} role="button" tabIndex={0}>
          <span className="brand-logo-icon">🛍️</span>
          <span className="brand-name">Bazora</span>
          <span className="brand-badge">Marketplace</span>
        </div>

        <nav className="navbar-links" aria-label="Main navigation">
          <button
            type="button"
            className={`nav-link ${currentPath === "/" ? "active" : ""}`}
            onClick={() => navigate("/")}
          >
            Home
          </button>

          <button
            type="button"
            className={`nav-link ${currentPath.startsWith("/products") ? "active" : ""}`}
            onClick={() => navigate("/products")}
          >
            Products
          </button>

          {isCustomer && (
            <>
              <button
                type="button"
                className={`nav-link nav-icon-link ${currentPath === "/wishlist" ? "active" : ""}`}
                onClick={() => navigate("/wishlist")}
                title="My Wishlist"
              >
                <span>❤️ Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="nav-badge-count">{wishlistCount}</span>
                )}
              </button>

              <button
                type="button"
                className={`nav-link nav-icon-link ${currentPath === "/cart" ? "active" : ""}`}
                onClick={() => navigate("/cart")}
                title="Shopping Cart"
              >
                <span>🛒 Cart</span>
                {cartCount > 0 && (
                  <span className="nav-badge-count cart-badge">{cartCount}</span>
                )}
              </button>

              <button
                type="button"
                className={`nav-link ${currentPath === "/orders" ? "active" : ""}`}
                onClick={() => navigate("/orders")}
                title="My Orders"
              >
                Orders
              </button>
            </>
          )}

          {isAuthenticated ? (
            <>
              {user?.role === "admin" ? (
                <button
                  type="button"
                  className={`nav-link ${currentPath.startsWith("/admin") ? "active" : ""}`}
                  onClick={() => navigate("/admin")}
                >
                  Admin Panel
                </button>
              ) : user?.role === "seller" ? (
                <button
                  type="button"
                  className={`nav-link ${currentPath.startsWith("/seller") ? "active" : ""}`}
                  onClick={() => navigate("/seller")}
                >
                  Seller Portal
                </button>
              ) : (
                <button
                  type="button"
                  className={`nav-link ${currentPath === roleRoute ? "active" : ""}`}
                  onClick={() => navigate(roleRoute)}
                >
                  Dashboard
                </button>
              )}
            </>
          ) : null}
        </nav>

        <div className="navbar-auth-actions">
          {isAuthenticated ? (
            <div className="user-profile-menu">
              <div className="user-details">
                <span className="user-greeting">
                  Hello, <strong>{user?.name || "User"}</strong>
                </span>
                <span className={`role-pill role-${user?.role || "customer"}`}>
                  {user?.role || "customer"}
                </span>
              </div>
              <button
                type="button"
                className="btn-logout"
                onClick={handleLogout}
                title="Log out of your account"
              >
                Log Out
              </button>
            </div>
          ) : (
            <div className="guest-actions">
              <button
                type="button"
                className={`btn-ghost ${currentPath === "/login" ? "active" : ""}`}
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn-primary ${currentPath === "/register" ? "active" : ""}`}
                onClick={() => navigate("/register")}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
