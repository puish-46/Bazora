import { useState } from "react";

export default function AdminProductDetailsModal({ product, onClose, onApprove, onReject }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!product) return null;

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [];
  const currentImage = images[selectedImageIndex] || null;

  // Calculate effective price if discount exists
  const basePrice = Number(product.basePrice) || 0;
  const discountPercentage = Number(product.discountPercentage) || 0;
  const hasDiscount = discountPercentage > 0;
  const discountedPrice = hasDiscount
    ? basePrice - (basePrice * discountPercentage) / 100
    : basePrice;

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-details-modal-title"
    >
      <div
        className="admin-modal-box admin-product-details-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Modal Header */}
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">📦</span>
            <h3 id="product-details-modal-title">Product Moderation Review</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close product details modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="admin-modal-body">
          {/* Header Card */}
          <div className="user-profile-header-card" style={{ alignItems: "flex-start" }}>
            <div
              className="product-modal-hero-thumb"
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {currentImage ? (
                <img
                  src={currentImage}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span style={{ fontSize: "2rem" }}>📦</span>
              )}
            </div>

            <div className="user-profile-summary" style={{ flex: 1 }}>
              <h4 style={{ fontSize: "1.25rem", margin: 0, color: "var(--text-main)" }}>
                {product.name}
              </h4>
              <p className="user-summary-email" style={{ margin: "0.25rem 0" }}>
                Brand: <strong>{product.brand || "Unbranded / Generic"}</strong> • Slug:{" "}
                <code>{product.slug}</code>
              </p>
              <div className="user-summary-pills" style={{ marginTop: "0.5rem" }}>
                <span className="status-pill pending">Pending Moderation</span>
                {product.categoryId?.name && (
                  <span
                    className="self-badge"
                    style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-main)" }}
                  >
                    📂 {product.categoryId.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Image Gallery (if multiple images exist) */}
          {images.length > 1 && (
            <div style={{ marginTop: "1rem" }}>
              <span className="user-detail-label" style={{ display: "block", marginBottom: "0.5rem" }}>
                Product Gallery ({images.length} photos)
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  overflowX: "auto",
                  paddingBottom: "0.5rem",
                }}
              >
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "var(--radius-sm)",
                      border:
                        selectedImageIndex === idx
                          ? "2px solid var(--role-admin)"
                          : "1px solid var(--border-subtle)",
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: "var(--bg-page)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Product Details Grid */}
          <div className="user-details-grid" style={{ marginTop: "1.25rem" }}>
            <div className="user-detail-item">
              <span className="user-detail-label">Product ID</span>
              <span className="user-detail-val mono-id">{product._id}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Pricing</span>
              <span className="user-detail-val">
                ${basePrice.toFixed(2)}
                {hasDiscount && (
                  <span style={{ color: "var(--color-success)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                    (${discountedPrice.toFixed(2)} with {discountPercentage}% off)
                  </span>
                )}
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Category</span>
              <span className="user-detail-val">{product.categoryId?.name || "Uncategorized"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Storefront</span>
              <span className="user-detail-val">
                {product.storeId?.storeName || "Direct Merchant Listing"}
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Seller Merchant</span>
              <span className="user-detail-val">
                {product.sellerId?.businessName || "Unknown Seller"}
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Merchant Contact Email</span>
              <span className="user-detail-val">
                {product.sellerId?.businessEmail || "No email available"}
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Merchant Phone</span>
              <span className="user-detail-val">{product.sellerId?.phone || "Not provided"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Submission Date</span>
              <span className="user-detail-val">
                {product.createdAt ? new Date(product.createdAt).toLocaleString() : "N/A"}
              </span>
            </div>
          </div>

          {/* Description Block */}
          <div style={{ marginTop: "1.25rem" }}>
            <span className="user-detail-label" style={{ display: "block", marginBottom: "0.4rem" }}>
              Product Listing Description
            </span>
            <div
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "0.85rem 1rem",
                color: "var(--text-main)",
                fontSize: "0.92rem",
                lineHeight: "1.6",
                maxHeight: "180px",
                overflowY: "auto",
                whiteSpace: "pre-line",
              }}
            >
              {product.description || "No description provided by merchant."}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="admin-modal-actions" style={{ justifyContent: "space-between" }}>
          <div>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                onClose();
                onReject(product);
              }}
            >
              Reject Product
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ backgroundColor: "var(--color-success)", borderColor: "var(--color-success)" }}
              onClick={() => {
                onClose();
                onApprove(product);
              }}
            >
              Approve Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
