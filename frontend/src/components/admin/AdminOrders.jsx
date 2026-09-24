import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";
import AdminOrderDetailsModal from "./AdminOrderDetailsModal.jsx";

export default function AdminOrders() {
  const { navigate } = useNavigation();
  const [telemetry, setTelemetry] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "pending" | "paid"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination (client-side for returned settlement/order records)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Details Modal
  const [selectedRecordForDetails, setSelectedRecordForDetails] = useState(null);

  const fetchOrdersData = useCallback(async () => {
    setError(null);
    try {
      // Build telemetry query params if dates provided
      const dateParams = [];
      if (startDate) dateParams.push(`startDate=${encodeURIComponent(startDate)}`);
      if (endDate) dateParams.push(`endDate=${encodeURIComponent(endDate)}`);
      const dateQueryStr = dateParams.length > 0 ? `?${dateParams.join("&")}` : "";

      // Build settlements query params
      const settlementQuery = statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";

      const [telemetryRes, settlementsRes] = await Promise.allSettled([
        api.get(`/admin/reports/overview${dateQueryStr}`),
        api.get(`/settlements${settlementQuery}`),
      ]);

      const errors = [];

      // Process telemetry
      if (telemetryRes.status === "fulfilled" && telemetryRes.value?.overview) {
        setTelemetry(telemetryRes.value.overview);
      } else if (telemetryRes.status === "rejected") {
        errors.push(
          formatApiError(telemetryRes.reason, "Failed to load order lifecycle telemetry.")
        );
      }

      // Process settlements/orders
      if (settlementsRes.status === "fulfilled" && Array.isArray(settlementsRes.value?.settlements)) {
        setRecords(settlementsRes.value.settlements);
      } else if (settlementsRes.status === "rejected") {
        errors.push(
          formatApiError(settlementsRes.reason, "Failed to load order fulfillment records.")
        );
      }

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (err) {
      console.error("Failed to load admin orders data:", err);
      setError(formatApiError(err, "An error occurred while loading order oversight data."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, statusFilter]);

  useEffect(() => {
    fetchOrdersData();
  }, [fetchOrdersData]);

  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    await fetchOrdersData();
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Client-side search filtering across returned real records
  const filteredRecords = records.filter((rec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const orderId = typeof rec.orderId === "object" ? rec.orderId?._id : rec.orderId;
    const customerId = typeof rec.orderId === "object" ? rec.orderId?.userId : "";
    const sellerName = rec.sellerId?.businessName || "";
    const sellerEmail = rec.sellerId?.businessEmail || "";
    const payoutRef = rec.payoutReference || "";

    return (
      (orderId && String(orderId).toLowerCase().includes(q)) ||
      (customerId && String(customerId).toLowerCase().includes(q)) ||
      sellerName.toLowerCase().includes(q) ||
      sellerEmail.toLowerCase().includes(q) ||
      payoutRef.toLowerCase().includes(q)
    );
  });

  // Client-side pagination calculations
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Safe KPI computations from live API telemetry
  const orderStats = telemetry?.orders || {};
  const revenueStats = telemetry?.revenue || {};

  const totalOrdersCount = orderStats.total ?? 0;
  const pendingCount = orderStats.pending ?? 0;
  const confirmedCount = orderStats.confirmed ?? 0;
  const processingCount = orderStats.processing ?? 0;
  const shippedCount = orderStats.shipped ?? 0;
  const deliveredCount = orderStats.delivered ?? 0;
  const cancelledCount = orderStats.cancelled ?? 0;

  const totalRevenue = revenueStats.totalRevenue ?? 0;
  const totalPaidOrders = revenueStats.totalPaidOrders ?? 0;
  const totalRefundedAmount = revenueStats.totalRefundedAmount ?? 0;
  const totalRefundedOrders = revenueStats.totalRefundedOrders ?? 0;

  return (
    <div className="admin-orders-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-text">
          <h2>Order Oversight &amp; Pipeline Governance</h2>
          <p className="subpage-subtitle">
            Monitor marketplace order velocity, fulfillment lifecycle stages, settlement records, and revenue distribution.
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
            title="Reload order telemetry and fulfillment ledger"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Orders & Telemetry"}
          </button>
        </div>
      </div>

      {/* Error Alert */}
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

      {/* KPI Overview Metrics Cards */}
      <div className="seller-metrics-grid" style={{ marginBottom: "1.5rem" }}>
        {/* Total Orders */}
        <div className="metric-card">
          <div className="metric-icon-wrap blue">🛒</div>
          <div className="metric-content">
            <span className="metric-label">Total Orders</span>
            <span className="metric-number">{loading ? "..." : totalOrdersCount}</span>
            <span className="metric-sub">Platform cumulative volume</span>
          </div>
        </div>

        {/* Paid Revenue */}
        <div className="metric-card">
          <div className="metric-icon-wrap green">💰</div>
          <div className="metric-content">
            <span className="metric-label">Paid Revenue</span>
            <span className="metric-number">${loading ? "..." : totalRevenue.toFixed(2)}</span>
            <span className="metric-sub">{totalPaidOrders} paid transactions</span>
          </div>
        </div>

        {/* In Fulfillment Pipeline */}
        <div className="metric-card">
          <div className="metric-icon-wrap amber">📦</div>
          <div className="metric-content">
            <span className="metric-label">In Fulfillment</span>
            <span className="metric-number">
              {loading ? "..." : processingCount + shippedCount}
            </span>
            <span className="metric-sub">
              {processingCount} processing • {shippedCount} in transit
            </span>
          </div>
        </div>

        {/* Completed Deliveries */}
        <div className="metric-card">
          <div className="metric-icon-wrap purple">✅</div>
          <div className="metric-content">
            <span className="metric-label">Delivered Orders</span>
            <span className="metric-number">{loading ? "..." : deliveredCount}</span>
            <span className="metric-sub">Successfully fulfilled</span>
          </div>
        </div>
      </div>

      {/* Detailed Pipeline Stage Breakdown */}
      <div className="admin-distribution-grid" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-dist-card">
          <div className="dist-card-header">
            <h4>📊 Order Lifecycle Pipeline Distribution</h4>
            <span className="dist-total">
              Pipeline Total: {loading ? "..." : totalOrdersCount}
            </span>
          </div>

          {loading && !refreshing ? (
            <div className="dist-loading">Loading order pipeline metrics...</div>
          ) : totalOrdersCount === 0 ? (
            <p className="dist-empty-note">No customer orders have been placed yet across the marketplace.</p>
          ) : (
            <div className="admin-dist-chips">
              <div className="admin-dist-chip pending">
                <span className="chip-label">Pending</span>
                <span className="chip-val">{pendingCount}</span>
              </div>
              <div className="admin-dist-chip confirmed">
                <span className="chip-label">Confirmed</span>
                <span className="chip-val">{confirmedCount}</span>
              </div>
              <div className="admin-dist-chip processing">
                <span className="chip-label">Processing</span>
                <span className="chip-val">{processingCount}</span>
              </div>
              <div className="admin-dist-chip shipped">
                <span className="chip-label">Shipped</span>
                <span className="chip-val">{shippedCount}</span>
              </div>
              <div className="admin-dist-chip delivered">
                <span className="chip-label">Delivered</span>
                <span className="chip-val" style={{ color: "var(--color-success)" }}>
                  {deliveredCount}
                </span>
              </div>
              <div className="admin-dist-chip cancelled">
                <span className="chip-label">Cancelled</span>
                <span className="chip-val" style={{ color: "var(--color-danger)" }}>
                  {cancelledCount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Refund & Risk Oversight */}
        <div className="admin-dist-card">
          <div className="dist-card-header">
            <h4>🛡️ Refund &amp; Cancellation Governance</h4>
            <span className="dist-total">
              Refunds: {loading ? "..." : totalRefundedOrders}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Cancelled Orders:</span>
              <strong style={{ color: "var(--color-danger)" }}>{cancelledCount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Total Refunded Amount:</span>
              <strong style={{ color: "var(--color-danger)" }}>
                ${totalRefundedAmount.toFixed(2)}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Refunded Order Count:</span>
              <strong>{totalRefundedOrders}</strong>
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              Note: Customer cancellation applies to unfulfilled orders; merchant returns/refunds are settled via vendor ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Controls & Search Card */}
      <div className="admin-controls-card">
        <div className="admin-search-form" style={{ maxWidth: "100%" }}>
          <div className="admin-search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by Order ID, Customer User ID, Merchant Name, Email, or Payout Reference..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading}
              className="admin-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                title="Clear search text"
              >
                ✕
              </button>
            )}
          </div>
          <div className="user-count-indicator">
            <span>
              Orders in Ledger: <strong>{loading ? "..." : filteredRecords.length}</strong>
            </span>
          </div>
        </div>

        {/* Filter Rows */}
        <div className="admin-filters-row">
          <div className="filter-item">
            <label htmlFor="settlement-status-select">Payout Status:</label>
            <select
              id="settlement-status-select"
              className="admin-select-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              disabled={loading}
            >
              <option value="all">All Settlements</option>
              <option value="pending">Pending Payout</option>
              <option value="paid">Paid Out</option>
            </select>
          </div>

          <div className="filter-item">
            <label htmlFor="start-date-input">From Date:</label>
            <input
              id="start-date-input"
              type="date"
              className="admin-select-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="end-date-input">To Date:</label>
            <input
              id="end-date-input"
              type="date"
              className="admin-select-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
            />
          </div>

          {(searchQuery || statusFilter !== "all" || startDate || endDate) && (
            <button
              type="button"
              className="btn-text-link"
              onClick={handleClearFilters}
              style={{ marginLeft: "auto", fontSize: "0.85rem" }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Order Fulfillment & Settlement Ledger Table */}
      <div className="admin-table-card">
        {loading && !refreshing ? (
          <div className="admin-loading-state">
            <div className="auth-spinner large"></div>
            <p>Fetching order fulfillment and settlement ledger...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">🛒</span>
            <h3>No orders found.</h3>
            <p>
              No orders have been recorded in the marketplace yet. When customers place orders, fulfillment and settlement records will appear here.
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="admin-empty-table-state">
            <span className="empty-icon">🔍</span>
            <h3>No orders match your search criteria.</h3>
            <p>
              No order fulfillment records matched the search query &quot;<strong>{searchQuery}</strong>&quot;.
            </p>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClearFilters}
            >
              Clear Search &amp; Filters
            </button>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Merchant &amp; Store</th>
                  <th>Total &amp; Financials</th>
                  <th>Order Status</th>
                  <th>Payment Status</th>
                  <th>Settlement Payout</th>
                  <th>Order Date</th>
                  <th style={{ textAlign: "right" }}>Oversight</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => {
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
                    <tr key={record._id}>
                      {/* Order Reference */}
                      <td>
                        <div className="table-user-name">
                          <strong>Order #{orderId || "N/A"}</strong>
                        </div>
                        {customerId && (
                          <div className="table-subtext mono-id">
                            Cust ID: {customerId}
                          </div>
                        )}
                        <div className="table-subtext mono-id">
                          Ledger: {record._id}
                        </div>
                      </td>

                      {/* Merchant & Store */}
                      <td>
                        <div>
                          <strong>{seller.businessName || "Unknown Seller"}</strong>
                        </div>
                        {seller.businessEmail && (
                          <div className="table-subtext">
                            ✉️ {seller.businessEmail}
                          </div>
                        )}
                        {seller.phone && (
                          <div className="table-subtext">
                            📞 {seller.phone}
                          </div>
                        )}
                      </td>

                      {/* Total & Financials */}
                      <td>
                        <div>
                          <strong>${totalAmount.toFixed(2)}</strong>
                        </div>
                        <div className="table-subtext">
                          Net: ${(Number(record.netAmount) || 0).toFixed(2)} (Comm: ${(Number(record.commissionAmount) || 0).toFixed(2)})
                        </div>
                      </td>

                      {/* Order Status */}
                      <td>
                        <span className={`status-pill ${orderStatus}`} style={{ textTransform: "capitalize" }}>
                          {orderStatus}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td>
                        <span
                          className={`status-pill ${paymentStatus === "paid" ? "confirmed" : paymentStatus === "refunded" ? "cancelled" : "pending"}`}
                          style={{ textTransform: "capitalize" }}
                        >
                          {paymentStatus}
                        </span>
                      </td>

                      {/* Settlement Payout */}
                      <td>
                        <span className={`status-pill ${record.status === "paid" ? "confirmed" : "pending"}`}>
                          {record.status === "paid" ? "Paid Out" : "Pending Payout"}
                        </span>
                      </td>

                      {/* Order Date */}
                      <td>
                        {record.createdAt
                          ? new Date(record.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="btn-action-sm btn-action-view"
                            onClick={() => setSelectedRecordForDetails(record)}
                            title="Inspect order details and settlement ledger"
                          >
                            Details
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
        {totalPages > 1 && (
          <div className="pagination-wrapper" style={{ padding: "1.25rem 1.5rem" }}>
            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
            >
              ← Previous
            </button>

            <span className="pagination-info">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredRecords.length} records)
            </span>

            <button
              type="button"
              className="btn-page"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedRecordForDetails && (
        <AdminOrderDetailsModal
          record={selectedRecordForDetails}
          onClose={() => setSelectedRecordForDetails(null)}
        />
      )}
    </div>
  );
}
