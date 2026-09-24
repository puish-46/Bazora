import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { navigate } = useNavigation();

  return (
    <div className="home-container">
      <section className="home-hero">
        <div className="hero-pill">⚡ Bazora Multi-Vendor Platform</div>
        <h1 className="hero-title">
          Modern Marketplace <br />
          <span className="hero-gradient-text">Shop From Verified Sellers</span>
        </h1>
        <p className="hero-description">
          Discover unique products, select tailored variants, manage your wishlist, and experience
          seamless shopping with synchronized carts.
        </p>

        <div className="hero-cta-group">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => navigate("/products")}
          >
            🛍️ Browse Products
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate(getRoleDefaultRoute(user?.role))}
            >
              My Dashboard ({user?.role}) →
            </button>
          ) : (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          )}
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">Complete Customer Shopping Experience</h2>
        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon">🔍</span>
            <h3>Products & Search</h3>
            <p>
              Browse live catalog items with real-time text search, category filtering, and price
              sorting backed directly by database queries.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">✨</span>
            <h3>Variants & Options</h3>
            <p>
              Inspect dynamic product variations with live pricing, attributes, SKU tracking, and
              instant inventory validation.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">❤️</span>
            <h3>Wishlist Synchronization</h3>
            <p>
              Save products to your personal wishlist with one-click toggles persisted across all
              your customer sessions.
            </p>
          </div>

          <div className="feature-card">
            <span className="feature-icon">🛒</span>
            <h3>Live Shopping Cart</h3>
            <p>
              Manage cart quantities, review backend-computed totals, and prepare for multi-vendor
              order fulfillment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
