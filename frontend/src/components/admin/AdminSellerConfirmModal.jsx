import { useState } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function AdminSellerConfirmModal({ seller, actionType, onClose, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const isApprove = actionType === "approve";

  const handleConfirmAction = async () => {
    if (processing) return;
    setProcessing(true);
    setError(null);

    const endpoint = isApprove
      ? `/admin/sellers/${seller._id}/approve`
      : `/admin/sellers/${seller._id}/reject`;

    try {
      const res = await api.patch(endpoint);

      if (res && res.success) {
        onSuccess(
          isApprove
            ? `Merchant application for "${seller.businessName}" was successfully approved.`
            : `Merchant application for "${seller.businessName}" has been rejected.`,
          seller._id
        );
        onClose();
      } else {
        throw new Error(res?.message || `Failed to ${isApprove ? "approve" : "reject"} application`);
      }
    } catch (err) {
      console.error(`Seller ${actionType} error:`, err);
      setError(
        formatApiError(err, `Failed to ${isApprove ? "approve" : "reject"} seller application.`)
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={!processing ? onClose : undefined} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">{isApprove ? "🟢" : "⚠️"}</span>
            <h3>{isApprove ? "Approve Merchant Application" : "Reject Merchant Application"}</h3>
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

        <div className="admin-modal-body">
          {error && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="modal-target-summary">
            <div className="target-user-info">
              <strong>{seller.businessName}</strong>
              <span className="target-email">
                Contact: {seller.businessEmail} • Applicant: {seller.userId?.name || "User"}
              </span>
            </div>
            <div className="target-current-role">
              <span className="subtext-label">Status:</span>
              <span className="status-pill pending">Pending Review</span>
            </div>
          </div>

          <div className="status-action-explanation" style={{ margin: "1.25rem 0" }}>
            {isApprove ? (
              <p style={{ color: "var(--text-main)", fontSize: "0.95rem", lineHeight: "1.55" }}>
                <strong>Authorization Upgrade:</strong> Approving this application will elevate the applicant&apos;s account role to <strong>Seller</strong>. They will be granted permissions to configure a merchant storefront, list products, and manage order fulfillment. An automated in-app notification will be dispatched to the applicant.
              </p>
            ) : (
              <p style={{ color: "var(--color-danger)", fontSize: "0.95rem", lineHeight: "1.55" }}>
                <strong>Application Rejection:</strong> Rejecting this application will mark the vendor onboarding request as <strong>Rejected</strong>. The applicant will remain in customer standing without access to merchant tools. An automated rejection notification will be sent to the applicant.
              </p>
            )}
          </div>
        </div>

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
              ? "Confirm & Approve Seller"
              : "Confirm & Reject Application"}
          </button>
        </div>
      </div>
    </div>
  );
}
