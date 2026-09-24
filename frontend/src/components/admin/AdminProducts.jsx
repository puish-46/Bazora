import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";
import AdminProductDetailsModal from "./AdminProductDetailsModal.jsx";
import AdminProductConfirmModal from "./AdminProductConfirmModal.jsx";

export default function AdminProducts() {
  const { navigate } = useNavigation();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalProducts: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search state (client-side matching against real returned pending queue)
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedProductForDetails, setSelectedProductForDetails] = useState(null);
  const [confirmModalData, setConfirmModalData] = useState(null); // { product, actionType: "approve" | "reject" }

  // Track product IDs with active mutations to prevent duplicate actions
  const [processingProductIds, setProcessingProductIds] = useState(new Set());

  const fetchPendingProducts = useCallback(async (page = 1) => {
    setError(null);
    try {
      const res = await api.get(`/admin/products/pending?page=${page}&limit=10`);
      if (res && Array.isArray(res.products)) {
        setProducts(res.products);
        if (res.pagination) {
          setPagination(res.pagination);
          setCurrentPage(res.pagination.currentPage);
        }
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load pending products:", err);
      setError(formatApiError(err, "Failed to retrieve pending product listings."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingProducts(currentPage);
  }, [fetchPendingProducts, currentPage]);

  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    setSuccessMsg(null);
    await fetchPendingProducts(currentPage);
  };

  const handlePageChange = (newPage) => {
    if (loading || newPage < 1 || newPage > pagination.totalPages) return;
    setCurrentPage(newPage);
  };

  const handleActionSuccess = (message, processedProductId) => {
    setSuccessMsg(message);
    // Remove processed product from active pending queue
    setProducts((prev) => prev.filter((p) => p._id !== processedProductId));
    setProcessingProductIds((prev) => {
      const next = new Set(prev);
      next.delete(processedProductId);
      return next;
    });

    // Re-synchronize current page or adjust if last item on page was removed
    if (products.length === 1 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    } else {
      fetchPendingProducts(currentPage);
    }
  };

  // Filter products client-side based on search query
  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q) ||
      p._id?.toLowerCase().includes(q) ||
      p.storeId?.storeName?.toLowerCase().includes(q) ||
      p.sellerId?.businessName?.toLowerCase().includes(q) ||
      p.categoryId?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-products-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-text">
          <h2>Product Catalog Moderation</h2>
          <p className="subpage-subtitle">
            Inspect pending product listings from marketplace merchants, verify details, and approve or reject submissions.
          </p>
        </div>

        <div className="admin-page-actions" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/admin")}
            title="Return to Admin Overview Dashboard"
          >
            ← Dashboard
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Reload pending product queue"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Products"}
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">✓</span>
          <div style={{ flex: 1 }}>{successMsg}</div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setSuccessMsg(null)}
            style={{ color: "var(--color-success)", background: "transparent", border: "none" }}
            aria-label="Dismiss success message"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1 }}>{error}</div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Queue Metrics Bar */}
      <div className="admin-controls-card">
        <div className="admin-search-form" style={{ maxWidth: "100%" }}>
          <div className="admin-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search pending products by title, brand, merchant, store, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
              className="admin-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search text"
              >
                ✕
              </button>
            )}
          </div>
          <div className="user-count-indicator">
            <span>
              Queue: <strong>{loading ? "..." : pagination.totalProducts || products.length}</strong> pending moderation
            </span>
          </div>
        </div>
      </div>

      {/* Main Queue Table or Empty State */}
      <div className="admin-table-card">
        {loading && !refreshing ? (
          <div className="admin-loading-state">
            <div className="auth-spinner large"></div>
            <p>Fetching pending product listings for moderation...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">✅</span>
            <h3>No products are currently awaiting moderation.</h3>
            <p>
              All merchant product submissions have been reviewed. There are no pending listings in the queue.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">🔍</span>
            <h3>No Products Match Your Search</h3>
            <p>
              No pending listings matched the search query &quot;<strong>{searchQuery}</strong>&quot;.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Product Listing</th>
                  <th>Merchant &amp; Store</th>
                  <th>Category &amp; Pricing</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isProcessing = processingProductIds.has(product._id);
                  const firstImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
                  const basePrice = Number(product.basePrice) || 0;
                  const discountPercentage = Number(product.discountPercentage) || 0;

                  return (
                    <tr key={product._id}>
                      {/* Product details */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                          <div
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "var(--radius-sm)",
                              overflow: "hidden",
                              backgroundColor: "var(--bg-page)",
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {firstImage ? (
                              <img
                                src={firstImage}
                                alt={product.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: "1.4rem" }}>📦</span>
                            )}
                          </div>
                          <div>
                            <div className="table-user-name">
                              <strong>{product.name}</strong>
                            </div>
                            <div className="table-subtext">
                              Brand: {product.brand || "Generic"}
                            </div>
                            <div className="table-subtext mono-id" style={{ marginTop: "0.15rem" }}>
                              ID: {product._id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Merchant & Store */}
                      <td>
                        <div>
                          <strong>{product.storeId?.storeName || "Direct Store"}</strong>
                        </div>
                        <div className="table-subtext">
                          Merchant: {product.sellerId?.businessName || "Unknown Seller"}
                        </div>
                        {product.sellerId?.businessEmail && (
                          <div className="table-subtext">
                            ✉️ {product.sellerId.businessEmail}
                          </div>
                        )}
                      </td>

                      {/* Category & Pricing */}
                      <td>
                        <div>
                          <strong>${basePrice.toFixed(2)}</strong>
                          {discountPercentage > 0 && (
                            <span style={{ color: "var(--color-success)", fontSize: "0.8rem", marginLeft: "0.35rem" }}>
                              ({discountPercentage}% off)
                            </span>
                          )}
                        </div>
                        <div className="table-subtext">
                          📂 {product.categoryId?.name || "Uncategorized"}
                        </div>
                      </td>

                      {/* Submitted Date */}
                      <td>
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>

                      {/* Status */}
                      <td>
                        <span className="status-pill pending">Pending Review</span>
                      </td>

                      {/* Moderation Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="admin-row-actions">
                          {/* Details Button */}
                          <button
                            type="button"
                            className="btn-action-sm btn-action-view"
                            onClick={() => setSelectedProductForDetails(product)}
                            disabled={isProcessing}
                            title="Inspect product details and photos"
                          >
                            Details
                          </button>

                          {/* Approve Button */}
                          <button
                            type="button"
                            className="btn-action-sm btn-action-activate"
                            onClick={() =>
                              setConfirmModalData({ product, actionType: "approve" })
                            }
                            disabled={isProcessing}
                            title="Approve product listing for marketplace"
                          >
                            Approve
                          </button>

                          {/* Reject Button */}
                          <button
                            type="button"
                            className="btn-action-sm btn-action-deactivate"
                            onClick={() =>
                              setConfirmModalData({ product, actionType: "reject" })
                            }
                            disabled={isProcessing}
                            title="Reject product listing"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-wrapper" style={{ padding: "1.25rem 1.5rem" }}>
            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || loading}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page <strong>{pagination.currentPage}</strong> of{" "}
              <strong>{pagination.totalPages}</strong> ({pagination.totalProducts} pending products)
            </span>

            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || loading}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {selectedProductForDetails && (
        <AdminProductDetailsModal
          product={selectedProductForDetails}
          onClose={() => setSelectedProductForDetails(null)}
          onApprove={(product) =>
            setConfirmModalData({ product, actionType: "approve" })
          }
          onReject={(product) =>
            setConfirmModalData({ product, actionType: "reject" })
          }
        />
      )}

      {/* Approval / Rejection Confirmation Modal */}
      {confirmModalData && (
        <AdminProductConfirmModal
          product={confirmModalData.product}
          actionType={confirmModalData.actionType}
          onClose={() => setConfirmModalData(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
