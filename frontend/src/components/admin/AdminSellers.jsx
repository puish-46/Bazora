import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";
import AdminSellerDetailsModal from "./AdminSellerDetailsModal.jsx";
import AdminSellerConfirmModal from "./AdminSellerConfirmModal.jsx";

export default function AdminSellers() {
  const { navigate } = useNavigation();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search state (client-side matching against real returned pending queue)
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedSellerForDetails, setSelectedSellerForDetails] = useState(null);
  const [confirmModalData, setConfirmModalData] = useState(null); // { seller, actionType: "approve" | "reject" }

  const fetchPendingSellers = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/admin/sellers/pending");
      if (res && Array.isArray(res.sellers)) {
        setSellers(res.sellers);
      } else {
        setSellers([]);
      }
    } catch (err) {
      console.error("Failed to load pending sellers:", err);
      setError(formatApiError(err, "Failed to retrieve pending seller applications."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingSellers();
  }, [fetchPendingSellers]);

  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    setSuccessMsg(null);
    await fetchPendingSellers();
  };

  const handleActionSuccess = (message, processedSellerId) => {
    setSuccessMsg(message);
    // Instantly remove processed seller from active pending queue
    setSellers((prev) => prev.filter((s) => s._id !== processedSellerId));
    // Gently re-synchronize in background
    fetchPendingSellers();
  };

  // Filter sellers client-side based on search query
  const filteredSellers = sellers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.businessName?.toLowerCase().includes(q) ||
      s.businessEmail?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.userId?.name?.toLowerCase().includes(q) ||
      s.userId?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="admin-sellers-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-text">
          <h2>Merchant Application Moderation</h2>
          <p className="subpage-subtitle">
            Review incoming vendor onboarding requests, verify applicant credentials, and approve or reject merchant status.
          </p>
        </div>

        <div className="admin-page-actions" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/admin")}
            title="Return to Admin Overview Dashboard"
          >
            ← Dashboard
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Reload pending applications"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Applications"}
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

      {/* Search and Queue Metrics Bar */}
      <div className="admin-controls-card">
        <div className="admin-search-form" style={{ maxWidth: "100%" }}>
          <div className="admin-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search pending applications by business name, applicant, email, or phone..."
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
                title="Clear search text"
              >
                ✕
              </button>
            )}
          </div>
          <div className="user-count-indicator">
            <span>
              Queue: <strong>{loading ? "..." : sellers.length}</strong> pending review
            </span>
          </div>
        </div>
      </div>

      {/* Main Queue Table or Empty State */}
      <div className="admin-table-card">
        {loading && !refreshing ? (
          <div className="admin-loading-state">
            <div className="auth-spinner large"></div>
            <p>Fetching pending merchant onboarding applications...</p>
          </div>
        ) : sellers.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">✅</span>
            <h3>No Pending Seller Applications</h3>
            <p>
              All merchant onboarding applications have been reviewed. There are currently no vendor submissions awaiting approval.
            </p>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">🔍</span>
            <h3>No Applications Match Your Search</h3>
            <p>
              No pending vendor applications matched the keyword &quot;<strong>{searchQuery}</strong>&quot;.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Business / Store</th>
                  <th>Applicant Information</th>
                  <th>Submitted Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Moderation Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map((seller) => (
                  <tr key={seller._id}>
                    <td>
                      <div className="table-user-name">
                        <strong>{seller.businessName}</strong>
                      </div>
                      <div className="table-subtext">
                        ✉️ {seller.businessEmail}
                        {seller.phone && <span> • 📞 {seller.phone}</span>}
                      </div>
                      <div className="table-subtext mono-id" style={{ marginTop: "0.2rem" }}>
                        ID: {seller._id}
                      </div>
                    </td>

                    <td>
                      <div>
                        <strong>{seller.userId?.name || "Registered User"}</strong>
                      </div>
                      <div className="table-subtext">
                        {seller.userId?.email || "No account email"}
                      </div>
                    </td>

                    <td>
                      {seller.createdAt
                        ? new Date(seller.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>

                    <td>
                      <span className="status-pill pending">Pending Review</span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div className="admin-row-actions">
                        {/* Details Button */}
                        <button
                          type="button"
                          className="btn-action-sm btn-action-view"
                          onClick={() => setSelectedSellerForDetails(seller)}
                          title="Inspect application details"
                        >
                          Details
                        </button>

                        {/* Approve Button */}
                        <button
                          type="button"
                          className="btn-action-sm btn-action-activate"
                          onClick={() =>
                            setConfirmModalData({ seller, actionType: "approve" })
                          }
                          title="Approve merchant onboarding application"
                        >
                          Approve
                        </button>

                        {/* Reject Button */}
                        <button
                          type="button"
                          className="btn-action-sm btn-action-deactivate"
                          onClick={() =>
                            setConfirmModalData({ seller, actionType: "reject" })
                          }
                          title="Reject merchant onboarding application"
                        >
                          Reject
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

      {/* Seller Details Modal */}
      {selectedSellerForDetails && (
        <AdminSellerDetailsModal
          seller={selectedSellerForDetails}
          onClose={() => setSelectedSellerForDetails(null)}
          onApprove={(seller) =>
            setConfirmModalData({ seller, actionType: "approve" })
          }
          onReject={(seller) =>
            setConfirmModalData({ seller, actionType: "reject" })
          }
        />
      )}

      {/* Approval / Rejection Confirmation Modal */}
      {confirmModalData && (
        <AdminSellerConfirmModal
          seller={confirmModalData.seller}
          actionType={confirmModalData.actionType}
          onClose={() => setConfirmModalData(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </div>
  );
}
