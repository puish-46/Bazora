import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api.js";
import { useNavigation } from "../context/NavigationContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProductList() {
  const { queryParams, navigate } = useNavigation();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useShop();
  const { isAuthenticated, role } = useAuth();

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 12,
    totalProducts: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter controls synced with URL query parameters
  const [searchTerm, setSearchTerm] = useState(queryParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(queryParams.get("category") || "");
  const [selectedSort, setSelectedSort] = useState(queryParams.get("sort") || "newest");
  const currentPage = Number(queryParams.get("page") || 1);

  // Feedback notification
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Load Categories for filter dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");
        if (res && Array.isArray(res.categories)) {
          setCategories(res.categories.filter((c) => c.isActive !== false));
        }
      } catch (err) {
        console.warn("Could not load categories list:", err.message);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Products matching current query parameters from backend
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    const search = queryParams.get("search");
    const category = queryParams.get("category");
    const sort = queryParams.get("sort");
    const page = queryParams.get("page") || 1;

    if (search) params.append("search", search);
    if (category) params.append("category", category);
    if (sort) params.append("sort", sort);
    params.append("page", page);
    params.append("limit", "12");

    try {
      const endpoint = `/products?${params.toString()}`;
      const res = await api.get(endpoint);

      if (res && Array.isArray(res.products)) {
        setProducts(res.products);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products from API:", err);
      setError(
        err.message || "Unable to retrieve products. Please check server connection."
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync state when query params change externally
  useEffect(() => {
    setSearchTerm(queryParams.get("search") || "");
    setSelectedCategory(queryParams.get("category") || "");
    setSelectedSort(queryParams.get("sort") || "newest");
  }, [queryParams]);

  // Search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate("/products", {
      search: searchTerm.trim() || undefined,
      category: selectedCategory || undefined,
      sort: selectedSort || undefined,
      page: 1,
    });
  };

  // Category change
  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    setSelectedCategory(newCategory);
    navigate("/products", {
      search: searchTerm.trim() || undefined,
      category: newCategory || undefined,
      sort: selectedSort || undefined,
      page: 1,
    });
  };

  // Sort change
  const handleSortChange = (e) => {
    const newSort = e.target.value;
    setSelectedSort(newSort);
    navigate("/products", {
      search: searchTerm.trim() || undefined,
      category: selectedCategory || undefined,
      sort: newSort || undefined,
      page: currentPage,
    });
  };

  // Pagination navigation
  const handlePageChange = (newPage) => {
    navigate("/products", {
      search: searchTerm.trim() || undefined,
      category: selectedCategory || undefined,
      sort: selectedSort || undefined,
      page: newPage,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedSort("newest");
    navigate("/products");
  };

  // Wishlist toggle handler
  const handleToggleWishlist = async (e, productId, productName) => {
    e.stopPropagation();

    if (!isAuthenticated || role !== "customer") {
      navigate("/login");
      return;
    }

    try {
      if (isInWishlist(productId)) {
        await removeFromWishlist(productId);
        showFeedback(`Removed "${productName}" from wishlist`, "info");
      } else {
        await addToWishlist(productId);
        showFeedback(`Added "${productName}" to wishlist!`, "success");
      }
    } catch (err) {
      showFeedback(err.message || "Failed to update wishlist", "danger");
    }
  };

  return (
    <div className="product-page-container">
      {/* Page Header */}
      <div className="products-hero-header">
        <h1>Marketplace Products</h1>
        <p>Explore high quality items verified and listed by approved marketplace sellers</p>
      </div>

      {feedback && (
        <div className={`floating-toast toast-${feedback.type}`} role="status">
          {feedback.message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="products-toolbar">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="search"
            placeholder="Search by product name, brand or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn-search">
            Search
          </button>
        </form>

        <div className="filter-controls">
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="filter-select"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSort}
            onChange={handleSortChange}
            className="filter-select"
            aria-label="Sort products"
          >
            <option value="newest">Newest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="oldest">Oldest First</option>
          </select>

          {(queryParams.get("search") || queryParams.get("category")) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-clear-filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="products-grid-loading" role="status">
          <div className="auth-spinner large"></div>
          <p>Loading products from marketplace...</p>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <div className="empty-products-state">
          <div className="empty-icon">📦</div>
          <h3>No Products Available</h3>
          <p>
            {queryParams.get("search") || queryParams.get("category")
              ? "No products matched your search or category filter. Try clearing your search parameters."
              : "No approved products have been published yet by marketplace vendors."}
          </p>
          {(queryParams.get("search") || queryParams.get("category")) ? (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-primary"
            >
              Show All Products
            </button>
          ) : (
            <button
              type="button"
              onClick={fetchProducts}
              className="btn-ghost"
            >
              Refresh Listings
            </button>
          )}
        </div>
      ) : (
        /* Products Grid */
        <>
          <div className="products-grid">
            {products.map((product) => {
              const inWishlist = isInWishlist(product._id);
              const discount = product.discountPercentage || 0;
              const originalPrice = product.basePrice || 0;
              const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
              const imageUrl = product.images?.[0];

              return (
                <div
                  key={product._id}
                  className="product-card"
                  onClick={() => navigate(`/products/${product._id}`)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      navigate(`/products/${product._id}`);
                    }
                  }}
                >
                  <div className="product-image-wrap">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="product-thumb-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-placeholder-img">
                        <span>🛍️</span>
                      </div>
                    )}

                    {discount > 0 && (
                      <span className="product-discount-tag">-{discount}%</span>
                    )}

                    <button
                      type="button"
                      className={`btn-wishlist-toggle ${inWishlist ? "active" : ""}`}
                      onClick={(e) => handleToggleWishlist(e, product._id, product.name)}
                      title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                      aria-label="Wishlist toggle"
                    >
                      {inWishlist ? "❤️" : "🤍"}
                    </button>
                  </div>

                  <div className="product-card-body">
                    <div className="product-meta-row">
                      {product.brand && (
                        <span className="product-brand-tag">{product.brand}</span>
                      )}
                      {product.categoryId?.name && (
                        <span className="product-category-pill">
                          {product.categoryId.name}
                        </span>
                      )}
                    </div>

                    <h3 className="product-title" title={product.name}>
                      {product.name}
                    </h3>

                    {product.storeId?.storeName && (
                      <p className="product-store-text">
                        Sold by: <strong>{product.storeId.storeName}</strong>
                      </p>
                    )}

                    <div className="product-price-row">
                      <div className="price-stack">
                        <span className="current-price">
                          ${finalPrice.toFixed(2)}
                        </span>
                        {discount > 0 && (
                          <span className="original-price">
                            ${originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <span className="btn-view-product">Details →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-wrapper">
              <button
                type="button"
                className="btn-page"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage}
              >
                ← Previous
              </button>

              <span className="pagination-info">
                Page <strong>{pagination.currentPage}</strong> of{" "}
                <strong>{pagination.totalPages}</strong> ({pagination.totalProducts} items)
              </span>

              <button
                type="button"
                className="btn-page"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
