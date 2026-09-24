import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigation } from "../../context/NavigationContext.jsx";
import AdminUserDetailsModal from "./AdminUserDetailsModal.jsx";
import AdminUserRoleModal from "./AdminUserRoleModal.jsx";
import AdminUserStatusModal from "./AdminUserStatusModal.jsx";

const ROLES_LIST = [
  { value: "", label: "All Roles" },
  { value: "customer", label: "Customer" },
  { value: "seller", label: "Seller" },
  { value: "support", label: "Support" },
  { value: "delivery", label: "Delivery" },
  { value: "admin", label: "Admin" },
];

const STATUS_LIST = [
  { value: "", label: "All Statuses" },
  { value: "true", label: "Active Accounts" },
  { value: "false", label: "Deactivated" },
];

export default function AdminUsers() {
  const { navigate } = useNavigation();
  const { user: currentAdmin } = useAuth();
  const currentAdminId = currentAdmin?.id || currentAdmin?._id;

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalUsers: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filters
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Active Modals
  const [detailsUserId, setDetailsUserId] = useState(null);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [statusModalUser, setStatusModalUser] = useState(null);

  const fetchUsers = useCallback(
    async (pageToLoad = 1, searchParam = appliedSearch, roleParam = roleFilter, statusParam = statusFilter) => {
      setError(null);
      setLoading(true);

      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", String(pageToLoad));
        queryParams.append("limit", "10");

        if (searchParam && searchParam.trim() !== "") {
          queryParams.append("search", searchParam.trim());
        }

        if (roleParam && roleParam !== "") {
          queryParams.append("role", roleParam);
        }

        if (statusParam && statusParam !== "") {
          queryParams.append("isActive", statusParam);
        }

        const endpoint = `/admin/users?${queryParams.toString()}`;
        const res = await api.get(endpoint);

        if (res && Array.isArray(res.users)) {
          setUsers(res.users);
          if (res.pagination) {
            setPagination(res.pagination);
            setCurrentPage(res.pagination.currentPage);
          }
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
        setError(formatApiError(err, "Failed to retrieve user accounts from server."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedSearch, roleFilter, statusFilter]
  );

  useEffect(() => {
    fetchUsers(currentPage, appliedSearch, roleFilter, statusFilter);
  }, [fetchUsers, currentPage, appliedSearch, roleFilter, statusFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    setAppliedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  // Handle Search Clear
  const handleClearSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setCurrentPage(1);
  };

  // Handle Filter Change
  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Reset all filters and search
  const handleResetAll = () => {
    setSearchInput("");
    setAppliedSearch("");
    setRoleFilter("");
    setStatusFilter("");
    setCurrentPage(1);
  };

  // Pagination page change
  const handlePageChange = (newPage) => {
    if (loading || newPage < 1 || newPage > pagination.totalPages) return;
    setCurrentPage(newPage);
  };

  // Refresh handler
  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    setSuccessMsg(null);
    await fetchUsers(currentPage, appliedSearch, roleFilter, statusFilter);
  };

  // Callback after mutation in modal
  const handleUserUpdated = (updatedUser) => {
    if (!updatedUser) return;

    setUsers((prevUsers) =>
      prevUsers.map((u) => (u._id === updatedUser._id ? { ...u, ...updatedUser } : u))
    );

    setSuccessMsg(`Account for "${updatedUser.name}" was successfully updated.`);
  };

  const hasActiveFilters = Boolean(appliedSearch || roleFilter || statusFilter !== "");

  return (
    <div className="admin-users-container">
      {/* Header and Controls */}
      <div className="admin-page-header">
        <div className="admin-page-header-text">
          <h2>User Accounts & Access Governance</h2>
          <p className="subpage-subtitle">
            Search registered users, assign system roles, and govern account authentication access.
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
            title="Reload user list"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Users"}
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="alert alert-success" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">✓</span>
          <div style={{ flex: 1 }}>{successMsg}</div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={() => setSuccessMsg(null)}
            style={{ color: "var(--color-success)", background: "transparent", border: "none" }}
          >
            ✕
          </button>
        </div>
      )}

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

      {/* Filter and Search Bar */}
      <div className="admin-controls-card">
        <form onSubmit={handleSearchSubmit} className="admin-search-form">
          <div className="admin-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search users by name or email address..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading}
              className="admin-search-input"
            />
            {searchInput && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                title="Clear search text"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            Search
          </button>
        </form>

        <div className="admin-filters-row">
          <div className="filter-item">
            <label htmlFor="filter-role">Role:</label>
            <select
              id="filter-role"
              value={roleFilter}
              onChange={handleRoleChange}
              disabled={loading}
              className="admin-select-sm"
            >
              {ROLES_LIST.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="filter-status">Status:</label>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={handleStatusChange}
              disabled={loading}
              className="admin-select-sm"
            >
              {STATUS_LIST.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={handleResetAll}
              disabled={loading}
            >
              Reset Filters
            </button>
          )}

          <div className="user-count-indicator">
            <span>
              Total: <strong>{loading && !users.length ? "..." : pagination.totalUsers}</strong> accounts
            </span>
          </div>
        </div>
      </div>

      {/* Main Table or Loading/Empty State */}
      <div className="admin-table-card">
        {loading && !refreshing && users.length === 0 ? (
          <div className="admin-loading-state">
            <div className="auth-spinner large"></div>
            <p>Loading marketplace user records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">👥</span>
            {hasActiveFilters ? (
              <>
                <h3>No Users Match Your Filters</h3>
                <p>
                  No accounts were found matching your current search or filter criteria. Try broadening your keywords.
                </p>
                <button type="button" className="btn-secondary" onClick={handleResetAll}>
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <h3>No Users Found</h3>
                <p>There are no registered user records in the database.</p>
              </>
            )}
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>User Details</th>
                  <th>Email Address</th>
                  <th>Assigned Role</th>
                  <th>Account Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = Boolean(
                    currentAdminId && (currentAdminId === u._id || currentAdminId === u.id)
                  );

                  return (
                    <tr key={u._id} className={isSelf ? "admin-self-row" : ""}>
                      <td>
                        <div className="table-user-name">
                          <strong>{u.name}</strong>
                          {isSelf && (
                            <span className="self-badge" title="Your currently authenticated account">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="table-subtext mono-id">{u._id}</div>
                      </td>

                      <td>
                        <span className="user-email-text">{u.email}</span>
                      </td>

                      <td>
                        <span className={`role-pill role-${u.role || "customer"}`}>
                          {u.role}
                        </span>
                      </td>

                      <td>
                        <span className={`status-pill ${u.isActive ? "confirmed" : "cancelled"}`}>
                          {u.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      <td>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div className="admin-row-actions">
                          {/* Details Button */}
                          <button
                            type="button"
                            className="btn-action-sm btn-action-view"
                            onClick={() => setDetailsUserId(u._id)}
                            title="View full account profile"
                          >
                            Details
                          </button>

                          {/* Role Change Button */}
                          <button
                            type="button"
                            className="btn-action-sm btn-action-role"
                            onClick={() => setRoleModalUser(u)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? "Self-protection: Cannot modify your own administrative role"
                                : "Assign different system role"
                            }
                          >
                            Role
                          </button>

                          {/* Status Toggle Button */}
                          <button
                            type="button"
                            className={`btn-action-sm ${
                              u.isActive ? "btn-action-deactivate" : "btn-action-activate"
                            }`}
                            onClick={() => setStatusModalUser(u)}
                            disabled={isSelf && u.isActive}
                            title={
                              isSelf && u.isActive
                                ? "Self-protection: Cannot deactivate your own administrative account"
                                : u.isActive
                                ? "Deactivate user account"
                                : "Reactivate user account"
                            }
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-wrapper" style={{ padding: "1.25rem 1.5rem" }}>
            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || loading}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page <strong>{pagination.currentPage}</strong> of{" "}
              <strong>{pagination.totalPages}</strong> ({pagination.totalUsers} total users)
            </span>

            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || loading}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {detailsUserId && (
        <AdminUserDetailsModal
          userId={detailsUserId}
          onClose={() => setDetailsUserId(null)}
        />
      )}

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <AdminUserRoleModal
          user={roleModalUser}
          currentAdminId={currentAdminId}
          onClose={() => setRoleModalUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {/* Status Toggle Confirmation Modal */}
      {statusModalUser && (
        <AdminUserStatusModal
          user={statusModalUser}
          currentAdminId={currentAdminId}
          onClose={() => setStatusModalUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
}
