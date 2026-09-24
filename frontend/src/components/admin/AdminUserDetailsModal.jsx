import { useState, useEffect } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function AdminUserDetailsModal({ userId, onClose }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUserDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/admin/users/${userId}`);
        if (isMounted) {
          if (res && res.user) {
            setUser(res.user);
          } else {
            setError("User record could not be retrieved.");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load user details:", err);
          setError(formatApiError(err, "Unable to load user details from server."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (userId) {
      fetchUserDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return (
    <div className="admin-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div className="modal-title-cluster">
            <span className="modal-title-icon">👤</span>
            <h3>User Account Profile</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close user details modal"
          >
            ✕
          </button>
        </div>

        <div className="admin-modal-body">
          {loading ? (
            <div className="admin-modal-loading">
              <div className="auth-spinner"></div>
              <p>Fetching account metadata from database...</p>
            </div>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          ) : user ? (
            <div className="user-details-content">
              <div className="user-profile-header-card">
                <div className="user-avatar-placeholder">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="user-profile-summary">
                  <h4>{user.name}</h4>
                  <p className="user-summary-email">{user.email}</p>
                  <div className="user-summary-pills">
                    <span className={`role-pill role-${user.role || "customer"}`}>
                      {user.role}
                    </span>
                    <span className={`status-pill ${user.isActive ? "confirmed" : "cancelled"}`}>
                      {user.isActive ? "Active Account" : "Deactivated"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="user-details-grid">
                <div className="user-detail-item">
                  <span className="user-detail-label">System User ID</span>
                  <span className="user-detail-val mono-id">{user._id}</span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Full Name</span>
                  <span className="user-detail-val">{user.name}</span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Email Address</span>
                  <span className="user-detail-val">{user.email}</span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Assigned Role</span>
                  <span className="user-detail-val text-capitalize">{user.role}</span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Account Access Status</span>
                  <span className="user-detail-val">
                    {user.isActive ? "Enabled (Can log in)" : "Disabled (Access blocked)"}
                  </span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Registration Date</span>
                  <span className="user-detail-val">
                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A"}
                  </span>
                </div>

                <div className="user-detail-item">
                  <span className="user-detail-label">Last Record Update</span>
                  <span className="user-detail-val">
                    {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="admin-empty-state">
              <p>No user data available.</p>
            </div>
          )}
        </div>

        <div className="admin-modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
