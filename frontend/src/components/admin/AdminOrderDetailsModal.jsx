export default function AdminOrderDetailsModal({ record, onClose }) {
  if (!record) return null;

  const order = record.orderId || {};
  const seller = record.sellerId || {};

  const orderId = typeof order === "object" ? order._id || record.orderId : record.orderId;
  const customerId = typeof order === "object" ? order.userId : null;
  const totalAmount = typeof order === "object" && order.totalAmount !== undefined
    ? Number(order.totalAmount)
    : Number(record.grossAmount) || 0;
  const orderStatus = typeof order === "object" ? order.orderStatus || "unknown" : "unknown";
  const paymentStatus = typeof order === "object" ? order.paymentStatus || "unknown" : "unknown";

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-details-modal-title"
    >
      <div
        className="admin-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">🛒</span>
            <h3 id="order-details-modal-title">Order Oversight &amp; Audit Profile</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close order details modal"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="admin-modal-body">
          {/* Header Card */}
          <div className="user-profile-header-card">
            <div
              className="user-avatar-placeholder"
              style={{
                backgroundColor: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                borderColor: "rgba(99, 102, 241, 0.25)",
              }}
            >
              🛒
            </div>
            <div className="user-profile-summary">
              <h4>Order #{orderId || "N/A"}</h4>
              <p className="user-summary-email">
                Placed on: {record.createdAt ? new Date(record.createdAt).toLocaleString() : "N/A"}
              </p>
              <div className="user-summary-pills">
                <span className={`status-pill ${orderStatus}`}>
                  Fulfillment: {orderStatus.toUpperCase()}
                </span>
                <span className={`status-pill ${paymentStatus === "paid" ? "confirmed" : paymentStatus === "refunded" ? "cancelled" : "pending"}`}>
                  Payment: {paymentStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="user-details-grid">
            <div className="user-detail-item">
              <span className="user-detail-label">Order System ID</span>
              <span className="user-detail-val mono-id">{orderId || "N/A"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Customer User ID</span>
              <span className="user-detail-val mono-id">{customerId || "N/A"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Order Total</span>
              <span className="user-detail-val" style={{ fontWeight: "800", color: "var(--primary)" }}>
                ${totalAmount.toFixed(2)}
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Payment Status</span>
              <span className="user-detail-val">
                <span
                  className={`status-pill ${paymentStatus === "paid" ? "confirmed" : paymentStatus === "refunded" ? "cancelled" : "pending"}`}
                  style={{ textTransform: "capitalize" }}
                >
                  {paymentStatus}
                </span>
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Fulfillment Status</span>
              <span className="user-detail-val">
                <span className={`status-pill ${orderStatus}`} style={{ textTransform: "capitalize" }}>
                  {orderStatus}
                </span>
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Merchant Store</span>
              <span className="user-detail-val">{seller.businessName || "Unknown Seller"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Merchant Contact</span>
              <span className="user-detail-val">{seller.businessEmail || "No email available"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Merchant Phone</span>
              <span className="user-detail-val">{seller.phone || "Not provided"}</span>
            </div>
          </div>

          {/* Settlement & Payout Financial Breakdown */}
          <div style={{ marginTop: "1.5rem" }}>
            <span className="user-detail-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Settlement &amp; Marketplace Financial Ledger
            </span>
            <div
              style={{
                backgroundColor: "var(--bg-page)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <span className="user-detail-label">Gross Subtotal</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: "700", color: "var(--text-main)" }}>
                  ${(Number(record.grossAmount) || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <span className="user-detail-label">Platform Commission</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: "700", color: "var(--text-muted)" }}>
                  ${(Number(record.commissionAmount) || 0).toFixed(2)} ({record.commissionRate ?? 10}%)
                </p>
              </div>

              <div>
                <span className="user-detail-label">Merchant Net Payout</span>
                <p style={{ margin: "0.2rem 0 0", fontWeight: "800", color: "var(--color-success)" }}>
                  ${(Number(record.netAmount) || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <span className="user-detail-label">Settlement Status</span>
                <p style={{ margin: "0.2rem 0 0" }}>
                  <span className={`status-pill ${record.status === "paid" ? "confirmed" : "pending"}`}>
                    {record.status === "paid" ? "Paid Out" : "Pending Payout"}
                  </span>
                </p>
              </div>

              {record.payoutReference && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span className="user-detail-label">Payout Reference</span>
                  <p className="mono-id" style={{ margin: "0.2rem 0 0", color: "var(--text-main)" }}>
                    {record.payoutReference}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Governance Notice */}
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.85rem 1rem",
              backgroundColor: "rgba(99, 102, 241, 0.05)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              lineHeight: "1.5",
            }}
          >
            <strong>Administrative Governance Note:</strong> Order fulfillment stage progression (Confirmed → Processing → Shipped → Delivered) and item fulfillment are managed directly by merchant vendors and delivery partners under Bazora RBAC.
          </div>
        </div>

        {/* Footer */}
        <div className="admin-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
