import { useState, useEffect } from "react";
import { useAuth, getRoleDefaultRoute } from "../context/AuthContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { api } from "../services/api.js";

export default function Home() {
  const { isAuthenticated, user, role } = useAuth();
  const { navigate } = useNavigation();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useShop();

  // Real backend data states
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Search input inside hero
  const [searchQuery, setSearchQuery] = useState("");

  // Wishlist action feedback toast
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Fetch real categories and products on mount
  useEffect(() => {
    let isMounted = true;

    const fetchHomeData = async () => {
      try {
        setDataError(null);
        const [catRes, prodRes] = await Promise.allSettled([
          api.get("/categories"),
          api.get("/products?limit=8"),
        ]);

        if (!isMounted) return;

        if (catRes.status === "fulfilled" && catRes.value?.categories) {
          setCategories(
            catRes.value.categories
              .filter((c) => c.isActive !== false)
              .slice(0, 6)
          );
        }

        if (prodRes.status === "fulfilled" && prodRes.value?.products) {
          setProducts(prodRes.value.products);
        } else if (prodRes.status === "rejected") {
          console.warn("Could not load featured products:", prodRes.reason?.message);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Home data fetch error:", err);
          setDataError("Marketplace data could not be refreshed from the server.");
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
          setProductsLoading(false);
        }
      }
    };

    fetchHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Search submission sends user to /products with search query
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/products");
    }
  };

  // Wishlist toggle handler
  const handleToggleWishlist = async (e, productId, productName) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (role !== "customer") {
      showFeedback("Only customers can save items to their wishlist", "warning");
      return;
    }
    try {
      if (isInWishlist(productId)) {
        await removeFromWishlist(productId);
        showFeedback(`Removed "${productName}" from wishlist`);
      } else {
        await addToWishlist(productId);
        showFeedback(`Saved "${productName}" to wishlist`);
      }
    } catch (err) {
      showFeedback(err.message || "Failed to update wishlist", "error");
    }
  };

  return (
    <div className="home-container">
      {/* Toast Feedback for Wishlist Actions */}
      {feedback && (
        <div
          className={`home-toast-banner ${feedback.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="graph-node-pip"></span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* =====================================================================
          1. HERO SECTION (Obsidian Graph Visual Foundation)
          ===================================================================== */}
      <section className="home-hero">
        {/* Subtle Graph Constellation Background Behind Hero */}
        <div className="hero-graph-backdrop" aria-hidden="true">
          <svg className="hero-graph-svg" viewBox="0 0 1000 320" fill="none">
            {/* Fine graph network connecting lines */}
            <path
              d="M140,70 L280,130 L460,90 L620,160 L780,80 L910,140"
              stroke="#0f172a"
              strokeOpacity="0.05"
              strokeWidth="1"
            />
            <path
              d="M280,130 L380,240 L620,160 L720,260 L910,140"
              stroke="#0f172a"
              strokeOpacity="0.04"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <path
              d="M80,210 L380,240 M620,160 L850,220"
              stroke="#6366f1"
              strokeOpacity="0.06"
              strokeWidth="1"
            />

            {/* Graph Nodes */}
            <circle cx="140" cy="70" r="3.5" fill="#6366f1" fillOpacity="0.3" />
            <circle cx="280" cy="130" r="4.5" fill="#0f172a" fillOpacity="0.15" />
            <circle cx="460" cy="90" r="3" fill="#6366f1" fillOpacity="0.4" />
            <circle cx="620" cy="160" r="5" fill="#0f172a" fillOpacity="0.2" />
            <circle cx="780" cy="80" r="3.5" fill="#6366f1" fillOpacity="0.3" />
            <circle cx="910" cy="140" r="4" fill="#0f172a" fillOpacity="0.15" />
            <circle cx="380" cy="240" r="3" fill="#6366f1" fillOpacity="0.25" />
            <circle cx="720" cy="260" r="3.5" fill="#0f172a" fillOpacity="0.12" />

            {/* Monospace Node Annotations */}
            <text x="148" y="65" fill="#94a3b8" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">node:catalog</text>
            <text x="468" y="85" fill="#94a3b8" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">state:synced</text>
            <text x="788" y="75" fill="#94a3b8" fontSize="9" fontFamily="monospace" letterSpacing="0.05em">auth:verified</text>
          </svg>
        </div>

        {/* Hero Content */}
        <div className="hero-content">
          <div className="hero-pill">
            <span className="graph-node-pip"></span>
            <span className="hero-pill-text">BAZORA KNOWLEDGE GRAPH // MARKETPLACE ENGINE</span>
          </div>

          <h1 className="hero-title">
            The Intelligent Marketplace for <br />
            <span className="hero-title-accent">Connected Commerce.</span>
          </h1>

          <p className="hero-description">
            Discover verified independent merchants, inspect live product variations,
            synchronize your wishlist, and experience seamless multi-vendor order fulfillment.
          </p>

          {/* Quick Catalog Search Bar */}
          <form className="hero-search-bar" onSubmit={handleSearchSubmit}>
            <span className="hero-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="hero-search-input"
              placeholder="Search products by title, category, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search marketplace products"
            />
            <button type="submit" className="hero-search-btn">
              Search
            </button>
          </form>

          {/* Primary & Secondary Call To Actions */}
          <div className="hero-cta-group">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => navigate("/products")}
            >
              <span>🛍️ Browse Products</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className="btn-hero-ai"
              onClick={() => navigate("/assistant")}
            >
              <span>✨ Ask Bazora AI</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => navigate(getRoleDefaultRoute(user?.role))}
              >
                <span>My Dashboard ({user?.role})</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => navigate("/login")}
              >
                <span>Sign In</span>
                <span className="btn-arrow" aria-hidden="true">→</span>
              </button>
            )}
          </div>

          {/* Technical Telemetry Metadata Hairline */}
          <div className="hero-telemetry-bar">
            <div className="telemetry-item">
              <span className="graph-node-pip success"></span>
              <span className="telemetry-label">NODE: CATALOG_LIVE</span>
            </div>
            <span className="telemetry-sep">/</span>
            <div className="telemetry-item">
              <span className="graph-node-pip muted"></span>
              <span className="telemetry-label">PROTOCOL: MERN_REST</span>
            </div>
            <span className="telemetry-sep">/</span>
            <div className="telemetry-item">
              <span className="graph-node-pip"></span>
              <span className="telemetry-label">AUTHENTICATION: JWT_RBAC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Global Error Banner (if API fetch fails) */}
      {dataError && (
        <div className="home-error-banner" role="alert">
          <span className="graph-node-pip muted"></span>
          <span>{dataError}</span>
        </div>
      )}

      {/* =====================================================================
          2. FEATURED CATEGORIES SECTION (Taxonomy Rail)
          ===================================================================== */}
      <section className="home-section">
        <div className="section-header">
          <div className="section-meta">
            <span className="section-index-tag">// 01 TAXONOMY</span>
            <h2 className="section-title">Featured Categories</h2>
          </div>
          <p className="section-subtitle">
            Navigate structured catalog nodes curated across verified marketplace sellers
          </p>
          <div className="section-hairline">
            <span className="graph-node-pip"></span>
          </div>
        </div>

        {categoriesLoading ? (
          /* Loading State Skeleton */
          <div className="categories-grid">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="category-card skeleton-card">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line medium"></div>
              </div>
            ))}
          </div>
        ) : categories.length > 0 ? (
          /* Real Categories Grid */
          <div className="categories-grid">
            {categories.map((category) => (
              <div
                key={category._id}
                className="category-card"
                onClick={() => navigate(`/products?category=${category._id}`)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    navigate(`/products?category=${category._id}`);
                  }
                }}
              >
                <div className="category-card-top">
                  <span className="graph-node-pip"></span>
                  <span className="category-meta-code">NODE // {category.name.substring(0, 3).toUpperCase()}</span>
                </div>
                <h3 className="category-name">{category.name}</h3>
                {category.description && (
                  <p className="category-description">{category.description}</p>
                )}
                <div className="category-card-footer">
                  <span className="category-explore-link">
                    Explore Node <span className="btn-arrow" aria-hidden="true">→</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="home-empty-box">
            <p>No active categories currently indexed in the catalog.</p>
          </div>
        )}
      </section>

      {/* =====================================================================
          3. FEATURED PRODUCTS SECTION (Live Catalog Grid)
          ===================================================================== */}
      <section className="home-section">
        <div className="section-header with-action">
          <div className="section-header-left">
            <div className="section-meta">
              <span className="section-index-tag">// 02 LIVE CATALOG</span>
              <h2 className="section-title">Featured Products</h2>
            </div>
            <p className="section-subtitle">
              Active listings available for immediate order from approved marketplace merchants
            </p>
          </div>

          <button
            type="button"
            className="btn-section-action"
            onClick={() => navigate("/products")}
          >
            <span>View All Listings</span>
            <span className="btn-arrow" aria-hidden="true">→</span>
          </button>

          <div className="section-hairline">
            <span className="graph-node-pip"></span>
          </div>
        </div>

        {productsLoading ? (
          /* Loading State Skeleton */
          <div className="home-products-grid">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="home-product-card skeleton-card">
                <div className="skeleton-rect"></div>
                <div className="skeleton-body">
                  <div className="skeleton-line short"></div>
                  <div className="skeleton-line long"></div>
                  <div className="skeleton-line medium"></div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          /* Real Products Grid */
          <div className="home-products-grid">
            {products.map((product) => {
              const inWishlist = isInWishlist(product._id);
              const discount = product.discountPercentage || 0;
              const originalPrice = product.basePrice || 0;
              const finalPrice =
                discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
              const imageUrl = product.images?.[0];

              return (
                <div
                  key={product._id}
                  className="home-product-card"
                  onClick={() => navigate(`/products/${product._id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/products/${product._id}`);
                    }
                  }}
                >
                  <div className="home-product-image-wrap">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="home-product-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="home-product-placeholder">
                        <span className="placeholder-icon">🛍️</span>
                      </div>
                    )}

                    {discount > 0 && (
                      <span className="home-discount-tag">-{discount}%</span>
                    )}

                    <button
                      type="button"
                      className={`home-btn-wishlist ${inWishlist ? "active" : ""}`}
                      onClick={(e) => handleToggleWishlist(e, product._id, product.name)}
                      title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                      aria-label="Wishlist toggle"
                    >
                      {inWishlist ? "❤️" : "🤍"}
                    </button>
                  </div>

                  <div className="home-product-body">
                    <div className="home-product-meta">
                      {product.brand && (
                        <span className="home-product-brand">{product.brand}</span>
                      )}
                      {product.categoryId?.name && (
                        <span className="home-product-category">
                          {product.categoryId.name}
                        </span>
                      )}
                    </div>

                    <h3 className="home-product-title" title={product.name}>
                      {product.name}
                    </h3>

                    {product.storeId?.storeName && (
                      <p className="home-product-seller">
                        Seller: <strong>{product.storeId.storeName}</strong>
                      </p>
                    )}

                    <div className="home-product-price-row">
                      <div className="home-price-stack">
                        <span className="home-current-price">
                          ${finalPrice.toFixed(2)}
                        </span>
                        {discount > 0 && (
                          <span className="home-original-price">
                            ${originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <span className="home-view-link">Details →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="home-empty-box">
            <p>No published products available in the live catalog.</p>
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => navigate("/products")}
            >
              Browse Full Catalog
            </button>
          </div>
        )}
      </section>

      {/* =====================================================================
          4. PLATFORM ARCHITECTURE SECTION (Preserved Core Pillars)
          ===================================================================== */}
      <section className="home-section features-section">
        <div className="section-header">
          <div className="section-meta">
            <span className="section-index-tag">// 03 ARCHITECTURE</span>
            <h2 className="section-title">Platform Infrastructure</h2>
          </div>
          <p className="section-subtitle">
            Engineered with precision for multi-vendor synchronization, live variant resolution, and real-time state integrity
          </p>
          <div className="section-hairline">
            <span className="graph-node-pip"></span>
          </div>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-icon" aria-hidden="true">🔍</span>
              <span className="feature-index-mono">[01 // ENGINE]</span>
            </div>
            <h3>Products & Search</h3>
            <p>
              Browse live catalog items with real-time text search, category filtering, and price
              sorting backed directly by database queries.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-icon" aria-hidden="true">✨</span>
              <span className="feature-index-mono">[02 // ATTRIBUTES]</span>
            </div>
            <h3>Variants & Options</h3>
            <p>
              Inspect dynamic product variations with live pricing, attributes, SKU tracking, and
              instant inventory validation.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-icon" aria-hidden="true">❤️</span>
              <span className="feature-index-mono">[03 // PERSISTENCE]</span>
            </div>
            <h3>Wishlist Synchronization</h3>
            <p>
              Save products to your personal wishlist with one-click toggles persisted across all
              your customer sessions.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-card-header">
              <span className="feature-icon" aria-hidden="true">🛒</span>
              <span className="feature-index-mono">[04 // MULTI-VENDOR]</span>
            </div>
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
