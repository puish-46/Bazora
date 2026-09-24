import { useState } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function AdminUserStatusModal({ user, currentAdminId, onClose, onUserUpdated }) {
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState(null);

  const isSelf = Boolean(
    currentAdminId && (currentAdminId === user?._id || currentAdminId === user?.id)
  );

  const isCurrentlyActive = Boolean(user?.isActive);
  const targetActionName = isCurrentlyActive ? "Deactivate" : "Activate";

  const handleToggleStatus = async () => {
    if (toggling) return;

    if (isSelf && isCurrentlyActive) {
      setError("Administrator self-protection: You cannot deactivate your own account.");
      return;
    }

    setToggling(true);
    setError(null);

    try {
      const res = await api.patch(`/admin/users/${user._id}/toggle-status`);

      if (res && res.user) {
        onUserUpdated(res.user);
        onClose();
      } else {
        throw new Error(res?.message || `Failed to ${targetActionName.toLowerCase()} user account`);
      }
    } catch (err) {
      console.error("Status toggle failed:", err);
      setError(formatApiError(err, `Failed to ${targetActionName.toLowerCase()} account.`));
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={!toggling ? onClose : undefined} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">
              {isCurrentlyActive ? "⚠️" : "🟢"}
            </span>
            <h3>{isCurrentlyActive ? "Deactivate User Account" : "Activate User Account"}</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={toggling}
            aria-label="Close status confirmation modal"
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
              <strong>{user?.name}</strong>
              <span className="target-email">{user?.email}</span>
            </div>
            <div className="target-current-role">
              <span className="subtext-label">Current Status:</span>
              <span className={`status-pill ${isCurrentlyActive ? "confirmed" : "cancelled"}`}>
                {isCurrentlyActive ? "Active" : "Deactivated"}
              </span>
            </div>
          </div>

          {isSelf && isCurrentlyActive && (
            <div className="alert alert-warning" role="alert" style={{ margin: "1rem 0" }}>
              <span className="alert-icon">🔒</span>
              <div>
                <strong>Self-Deactivation Prohibited:</strong>
                <p style={{ margin: "0.25rem 0 0" }}>
                  To preserve platform administrative stability, an administrator cannot deactivate their own active account.
                </p>
              </div>
            </div>
          )}

          <div className="status-action-explanation" style={{ margin: "1rem 0" }}>
            {isCurrentlyActive ? (
              <p style={{ color: "var(--color-danger)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                <strong>Warning:</strong> Deactivating this user will immediately invalidate their active authentication session. The user will be blocked from logging into Bazora until reactivated.
              </p>
            ) : (
              <p style={{ color: "var(--color-success)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                <strong>Restoration:</strong> Activating this user will restore their account standing. They will be permitted to authenticate and resume operations corresponding to their role.
              </p>
            )}
          </div>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={toggling}
          >
            Cancel
          </button>
          <button
            type="button"
            className={isCurrentlyActive ? "btn-danger" : "btn-primary"}
            onClick={handleToggleStatus}
            disabled={toggling || (isSelf && isCurrentlyActive)}
          >
            {toggling
              ? "Updating..."
              : isCurrentlyActive
              ? "Deactivate Account"
              : "Reactivate Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
