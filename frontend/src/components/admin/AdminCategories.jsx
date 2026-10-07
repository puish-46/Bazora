import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";

export default function AdminCategories() {
  const { navigate } = useNavigation();

  // State
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null for create, category object for edit
  const [formData, setFormData] = useState({ name: "", slug: "", description: "", isActive: true });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formServerError, setFormServerError] = useState(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Delete modal state
  const [deleteModalCategory, setDeleteModalCategory] = useState(null);
  const [checkingProducts, setCheckingProducts] = useState(false);
  const [productsUsingCategory, setProductsUsingCategory] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Helper to generate clean URL slugs from name
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Fetch categories from backend
  const fetchCategories = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/categories");
      if (res && Array.isArray(res.categories)) {
        setCategories(res.categories);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setError(formatApiError(err, "Failed to load marketplace categories."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Refresh handler
  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    setSuccessMsg(null);
    await fetchCategories();
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "", isActive: true });
    setFormErrors({});
    setFormServerError(null);
    setSlugManuallyEdited(false);
    setFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || "",
      slug: cat.slug || "",
      description: cat.description || "",
      isActive: cat.isActive !== false,
    });
    setFormErrors({});
    setFormServerError(null);
    setSlugManuallyEdited(true);
    setFormModalOpen(true);
  };

  // Handle name input with auto-slug generation
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: slugManuallyEdited ? prev.slug : generateSlug(val),
    }));
    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
    if (formServerError) setFormServerError(null);
  };

  // Handle slug input
  const handleSlugChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlugManuallyEdited(true);
    setFormData((prev) => ({ ...prev, slug: val }));
    if (formErrors.slug) setFormErrors((prev) => ({ ...prev, slug: null }));
    if (formServerError) setFormServerError(null);
  };

  // Validate modal form
  const validateForm = () => {
    const errors = {};
    const trimmedName = formData.name.trim();
    const trimmedSlug = formData.slug.trim();

    if (!trimmedName) {
      errors.name = "Category name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Category name must be at least 2 characters.";
    } else if (trimmedName.length > 100) {
      errors.name = "Category name cannot exceed 100 characters.";
    } else {
      // Check duplicate name against existing categories (excluding current category in edit mode)
      const duplicateName = categories.find(
        (c) =>
          c.name.toLowerCase() === trimmedName.toLowerCase() &&
          (!editingCategory || c._id !== editingCategory._id)
      );
      if (duplicateName) {
        errors.name = `A category with the name "${trimmedName}" already exists.`;
      }
    }

    if (!trimmedSlug) {
      errors.slug = "Category slug is required.";
    } else if (trimmedSlug.length < 2) {
      errors.slug = "Category slug must be at least 2 characters.";
    } else if (trimmedSlug.length > 100) {
      errors.slug = "Category slug cannot exceed 100 characters.";
    } else {
      // Check duplicate slug
      const duplicateSlug = categories.find(
        (c) =>
          c.slug.toLowerCase() === trimmedSlug.toLowerCase() &&
          (!editingCategory || c._id !== editingCategory._id)
      );
      if (duplicateSlug) {
        errors.slug = `A category with the slug "${trimmedSlug}" already exists.`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add or Edit Form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormServerError(null);

    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        description: formData.description.trim(),
        isActive: formData.isActive,
      };

      if (editingCategory) {
        // PUT /api/categories/:id
        const res = await api.put(`/categories/${editingCategory._id}`, payload);
        if (res?.success) {
          setSuccessMsg(`Category "${payload.name}" updated successfully.`);
          setFormModalOpen(false);
          await fetchCategories();
        } else {
          throw new Error(res?.message || "Failed to update category.");
        }
      } else {
        // POST /api/categories
        const res = await api.post("/categories", payload);
        if (res?.success) {
          setSuccessMsg(`Category "${payload.name}" created successfully.`);
          setFormModalOpen(false);
          await fetchCategories();
        } else {
          throw new Error(res?.message || "Failed to create category.");
        }
      }
    } catch (err) {
      console.error("Category save error:", err);
      setFormServerError(formatApiError(err, "Failed to save category. Please check your inputs."));
    } finally {
      setSaving(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = async (cat) => {
    setDeleteModalCategory(cat);
    setCheckingProducts(true);
    setProductsUsingCategory(0);
    setDeleteError(null);

    try {
      // Query if any products exist under this category
      const res = await api.get(`/products?category=${cat._id}&limit=1`);
      const count = res?.pagination?.totalProducts || (Array.isArray(res?.products) ? res.products.length : 0);
      setProductsUsingCategory(count);
    } catch (err) {
      console.warn("Could not check category product dependencies:", err);
      setProductsUsingCategory(0);
    } finally {
      setCheckingProducts(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalCategory || productsUsingCategory > 0 || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      // Try to deactivate the category via PUT /api/categories/:id with isActive: false
      // This immediately removes it from active category queries without destroying historical product links
      const res = await api.put(`/categories/${deleteModalCategory._id}`, {
        isActive: false,
      });

      if (res?.success) {
        setSuccessMsg(`Category "${deleteModalCategory.name}" has been deleted.`);
        setDeleteModalCategory(null);
        await fetchCategories();
      } else {
        throw new Error(res?.message || "Failed to delete category.");
      }
    } catch (err) {
      console.error("Delete category failed:", err);
      setDeleteError(
        formatApiError(err, "Failed to delete category. It may be referenced by existing marketplace records.")
      );
    } finally {
      setDeleting(false);
    }
  };

  // Filter categories client-side based on search query
  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      cat.name?.toLowerCase().includes(q) ||
      cat.slug?.toLowerCase().includes(q) ||
      cat.description?.toLowerCase().includes(q) ||
      cat._id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-page-container">
      {/* Header Bar */}
      <div className="admin-overview-header">
        <div className="admin-overview-header-left">
          <div className="admin-header-nav-wrap">
            <button
              type="button"
              className="btn-text-link"
              onClick={() => navigate("/admin")}
              title="Return to Admin Overview Dashboard"
            >
              ← Dashboard
            </button>
          </div>
          <h2>Category Management</h2>
          <p className="admin-subtitle">
            Create and manage marketplace categories used by product listings.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCreateModal}
            title="Create a new marketplace category"
          >
            + Add Category
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Reload categories from database"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Categories"}
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

      {/* Search and Metric Bar */}
      <div className="admin-controls-card">
        <div className="admin-search-form" style={{ maxWidth: "100%" }}>
          <div className="admin-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search categories by name, slug, or description..."
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
                title="Clear search query"
              >
                ✕
              </button>
            )}
          </div>
          <div className="user-count-indicator">
            <span>
              Total: <strong>{loading ? "..." : categories.length}</strong> categories
            </span>
          </div>
        </div>
      </div>

      {/* Main Category Table or Empty State */}
      <div className="admin-table-card">
        {loading && !refreshing ? (
          <div className="admin-loading-state">
            <div className="auth-spinner large"></div>
            <p>Loading marketplace categories...</p>
          </div>
        ) : categories.length === 0 ? (
          /* Empty State */
          <div className="admin-empty-table-state">
            <span className="empty-icon">🏷️</span>
            <h3>No categories yet</h3>
            <p>Create your first marketplace category to start organizing products.</p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenCreateModal}
              style={{ marginTop: "1rem" }}
            >
              + Add Category
            </button>
          </div>
        ) : filteredCategories.length === 0 ? (
          /* Search Empty State */
          <div className="admin-empty-table-state">
            <span className="empty-icon">🔍</span>
            <h3>No Categories Match Your Search</h3>
            <p>No categories were found matching "{searchQuery}". Try a different keyword.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSearchQuery("")}
              style={{ marginTop: "1rem" }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Categories Table */
          <div className="admin-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => (
                  <tr key={cat._id}>
                    <td>
                      <div className="table-user-name">
                        <strong>{cat.name}</strong>
                      </div>
                      <div className="table-subtext mono-id">{cat._id}</div>
                    </td>

                    <td>
                      <span className="admin-resource-badge">{cat.slug}</span>
                    </td>

                    <td>
                      <span className="category-desc-preview" title={cat.description || "No description provided"}>
                        {cat.description || <span style={{ color: "var(--text-subtle)" }}>—</span>}
                      </span>
                    </td>

                    <td>
                      <span className={`status-pill ${cat.isActive !== false ? "confirmed" : "cancelled"}`}>
                        {cat.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : "N/A"}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="btn-action-sm btn-action-view"
                          onClick={() => handleOpenEditModal(cat)}
                          title={`Edit ${cat.name}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-action-sm btn-action-danger"
                          onClick={() => handleOpenDeleteModal(cat)}
                          title={`Delete ${cat.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =====================================================================
          1. ADD / EDIT CATEGORY MODAL
          ===================================================================== */}
      {formModalOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={!saving ? () => setFormModalOpen(false) : undefined}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-cluster">
                <span className="modal-title-icon">🏷️</span>
                <h3>{editingCategory ? "Edit Category" : "Add New Category"}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setFormModalOpen(false)}
                disabled={saving}
                aria-label="Close category modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="admin-modal-body">
                {formServerError && (
                  <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
                    <span className="alert-icon">⚠️</span>
                    <span>{formServerError}</span>
                  </div>
                )}

                {/* Category Name */}
                <div className={`form-group ${formErrors.name ? "has-error" : ""}`}>
                  <label htmlFor="category-name">
                    Category Name <span className="required-star">*</span>
                  </label>
                  <input
                    id="category-name"
                    type="text"
                    placeholder="e.g., Electronics, Fashion, Home & Kitchen"
                    value={formData.name}
                    onChange={handleNameChange}
                    disabled={saving}
                    autoComplete="off"
                    required
                  />
                  {formErrors.name ? (
                    <span className="field-error-text">{formErrors.name}</span>
                  ) : (
                    <span className="field-hint-text">
                      Display name shown to customers and sellers across the marketplace.
                    </span>
                  )}
                </div>

                {/* Slug */}
                <div className={`form-group ${formErrors.slug ? "has-error" : ""}`} style={{ marginTop: "1rem" }}>
                  <label htmlFor="category-slug">
                    Category Slug <span className="required-star">*</span>
                  </label>
                  <input
                    id="category-slug"
                    type="text"
                    placeholder="e.g., electronics, home-kitchen"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    disabled={saving}
                    autoComplete="off"
                    required
                  />
                  {formErrors.slug ? (
                    <span className="field-error-text">{formErrors.slug}</span>
                  ) : (
                    <span className="field-hint-text">
                      URL identifier used for category filtering and routing.
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="form-group" style={{ marginTop: "1rem" }}>
                  <label htmlFor="category-desc">Description (Optional)</label>
                  <textarea
                    id="category-desc"
                    placeholder="Short summary of products categorized under this department..."
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={saving}
                    rows={3}
                    maxLength={500}
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-strong)",
                      fontFamily: "inherit",
                      fontSize: "0.9rem",
                      resize: "vertical",
                    }}
                  />
                  <span className="field-hint-text">Maximum 500 characters.</span>
                </div>

                {/* Active Checkbox (Edit Mode) */}
                {editingCategory && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      marginTop: "1.25rem",
                      padding: "0.75rem",
                      backgroundColor: "var(--bg-page)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <input
                      id="category-active"
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                      disabled={saving}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <label htmlFor="category-active" style={{ cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 }}>
                      Active Category (available in catalog search and seller listings)
                    </label>
                  </div>
                )}
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setFormModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true"></span>
                      <span>Saving...</span>
                    </>
                  ) : editingCategory ? (
                    "Save Changes"
                  ) : (
                    "+ Create Category"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. DELETE CONFIRMATION MODAL
          ===================================================================== */}
      {deleteModalCategory && (
        <div
          className="admin-modal-backdrop"
          onClick={!deleting ? () => setDeleteModalCategory(null) : undefined}
          role="dialog"
          aria-modal="true"
        >
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-cluster">
                <span className="modal-title-icon">⚠️</span>
                <h3>Delete Category?</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteModalCategory(null)}
                disabled={deleting}
                aria-label="Close delete modal"
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              {deleteError && (
                <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
                  <span className="alert-icon">✕</span>
                  <span>{deleteError}</span>
                </div>
              )}

              <p style={{ fontSize: "1.05rem", color: "var(--text-main)", marginBottom: "1rem" }}>
                Are you sure you want to delete category <strong>"{deleteModalCategory.name}"</strong>?
              </p>

              {checkingProducts ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", margin: "1rem 0" }}>
                  <div className="auth-spinner" style={{ width: "16px", height: "16px" }}></div>
                  <span>Verifying product references in database...</span>
                </div>
              ) : productsUsingCategory > 0 ? (
                /* Blocked Deletion Notice */
                <div className="alert alert-danger" role="alert" style={{ margin: "1rem 0" }}>
                  <span className="alert-icon">🚫</span>
                  <div>
                    <strong>This category cannot be deleted because products are currently using it.</strong>
                    <p style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
                      There are active marketplace products assigned to this category. Please reassign or remove those
                      products before deleting this category.
                    </p>
                  </div>
                </div>
              ) : (
                /* Safe to delete notice */
                <div
                  style={{
                    backgroundColor: "var(--bg-page)",
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.88rem",
                    color: "var(--text-secondary)",
                    margin: "1rem 0",
                  }}
                >
                  No active products are assigned to this category. Deleting it will remove it from future seller product
                  selection and marketplace taxonomy.
                </div>
              )}
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDeleteModalCategory(null)}
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-action-sm btn-action-danger"
                style={{ padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
                onClick={handleConfirmDelete}
                disabled={deleting || checkingProducts || productsUsingCategory > 0}
                title={
                  productsUsingCategory > 0
                    ? "Cannot delete category with associated products"
                    : "Delete this category"
                }
              >
                {deleting ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
