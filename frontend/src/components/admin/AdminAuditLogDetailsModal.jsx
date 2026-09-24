export default function AdminAuditLogDetailsModal({ log, onClose }) {
  if (!log) return null;

  // Derive action styling class
  const getActionClass = (action) => {
    if (!action) return "action-neutral";
    const act = action.toUpperCase();
    if (act.includes("APPROVED") || act.includes("CREATED") || act.includes("ACTIVATED")) {
      return "action-positive";
    }
    if (act.includes("REJECTED") || act.includes("DELETED") || act.includes("DEACTIVATED")) {
      return "action-negative";
    }
    return "action-neutral";
  };

  // Safe formatting of details payload to prevent any potential sensitive field leakage
  const sanitizeDetails = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    try {
      const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };
      for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("jwt")
        ) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
          sanitized[key] = sanitizeDetails(sanitized[key]);
        }
      }
      return sanitized;
    } catch {
      return obj;
    }
  };

  const safeDetails = sanitizeDetails(log.details);
  const hasDetails = safeDetails && typeof safeDetails === "object" && Object.keys(safeDetails).length > 0;

  // Actor details
  const actorName = log.userId?.name || "System Administrator";
  const actorEmail = log.userId?.email || "N/A";
  const actorRole = log.userId?.role || "admin";
  const actorId = typeof log.userId === "object" ? log.userId?._id : log.userId || "N/A";

  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
        {/* Modal Header */}
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">📋</span>
            <div>
              <h3 id="audit-modal-title">Audit Record Details</h3>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close audit log modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="admin-modal-body">
          {/* Top Event Summary Header */}
          <div className="user-profile-header-card" style={{ marginBottom: "1.25rem" }}>
            <div className="user-avatar-placeholder" style={{ backgroundColor: "var(--bg-page)", color: "var(--text-main)" }}>
              📋
            </div>
            <div className="user-profile-summary" style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                <span className={`audit-action-badge ${getActionClass(log.action)}`}>
                  {log.action}
                </span>
                <span className="audit-resource-badge">
                  {log.resourceType}
                </span>
              </div>
              <p className="user-summary-email" style={{ margin: 0 }}>
                Logged on {new Date(log.createdAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "medium"
                })}
              </p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="user-details-grid" style={{ marginBottom: "1.25rem" }}>
            <div className="user-detail-item">
              <span className="user-detail-label">Audit Log ID</span>
              <span className="user-detail-val mono-id">{log._id}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Target Resource Type</span>
              <span className="user-detail-val">{log.resourceType || "N/A"}</span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">Target Resource ID</span>
              <span className="user-detail-val mono-id">
                {log.resourceId ? String(log.resourceId) : "None (Global / System)"}
              </span>
            </div>

            <div className="user-detail-item">
              <span className="user-detail-label">UTC Timestamp</span>
              <span className="user-detail-val" style={{ fontSize: "0.82rem" }}>
                {new Date(log.createdAt).toISOString()}
              </span>
            </div>
          </div>

          {/* Actor Card */}
          <div
            style={{
              backgroundColor: "var(--bg-page)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
              <span className="user-detail-label">Actor / Initiating User</span>
              <span className={`role-pill role-${actorRole}`}>{actorRole}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.95rem" }}>
                {actorName}
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Email: {actorEmail}
              </span>
              <span className="mono-id" style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                User ID: {actorId}
              </span>
            </div>
          </div>

          {/* Details / Payload Card */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span className="user-detail-label">Event Details & Metadata Payload</span>
              {hasDetails && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {Object.keys(safeDetails).length} attribute{Object.keys(safeDetails).length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {hasDetails ? (
              <pre className="audit-json-box">
                {JSON.stringify(safeDetails, null, 2)}
              </pre>
            ) : (
              <div
                style={{
                  padding: "1rem",
                  textAlign: "center",
                  backgroundColor: "var(--bg-page)",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-muted)",
                  fontSize: "0.88rem",
                }}
              >
                No supplementary metadata payload was attached to this event.
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions (Strictly Read-Only) */}
        <div className="admin-modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
