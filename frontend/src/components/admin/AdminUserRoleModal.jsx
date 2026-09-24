import { useState } from "react";
import { api, formatApiError } from "../../services/api.js";

const ALLOWED_ROLES = [
  { value: "customer", label: "Customer — Shopper with browse, cart, and order capabilities" },
  { value: "seller", label: "Seller — Merchant with storefront, product, and inventory access" },
  { value: "support", label: "Support — Agent with inquiry and customer ticket oversight" },
  { value: "delivery", label: "Delivery — Logistics partner with transit dispatch access" },
  { value: "admin", label: "Admin — Administrator with master system privileges" },
];

export default function AdminUserRoleModal({ user, currentAdminId, onClose, onUserUpdated }) {
  const [selectedRole, setSelectedRole] = useState(user?.role || "customer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isSelf = Boolean(
    currentAdminId && (currentAdminId === user?._id || currentAdminId === user?.id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (isSelf) {
      setError("Administrator self-protection: You cannot alter your own administrative role.");
      return;
    }

    if (selectedRole === user?.role) {
      setError("Selected role is identical to current role. Please select a different role.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await api.patch(`/admin/users/${user._id}/role`, {
        role: selectedRole,
      });

      if (res && res.user) {
        onUserUpdated(res.user);
        onClose();
      } else {
        throw new Error(res?.message || "Failed to update user role");
      }
    } catch (err) {
      console.error("Role update failed:", err);
      setError(formatApiError(err, "Failed to update user role."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" onClick={!saving ? onClose : undefined} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">🛡️</span>
            <h3>Assign Account Role</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={saving}
            aria-label="Close role assignment modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
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
                <span className="subtext-label">Current Role:</span>
                <span className={`role-pill role-${user?.role || "customer"}`}>{user?.role}</span>
              </div>
            </div>

            {isSelf && (
              <div className="alert alert-warning" role="alert" style={{ margin: "1rem 0" }}>
                <span className="alert-icon">🔒</span>
                <div>
                  <strong>Self-Modification Prohibited:</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>
                    Security controls prevent administrators from modifying their own access permissions.
                  </p>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label htmlFor="select-user-role">
                <strong>Select New Role</strong>
              </label>
              <select
                id="select-user-role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                disabled={saving || isSelf}
                className="admin-select"
                required
              >
                {ALLOWED_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <small className="form-hint" style={{ display: "block", marginTop: "0.5rem" }}>
                Changing this user&apos;s role will instantly alter their authorization boundaries and trigger an account notification.
              </small>
            </div>
          </div>

          <div className="admin-modal-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || isSelf || selectedRole === user?.role}
            >
              {saving ? "Updating Role..." : "Confirm Role Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
