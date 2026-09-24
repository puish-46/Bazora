import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";
import AdminAuditLogDetailsModal from "./AdminAuditLogDetailsModal.jsx";

const KNOWN_ACTIONS = [
  { value: "", label: "All Actions" },
  { value: "SELLER_APPROVED", label: "SELLER_APPROVED" },
  { value: "SELLER_REJECTED", label: "SELLER_REJECTED" },
  { value: "PRODUCT_APPROVED", label: "PRODUCT_APPROVED" },
  { value: "PRODUCT_REJECTED", label: "PRODUCT_REJECTED" },
  { value: "USER_ROLE_CHANGED", label: "USER_ROLE_CHANGED" },
  { value: "USER_STATUS_CHANGED", label: "USER_STATUS_CHANGED" },
  { value: "COUPON_CREATED", label: "COUPON_CREATED" },
  { value: "COUPON_UPDATED", label: "COUPON_UPDATED" },
  { value: "COUPON_STATUS_CHANGED", label: "COUPON_STATUS_CHANGED" },
  { value: "COUPON_DELETED", label: "COUPON_DELETED" },
];

const KNOWN_RESOURCES = [
  { value: "", label: "All Resource Types" },
  { value: "Product", label: "Product" },
  { value: "Seller", label: "Seller" },
  { value: "User", label: "User" },
  { value: "Coupon", label: "Coupon" },
];

export default function AdminAuditLogs() {
  const { navigate } = useNavigation();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 20,
    totalLogs: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateError, setDateError] = useState(null);

  // Server Filter Inputs
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedResource, setSelectedResource] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Applied Server Filters (used for fetch)
  const [appliedFilters, setAppliedFilters] = useState({
    action: "",
    resourceType: "",
    startDate: "",
    endDate: "",
  });

  // Client-side quick filter
  const [searchQuery, setSearchQuery] = useState("");

  // Details Modal
  const [selectedLogForDetails, setSelectedLogForDetails] = useState(null);

  const fetchAuditLogs = useCallback(
    async (pageToLoad = 1, filters = appliedFilters) => {
      setError(null);
      setDateError(null);

      // Validate date constraints if provided
      if (filters.startDate && filters.endDate && new Date(filters.startDate) > new Date(filters.endDate)) {
        setDateError("Start date cannot be after end date.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        queryParams.append("page", String(pageToLoad));
        queryParams.append("limit", "20");

        if (filters.action && filters.action.trim() !== "") {
          queryParams.append("action", filters.action.trim());
        }

        if (filters.resourceType && filters.resourceType.trim() !== "") {
          queryParams.append("resourceType", filters.resourceType.trim());
        }

        if (filters.startDate && filters.startDate.trim() !== "") {
          queryParams.append("startDate", filters.startDate.trim());
        }

        if (filters.endDate && filters.endDate.trim() !== "") {
          queryParams.append("endDate", filters.endDate.trim());
        }

        const endpoint = `/admin/audit-logs?${queryParams.toString()}`;
        const res = await api.get(endpoint);

        if (res && Array.isArray(res.logs)) {
          setLogs(res.logs);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        setError(formatApiError(err, "Failed to retrieve audit logs from server."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [appliedFilters]
  );

  useEffect(() => {
    fetchAuditLogs(1, appliedFilters);
  }, [fetchAuditLogs, appliedFilters]);

  // Handle Server Filters Form Submission
  const handleApplyFilters = (e) => {
    e.preventDefault();
    if (loading || refreshing) return;

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setDateError("Start date cannot be after end date.");
      return;
    }

    setDateError(null);
    setLoading(true);
    const newFilters = {
      action: selectedAction,
      resourceType: selectedResource,
      startDate,
      endDate,
    };
    setAppliedFilters(newFilters);
    fetchAuditLogs(1, newFilters);
  };

  // Reset Server and Client Filters
  const handleResetFilters = () => {
    setSelectedAction("");
    setSelectedResource("");
    setStartDate("");
    setEndDate("");
    setDateError(null);
    setSearchQuery("");
    const cleared = { action: "", resourceType: "", startDate: "", endDate: "" };
    setAppliedFilters(cleared);
    setLoading(true);
    fetchAuditLogs(1, cleared);
  };

  // Refresh current page with current filters
  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    await fetchAuditLogs(pagination.currentPage, appliedFilters);
  };

  // Page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages || loading || refreshing) return;
    setLoading(true);
    fetchAuditLogs(newPage, appliedFilters);
  };

  // Client-side search across loaded logs
  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const actorName = log.userId?.name || "";
    const actorEmail = log.userId?.email || "";
    const action = log.action || "";
    const resourceType = log.resourceType || "";
    const resourceId = log.resourceId ? String(log.resourceId) : "";
    const logId = log._id ? String(log._id) : "";

    return (
      actorName.toLowerCase().includes(q) ||
      actorEmail.toLowerCase().includes(q) ||
      action.toLowerCase().includes(q) ||
      resourceType.toLowerCase().includes(q) ||
      resourceId.toLowerCase().includes(q) ||
      logId.toLowerCase().includes(q)
    );
  });

  const hasActiveServerFilters = Boolean(
    appliedFilters.action ||
    appliedFilters.resourceType ||
    appliedFilters.startDate ||
    appliedFilters.endDate
  );

  // Badge helpers
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

  const getResourceIcon = (type) => {
    switch (type) {
      case "Product":
        return "📦";
      case "Seller":
        return "🏪";
      case "User":
        return "👥";
      case "Coupon":
        return "🎟️";
      default:
        return "📄";
    }
  };

  const formatDetailsPreview = (details) => {
    if (!details || typeof details !== "object" || Object.keys(details).length === 0) {
      return "—";
    }
    if (details.reason) {
      return `Reason: "${details.reason}"`;
    }
    if (details.title) {
      return `Item: ${details.title}`;
    }
    if (details.businessName) {
      return `Vendor: ${details.businessName}`;
    }
    if (details.code) {
      return `Code: ${details.code}`;
    }
    if (details.newRole) {
      return `Role: ${details.previousRole || "—"} → ${details.newRole}`;
    }
    if (details.newStatus !== undefined) {
      return `Status: ${details.previousStatus ? "Active" : "Deactivated"} → ${details.newStatus ? "Active" : "Deactivated"}`;
    }
    const keys = Object.keys(details);
    return `${keys.join(", ")}`;
  };

  return (
    <div className="admin-audit-logs-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-text">
          <h2>Administrative Audit Trail</h2>
          <p className="admin-subtitle">
            Immutable, read-only system event logs recording administrative approvals, moderation, and account governance.
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
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh audit log dataset"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Logs"}
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="admin-metrics-grid">
        <div className="admin-metric-card">
          <div className="metric-header">
            <span className="metric-title">Total System Logs</span>
            <span className="metric-icon">📋</span>
          </div>
          <div className="metric-body">
            <div className="metric-value">
              {loading && !logs.length ? "..." : pagination.totalLogs}
            </div>
            <div className="metric-subtext">Total recorded audit events in database</div>
          </div>
        </div>

        <div className="admin-metric-card">
          <div className="metric-header">
            <span className="metric-title">Current Page Records</span>
            <span className="metric-icon">📄</span>
          </div>
          <div className="metric-body">
            <div className="metric-value">
              {loading && !logs.length ? "..." : logs.length}
            </div>
            <div className="metric-subtext">
              Showing page {pagination.currentPage} of {pagination.totalPages}
            </div>
          </div>
        </div>

        <div className="admin-metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Server Filters</span>
            <span className="metric-icon">🔍</span>
          </div>
          <div className="metric-body">
            <div className="metric-value" style={{ fontSize: "1.2rem" }}>
              {hasActiveServerFilters ? "Filtered View" : "All Records"}
            </div>
            <div className="metric-subtext">
              {hasActiveServerFilters
                ? "Restricted by action, resource, or date"
                : "Displaying complete platform logstream"}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Audit Log Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn-sm btn-ghost"
            onClick={() => fetchAuditLogs(pagination.currentPage, appliedFilters)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Date Validation Alert */}
      {dateError && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{dateError}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="admin-controls-card">
        {/* Top Filter Controls: Action, Resource, Date Range */}
        <form onSubmit={handleApplyFilters} className="admin-filters-row" style={{ borderTop: "none", paddingTop: 0 }}>
          <div className="filter-item">
            <label htmlFor="filter-action">Action:</label>
            <select
              id="filter-action"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              disabled={loading || refreshing}
              className="admin-select-sm"
            >
              {KNOWN_ACTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="filter-resource">Resource:</label>
            <select
              id="filter-resource"
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              disabled={loading || refreshing}
              className="admin-select-sm"
            >
              {KNOWN_RESOURCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="filter-start-date">From:</label>
            <input
              type="date"
              id="filter-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading || refreshing}
              className="admin-select-sm"
              style={{ minWidth: "135px" }}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="filter-end-date">To:</label>
            <input
              type="date"
              id="filter-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading || refreshing}
              className="admin-select-sm"
              style={{ minWidth: "135px" }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-sm"
            disabled={loading || refreshing}
          >
            Apply Filters
          </button>

          {(hasActiveServerFilters || selectedAction || selectedResource || startDate || endDate) && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={handleResetFilters}
              disabled={loading || refreshing}
            >
              Reset Filters
            </button>
          )}
        </form>

        {/* Client-side Search Across Loaded Records */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
          <div className="admin-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="admin-search-input"
              placeholder="Quick search loaded logs (actor, action, resource, IDs)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading && !logs.length}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Matching <strong>{filteredLogs.length}</strong> of {logs.length} on this page
            </span>
          )}
        </div>
      </div>

      {/* Main Table or Loading/Empty State */}
      <div className="admin-table-card">
        {loading && !refreshing && logs.length === 0 ? (
          <div className="admin-loading-state">
            <div className="auth-spinner large"></div>
            <p>Loading administrative audit stream from server...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">📋</span>
            {hasActiveServerFilters ? (
              <>
                <h3>No Audit Logs Match Your Filters</h3>
                <p>
                  No system activity matches the specified action, resource, or date criteria. Try adjusting your filter parameters.
                </p>
                <button type="button" className="btn-secondary" onClick={handleResetFilters}>
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <h3>No Audit Activity Found</h3>
                <p>
                  No administrative events have been recorded yet. Activity will appear here automatically as admins manage sellers, products, coupons, and user roles.
                </p>
              </>
            )}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">🔍</span>
            <h3>No Records Match Your Search</h3>
            <p>
              No audit logs on this page match "{searchQuery}". Try a different keyword or clear the search.
            </p>
            <button type="button" className="btn-secondary" onClick={() => setSearchQuery("")}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / Admin</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Details Preview</th>
                  <th style={{ textAlign: "right" }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const actorName = log.userId?.name || "System";
                  const actorEmail = log.userId?.email || "";
                  const actorRole = log.userId?.role || "admin";

                  return (
                    <tr key={log._id}>
                      {/* Timestamp */}
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.88rem" }}>
                          {new Date(log.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                        <div className="table-subtext" style={{ fontSize: "0.78rem" }}>
                          {new Date(log.createdAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </div>
                      </td>

                      {/* Actor */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <strong>{actorName}</strong>
                          <span className={`role-pill role-${actorRole}`} style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
                            {actorRole}
                          </span>
                        </div>
                        {actorEmail && (
                          <div className="table-subtext user-email-text">{actorEmail}</div>
                        )}
                      </td>

                      {/* Action */}
                      <td>
                        <span className={`audit-action-badge ${getActionClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Target Resource */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span className="audit-resource-badge">
                            {getResourceIcon(log.resourceType)} {log.resourceType}
                          </span>
                        </div>
                        {log.resourceId && (
                          <div className="table-subtext mono-id" title={String(log.resourceId)}>
                            {String(log.resourceId).slice(0, 8)}...{String(log.resourceId).slice(-6)}
                          </div>
                        )}
                      </td>

                      {/* Details Preview */}
                      <td style={{ maxWidth: "260px" }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap"
                          }}
                          title={JSON.stringify(log.details || {})}
                        >
                          {formatDetailsPreview(log.details)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn-action-sm btn-action-view"
                          onClick={() => setSelectedLogForDetails(log)}
                          title="View complete audit record and raw payload"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="pagination-wrapper" style={{ padding: "1.25rem 1.5rem" }}>
            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPreviousPage || loading || refreshing}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page <strong>{pagination.currentPage}</strong> of{" "}
              <strong>{pagination.totalPages}</strong> ({pagination.totalLogs} total logs)
            </span>

            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage || loading || refreshing}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLogForDetails && (
        <AdminAuditLogDetailsModal
          log={selectedLogForDetails}
          onClose={() => setSelectedLogForDetails(null)}
        />
      )}
    </div>
  );
}
