import { useState, useEffect } from "react";
import { api, formatApiError } from "../../services/api.js";
import SellerProductModal from "./SellerProductModal.jsx";
import SellerVariantModal from "./SellerVariantModal.jsx";

export default function SellerProducts({ store, accountStatus, onStoreRequested }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Filter & Search state
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [activeProductForEdit, setActiveProductForEdit] = useState(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [activeProductForVariants, setActiveProductForVariants] = useState(null);

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/products/my"),
        api.get("/categories"),
      ]);

      if (prodRes && Array.isArray(prodRes.products)) {
        setProducts(prodRes.products);
      } else {
        setProducts([]);
      }

      if (catRes && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Failed to load products or categories:", err);
      setError(formatApiError(err, "Could not load products catalog."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const handleDeleteProduct = async (productId, productName) => {
    if (deletingProductId) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${productName}"?`)) {
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setDeletingProductId(productId);

    try {
      await api.delete(`/products/${productId}`);
      setSuccessMsg(`Product "${productName}" was deleted.`);
      await fetchProductsAndCategories();
    } catch (err) {
      console.error("Delete product error:", err);
      setError(formatApiError(err, "Failed to delete product."));
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleOpenCreate = () => {
    if (!store?._id) {
      if (onStoreRequested) {
        onStoreRequested();
      }
      return;
    }
    setIsCreatingProduct(true);
  };

  // Filter logic
  const filteredProducts = products.filter((p) => {
    const matchesStatus =
      statusFilter === "all" || (p.status || "draft") === statusFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="seller-products-page">
      <div className="seller-subpage-header">
        <div>
          <h2>Product Catalog ({products.length})</h2>
          <p className="subpage-subtitle">
            Create, edit, and manage your store's listings and variants
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={handleOpenCreate}>
          + Create New Product
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" role="alert">
          <span className="alert-icon">✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Storefront Setup Prompt if not configured */}
      {!store?._id && (
        <div className="alert alert-warning" role="alert" style={{ marginBottom: "1rem" }}>
          <span className="alert-icon">🏪</span>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <span>
              Storefront not configured yet. Configure your store name and details to start listing products on Bazora.
            </span>
            <button
              type="button"
              className="btn-primary small"
              onClick={() => onStoreRequested && onStoreRequested()}
            >
              Configure Storefront
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="seller-table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by title, brand, or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses ({products.length})</option>
            <option value="approved">Approved & Active</option>
            <option value="pending">Pending Approval</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="seller-loading-box">
          <div className="auth-spinner large"></div>
          <p>Loading your products catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-overview-box large">
          {products.length === 0 ? (
            <>
              <span className="empty-icon-lg">📦</span>
              <h3>No Products Listed</h3>
              <p>You haven't listed any products yet. Click '+ Create New Product' to submit your first item.</p>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={handleOpenCreate}
              >
                + Create First Product
              </button>
            </>
          ) : (
            <>
              <span className="empty-icon-lg">🔍</span>
              <h3>No Matching Products</h3>
              <p>No products were found matching your current search or status filter.</p>
              <button
                type="button"
                className="btn-ghost"
                style={{ marginTop: "1rem" }}
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Search & Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="seller-table-card">
          <table className="seller-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const img = p.images?.[0];
                return (
                  <tr key={p._id}>
                    <td>
                      <div className="product-table-cell">
                        <div className="product-mini-thumb">
                          {img ? (
                            <img src={img} alt={p.name} />
                          ) : (
                            <span>🛍️</span>
                          )}
                        </div>
                        <div className="product-cell-info">
                          <strong className="product-cell-title">{p.name}</strong>
                          <span className="product-cell-slug mono">{p.slug}</span>
                          {p.brand && <span className="product-cell-brand">{p.brand}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{p.categoryId?.name || "General"}</td>
                    <td>
                      <strong>${Number(p.basePrice || 0).toFixed(2)}</strong>
                    </td>
                    <td>
                      {p.discountPercentage > 0 ? (
                        <span className="badge-discount">-{p.discountPercentage}%</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          p.status === "approved"
                            ? "confirmed"
                            : p.status === "pending"
                            ? "pending"
                            : p.status === "rejected"
                            ? "failed"
                            : "cancelled"
                        }`}
                      >
                        {p.status || "draft"}
                      </span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="table-actions-cluster">
                        <button
                          type="button"
                          className="btn-action-small primary"
                          onClick={() => setActiveProductForVariants(p)}
                          title="Configure SKUs and variants"
                        >
                          Variants
                        </button>
                        <button
                          type="button"
                          className="btn-action-small secondary"
                          onClick={() => setActiveProductForEdit(p)}
                          title="Edit product details"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action-small danger"
                          onClick={() => handleDeleteProduct(p._id, p.name)}
                          disabled={deletingProductId === p._id}
                          title="Delete product"
                        >
                          {deletingProductId === p._id ? "Deleting..." : "Delete"}
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

      {/* Create Modal */}
      {isCreatingProduct && (
        <SellerProductModal
          product={null}
          store={store}
          categories={categories}
          onClose={() => setIsCreatingProduct(false)}
          onSaved={(newProd) => {
            setSuccessMsg(`Product "${newProd.name}" created successfully!`);
            fetchProductsAndCategories();
          }}
        />
      )}

      {/* Edit Modal */}
      {activeProductForEdit && (
        <SellerProductModal
          product={activeProductForEdit}
          store={store}
          categories={categories}
          onClose={() => setActiveProductForEdit(null)}
          onSaved={(updProd) => {
            setSuccessMsg(`Product "${updProd.name}" updated successfully!`);
            fetchProductsAndCategories();
          }}
        />
      )}

      {/* Variants Modal */}
      {activeProductForVariants && (
        <SellerVariantModal
          product={activeProductForVariants}
          onClose={() => setActiveProductForVariants(null)}
          onVariantsChanged={fetchProductsAndCategories}
        />
      )}
    </div>
  );
}
