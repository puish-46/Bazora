export default function AdminSellerDetailsModal({ seller, onClose, onApprove, onReject }) {
  if (!seller) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">🏪</span>
            <h3>Merchant Application Profile</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close seller details modal"
          >
            ✕
          </button>
        </div>

        <div className="admin-modal-body">
          <div className="user-profile-header-card">
            <div className="user-avatar-placeholder" style={{ backgroundColor: "var(--role-seller-bg)", color: "var(--role-seller)", borderColor: "rgba(217, 119, 6, 0.3)" }}>
              🏪
            </div>
            <div className="user-profile-summary">
              <h4>{seller.businessName}</h4>
              <p className="user-summary-email">{seller.businessEmail}</p>
              <div className="user-summary-pills">
                <span className="status-pill pending">Pending Administrator Review</span>
              </div>
            </div>
          </div>

          <div className="user-details-grid">
            <div className="user-detail-item">
              <span className="user-detail-label">Application ID</span>
              <span className="user-detail-val mono-id">{seller._id}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Business Name</span>
              <span className="user-detail-val">{seller.businessName}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Business Email</span>
              <span className="user-detail-val">{seller.businessEmail}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Contact Phone</span>
              <span className="user-detail-val">{seller.phone || "Not provided"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Applicant User Name</span>
              <span className="user-detail-val">{seller.userId?.name || "Registered User"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Applicant User Email</span>
              <span className="user-detail-val">{seller.userId?.email || "N/A"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">User Account ID</span>
              <span className="user-detail-val mono-id">{seller.userId?._id || "N/A"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Submission Date</span>
              <span className="user-detail-val">
                {seller.createdAt ? new Date(seller.createdAt).toLocaleString() : "N/A"}
              </span>
            </div>
          </div>
        </div>

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
                onReject(seller);
              }}
            >
              Reject Application
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ backgroundColor: "var(--color-success)", borderColor: "var(--color-success)" }}
              onClick={() => {
                onClose();
                onApprove(seller);
              }}
            >
              Approve Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
