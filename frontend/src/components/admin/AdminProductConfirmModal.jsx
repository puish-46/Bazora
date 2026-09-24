import { useState } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function AdminProductConfirmModal({ product, actionType, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isApprove = actionType === "approve";

  const handleConfirmAction = async () => {
    if (processing) return;

    // Validate rejection reason if rejecting
    if (!isApprove && rejectionReason.trim().length > 1000) {
      setError("Rejection reason cannot exceed 1000 characters.");
      return;
    }

    setProcessing(true);
    setError(null);

    const endpoint = isApprove
      ? `/admin/products/${product._id}/approve`
      : `/admin/products/${product._id}/reject`;

    const payload = !isApprove && rejectionReason.trim()
      ? { reason: rejectionReason.trim() }
      : undefined;

    try {
      const res = await api.patch(endpoint, payload);

      if (res && res.success) {
        onSuccess(
          isApprove
            ? `Product "${product.name}" was successfully approved and is now active.`
            : `Product "${product.name}" was rejected and removed from moderation queue.`,
          product._id
        );
        onClose();
      } else {
        throw new Error(res?.message || `Failed to ${isApprove ? "approve" : "reject"} product`);
      }
    } catch (err) {
      console.error(`Product ${actionType} error:`, err);
      setError(
        formatApiError(err, `Failed to ${isApprove ? "approve" : "reject"} product. Please try again.`)
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      onClick={!processing ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-confirm-modal-title"
    >
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">{isApprove ? "🟢" : "⚠️"}</span>
            <h3 id="product-confirm-modal-title">
              {isApprove ? "Approve Product Listing" : "Reject Product Listing"}
            </h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={processing}
            aria-label="Close confirmation dialog"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {error && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Product Summary */}
          <div className="modal-target-summary">
            <div className="target-user-info">
              <strong>{product.name}</strong>
              <span className="target-email">
                Merchant: {product.sellerId?.businessName || "Unknown Seller"} • Store:{" "}
                {product.storeId?.storeName || "Direct"}
              </span>
              <span className="subtext-label mono-id" style={{ marginTop: "0.2rem" }}>
                ID: {product._id}
              </span>
            </div>
            <div className="target-current-role">
              <span className="subtext-label">Status:</span>
              <span className="status-pill pending">Pending Review</span>
            </div>
          </div>

          {/* Consequence explanation */}
          <div className="status-action-explanation" style={{ margin: "1.25rem 0" }}>
            {isApprove ? (
              <p style={{ color: "var(--text-main)", fontSize: "0.95rem", lineHeight: "1.55" }}>
                <strong>Marketplace Approval:</strong> Approving this product listing will transition its status to <strong>Approved</strong>. The product will immediately become publicly visible in the Bazora customer catalog and eligible for orders. An approval notification will be dispatched to the merchant.
              </p>
            ) : (
              <div>
                <p style={{ color: "var(--color-danger)", fontSize: "0.95rem", lineHeight: "1.55", marginBottom: "1rem" }}>
                  <strong>Listing Rejection:</strong> Rejecting this product listing will mark it as <strong>Rejected</strong> and remove it from the pending moderation queue. The merchant will receive a notification with the rejection details.
                </p>

                {/* Rejection Reason Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label
                    htmlFor="rejection-reason-input"
                    style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-main)" }}
                  >
                    Rejection Reason (Optional, max 1000 characters):
                  </label>
                  <textarea
                    id="rejection-reason-input"
                    className="admin-search-input"
                    style={{
                      height: "90px",
                      padding: "0.65rem 0.85rem",
                      resize: "vertical",
                      fontSize: "0.9rem",
                      lineHeight: "1.45",
                    }}
                    placeholder="Provide constructive feedback to the merchant explaining why the listing was rejected (e.g. image clarity, policy violation, missing details)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    maxLength={1000}
                    disabled={processing}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: rejectionReason.length > 900 ? "var(--color-danger)" : "var(--text-muted)",
                      }}
                    >
                      {rejectionReason.length} / 1000 characters
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="admin-modal-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className={isApprove ? "btn-primary" : "btn-danger"}
            style={isApprove ? { backgroundColor: "var(--color-success)", borderColor: "var(--color-success)" } : undefined}
            onClick={handleConfirmAction}
            disabled={processing}
          >
            {processing
              ? isApprove
                ? "Approving..."
                : "Rejecting..."
              : isApprove
              ? "Confirm & Approve Product"
              : "Confirm & Reject Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
