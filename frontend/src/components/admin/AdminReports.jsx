import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";

export default function AdminReports() {
  const { navigate } = useNavigation();

  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateError, setDateError] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedDates, setAppliedDates] = useState({ startDate: "", endDate: "" });

  const fetchReportsData = useCallback(async (start = "", end = "") => {
    setError(null);
    setDateError(null);

    // Validate date logic if both provided
    if (start && end && new Date(start) > new Date(end)) {
      setDateError("Start date cannot be after end date.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const queryParts = [];
      if (start) queryParts.push(`startDate=${encodeURIComponent(start)}`);
      if (end) queryParts.push(`endDate=${encodeURIComponent(end)}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const [overviewRes, salesRes, productsRes] = await Promise.allSettled([
        api.get(`/admin/reports/overview${qs}`),
        api.get(`/admin/reports/sales${qs}`),
        api.get(`/admin/reports/top-products${qs}${qs ? "&limit=10&sortBy=revenue" : "?limit=10&sortBy=revenue"}`),
      ]);

      const errors = [];

      // Process Overview
      if (overviewRes.status === "fulfilled" && overviewRes.value?.overview) {
        setOverview(overviewRes.value.overview);
        setAppliedDates({ startDate: start, endDate: end });
      } else if (overviewRes.status === "rejected") {
        errors.push(
          formatApiError(overviewRes.reason, "Failed to load platform analytics summary.")
        );
      }

      // Process Sales Timeline
      if (salesRes.status === "fulfilled" && Array.isArray(salesRes.value?.sales)) {
        setSales(salesRes.value.sales);
      } else if (salesRes.status === "rejected") {
        errors.push(
          formatApiError(salesRes.reason, "Failed to load daily sales history.")
        );
      }

      // Process Top Products
      if (productsRes.status === "fulfilled" && Array.isArray(productsRes.value?.products)) {
        setTopProducts(productsRes.value.products);
      } else if (productsRes.status === "rejected") {
        errors.push(
          formatApiError(productsRes.reason, "Failed to load top products report.")
        );
      }

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (err) {
      console.error("Failed to load reports data:", err);
      setError(formatApiError(err, "An error occurred while loading platform reports."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  const handleApplyDates = (e) => {
    e.preventDefault();
    if (loading || refreshing) return;
    setLoading(true);
    fetchReportsData(startDate, endDate);
  };

  const handleClearDates = () => {
    setStartDate("");
    setEndDate("");
    setDateError(null);
    setLoading(true);
    fetchReportsData("", "");
  };

  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    await fetchReportsData(appliedDates.startDate, appliedDates.endDate);
  };

  // Safe KPI variables from live backend aggregation
  const rev = overview?.revenue || {};
  const totalRevenue = Number(rev.totalRevenue) || 0;
  const totalPaidOrders = Number(rev.totalPaidOrders) || 0;
  const totalRefundedAmount = Number(rev.totalRefundedAmount) || 0;
  const totalRefundedOrders = Number(rev.totalRefundedOrders) || 0;
  const netPlatformFlow = totalRevenue - totalRefundedAmount;

  const ord = overview?.orders || {};
  const totalOrders = Number(ord.total) || 0;
  const pendingOrders = Number(ord.pending) || 0;
  const confirmedOrders = Number(ord.confirmed) || 0;
  const processingOrders = Number(ord.processing) || 0;
  const shippedOrders = Number(ord.shipped) || 0;
  const deliveredOrders = Number(ord.delivered) || 0;
  const cancelledOrders = Number(ord.cancelled) || 0;

  const prod = overview?.products || {};
  const totalProducts = Number(prod.total) || 0;
  const approvedProducts = Number(prod.approved) || 0;
  const pendingProducts = Number(prod.pending) || 0;
  const rejectedProducts = Number(prod.rejected) || 0;
  const inactiveProducts = Number(prod.inactive) || 0;
  const draftProducts = Number(prod.draft) || 0;

  const sel = overview?.sellers || {};
  const totalSellers = Number(sel.totalApplications) || 0;
  const approvedSellers = Number(sel.approved) || 0;
  const pendingSellers = Number(sel.pending) || 0;
  const rejectedSellers = Number(sel.rejected) || 0;
  const suspendedSellers = Number(sel.suspended) || 0;

  const usr = overview?.users || {};
  const totalUsers = Number(usr.total) || 0;
  const customerUsers = Number(usr.customers) || 0;
  const sellerUsers = Number(usr.sellers) || 0;
  const supportUsers = Number(usr.supportAgents) || 0;
  const deliveryUsers = Number(usr.deliveryPartners) || 0;
  const adminUsers = Number(usr.admins) || 0;
  const activeUsers = Number(usr.active) || 0;
  const inactiveUsers = Number(usr.inactive) || 0;

  const inv = overview?.inventory || {};
  const totalInventoryQuantity = Number(inv.totalQuantity) || 0;
  const totalReservedQuantity = Number(inv.totalReservedQuantity) || 0;
  const totalAvailableQuantity = Number(inv.totalAvailableQuantity) || 0;
  const lowStockItemCount = Number(inv.lowStockItemCount) || 0;

  // Pipeline distribution helper
  const getPipelinePercentage = (count) => {
    if (totalOrders === 0) return 0;
    return Math.round((count / totalOrders) * 1000) / 10;
  };

  const isZeroPeriod =
    !loading &&
    overview &&
    totalOrders === 0 &&
    totalRevenue === 0;

  return (
    <div className="admin-reports-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div className="admin-page-header-text">
          <h2>Platform Analytics &amp; Business Intelligence</h2>
          <p className="subpage-subtitle">
            Executive reporting, revenue analytics, order lifecycle distribution, and platform health telemetry.
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
            title="Reload platform analytics and report telemetry"
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Reports"}
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

      {/* Date Validation Alert */}
      {dateError && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.25rem" }}>
          <span className="alert-icon">⚠️</span>
          <span>{dateError}</span>
        </div>
      )}

      {/* Date Range Control Bar */}
      <div className="admin-controls-card">
        <form onSubmit={handleApplyDates} className="admin-filters-row" style={{ borderTop: "none", paddingTop: 0 }}>
          <div className="filter-item">
            <label htmlFor="report-start-date">From Date:</label>
            <input
              id="report-start-date"
              type="date"
              className="admin-select-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading || refreshing}
            />
          </div>

          <div className="filter-item">
            <label htmlFor="report-end-date">To Date:</label>
            <input
              id="report-end-date"
              type="date"
              className="admin-select-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading || refreshing}
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-action-sm"
            disabled={loading || refreshing || (!startDate && !endDate)}
            style={{ padding: "0.45rem 1rem" }}
          >
            Apply Date Filter
          </button>

          {(appliedDates.startDate || appliedDates.endDate || startDate || endDate) && (
            <button
              type="button"
              className="btn-secondary btn-action-sm"
              onClick={handleClearDates}
              disabled={loading || refreshing}
              style={{ padding: "0.45rem 1rem" }}
            >
              Reset to All-Time
            </button>
          )}

          {/* Active Period Label */}
          <div className="user-count-indicator" style={{ marginLeft: "auto" }}>
            <span
              className="self-badge"
              style={{
                backgroundColor: appliedDates.startDate || appliedDates.endDate ? "rgba(99, 102, 241, 0.15)" : "var(--bg-page)",
                color: appliedDates.startDate || appliedDates.endDate ? "var(--primary)" : "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.82rem",
                padding: "0.35rem 0.75rem",
              }}
            >
              {appliedDates.startDate || appliedDates.endDate
                ? `📅 Filtered: ${appliedDates.startDate || "Beginning"} → ${appliedDates.endDate || "Present"}`
                : "🌐 Report Period: All-Time Platform History"}
            </span>
          </div>
        </form>
      </div>

      {/* Main Loading State */}
      {loading && !refreshing ? (
        <div className="admin-loading-state" style={{ minHeight: "300px" }}>
          <div className="auth-spinner large"></div>
          <p>Compiling platform aggregations and financial reports...</p>
        </div>
      ) : (
        <>
          {/* Zero Data State for filtered range */}
          {isZeroPeriod && (
            <div className="admin-empty-table-state" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", marginBottom: "1.5rem" }}>
              <span className="empty-icon">📊</span>
              <h3>No Activity Recorded for Selected Period</h3>
              <p>
                No customer orders or revenue transactions matched the selected date timeframe. All lifetime baseline metrics remain accessible by resetting the date filter.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearDates}
              >
                View All-Time Telemetry
              </button>
            </div>
          )}

          {/* Section 1: Financial & Revenue Performance */}
          <div className="admin-dist-card" style={{ marginBottom: "1.5rem" }}>
            <div className="dist-card-header">
              <h4>💰 Financial Summary &amp; Revenue Telemetry</h4>
              <span className="dist-total">
                {appliedDates.startDate || appliedDates.endDate ? "Filtered Period" : "All-Time"}
              </span>
            </div>

            <div className="seller-metrics-grid" style={{ marginBottom: "0.5rem" }}>
              {/* Total Revenue */}
              <div className="metric-card">
                <div className="metric-icon-wrap green">💵</div>
                <div className="metric-content">
                  <span className="metric-label">Total Revenue</span>
                  <span className="metric-number">${totalRevenue.toFixed(2)}</span>
                  <span className="metric-sub">From {totalPaidOrders} paid transactions</span>
                </div>
              </div>

              {/* Total Paid Orders */}
              <div className="metric-card">
                <div className="metric-icon-wrap blue">🛒</div>
                <div className="metric-content">
                  <span className="metric-label">Paid Orders</span>
                  <span className="metric-number">{totalPaidOrders}</span>
                  <span className="metric-sub">Successful customer purchases</span>
                </div>
              </div>

              {/* Refunded Amount */}
              <div className="metric-card">
                <div className="metric-icon-wrap amber">↩️</div>
                <div className="metric-content">
                  <span className="metric-label">Refunded Amount</span>
                  <span className="metric-number" style={{ color: "var(--color-danger)" }}>
                    ${totalRefundedAmount.toFixed(2)}
                  </span>
                  <span className="metric-sub">{totalRefundedOrders} refunded order instances</span>
                </div>
              </div>

              {/* Net Platform Flow */}
              <div className="metric-card">
                <div className="metric-icon-wrap purple">📈</div>
                <div className="metric-content">
                  <span className="metric-label">Net Sales Volume</span>
                  <span className="metric-number">${netPlatformFlow.toFixed(2)}</span>
                  <span className="metric-sub">Revenue minus refunded total</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Order Lifecycle Pipeline & Distribution */}
          <div className="admin-dist-card" style={{ marginBottom: "1.5rem" }}>
            <div className="dist-card-header">
              <h4>📦 Order Lifecycle Pipeline Distribution</h4>
              <span className="dist-total">
                Pipeline Volume: {totalOrders} orders
              </span>
            </div>

            {totalOrders === 0 ? (
              <p className="dist-empty-note">No customer orders have been recorded in this reporting period.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {/* Visual Pipeline Bar Chart Component */}
                <div
                  style={{
                    display: "flex",
                    height: "14px",
                    borderRadius: "var(--radius-full)",
                    overflow: "hidden",
                    backgroundColor: "var(--bg-page)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  title="Pipeline distribution overview"
                >
                  {pendingOrders > 0 && (
                    <div
                      style={{
                        width: `${getPipelinePercentage(pendingOrders)}%`,
                        backgroundColor: "#f59e0b",
                      }}
                      title={`Pending: ${pendingOrders} orders (${getPipelinePercentage(pendingOrders)}%)`}
                    />
                  )}
                  {confirmedOrders > 0 && (
                    <div
                      style={{
                        width: `${getPipelinePercentage(confirmedOrders)}%`,
                        backgroundColor: "#6366f1",
                      }}
                      title={`Confirmed: ${confirmedOrders} orders (${getPipelinePercentage(confirmedOrders)}%)`}
                    />
                  )}
                  {processingOrders > 0 && (
                    <div
                      style={{
                        width: `${getPipelinePercentage(processingOrders)}%`,
                        backgroundColor: "#8b5cf6",
                      }}
                      title={`Processing: ${processingOrders} orders (${getPipelinePercentage(processingOrders)}%)`}
                    />
                  )}
                  {shippedOrders > 0 && (
                    <div
                      style={{
                        width: `${getPipelinePercentage(shippedOrders)}%`,
                        backgroundColor: "#3b82f6",
                      }}
                      title={`Shipped: ${shippedOrders} orders (${getPipelinePercentage(shippedOrders)}%)`}
                    />
                  )}
                  {deliveredOrders > 0 && (
                    <div
                      style={{
                        width: `${getPipelinePercentage(deliveredOrders)}%`,
                        backgroundColor: "#10b981",
                      }}
                      title={`Delivered: ${deliveredOrders} orders (${getPipelinePercentage(deliveredOrders)}%)`}
                    />
                  )}
                  {cancelledOrders > 0 && (
                    <div
                      style={{
                        width: `${getPipelinePercentage(cancelledOrders)}%`,
                        backgroundColor: "#ef4444",
                      }}
                      title={`Cancelled: ${cancelledOrders} orders (${getPipelinePercentage(cancelledOrders)}%)`}
                    />
                  )}
                </div>

                {/* Status Breakdown Grid */}
                <div className="admin-dist-chips">
                  <div className="admin-dist-chip pending">
                    <span className="chip-label">Pending</span>
                    <span className="chip-val">
                      {pendingOrders}{" "}
                      <small style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                        ({getPipelinePercentage(pendingOrders)}%)
                      </small>
                    </span>
                  </div>

                  <div className="admin-dist-chip confirmed">
                    <span className="chip-label">Confirmed</span>
                    <span className="chip-val">
                      {confirmedOrders}{" "}
                      <small style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                        ({getPipelinePercentage(confirmedOrders)}%)
                      </small>
                    </span>
                  </div>

                  <div className="admin-dist-chip processing">
                    <span className="chip-label">Processing</span>
                    <span className="chip-val">
                      {processingOrders}{" "}
                      <small style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                        ({getPipelinePercentage(processingOrders)}%)
                      </small>
                    </span>
                  </div>

                  <div className="admin-dist-chip shipped">
                    <span className="chip-label">Shipped</span>
                    <span className="chip-val">
                      {shippedOrders}{" "}
                      <small style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                        ({getPipelinePercentage(shippedOrders)}%)
                      </small>
                    </span>
                  </div>

                  <div className="admin-dist-chip delivered">
                    <span className="chip-label">Delivered</span>
                    <span className="chip-val" style={{ color: "var(--color-success)" }}>
                      {deliveredOrders}{" "}
                      <small style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                        ({getPipelinePercentage(deliveredOrders)}%)
                      </small>
                    </span>
                  </div>

                  <div className="admin-dist-chip cancelled">
                    <span className="chip-label">Cancelled</span>
                    <span className="chip-val" style={{ color: "var(--color-danger)" }}>
                      {cancelledOrders}{" "}
                      <small style={{ fontSize: "0.75rem", fontWeight: "normal", color: "var(--text-muted)" }}>
                        ({getPipelinePercentage(cancelledOrders)}%)
                      </small>
                    </span>
                  </div>
                </div>

                <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  * Percentages represent frontend-derived proportion of total pipeline order volume.
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Marketplace Growth & Multi-Vendor Ecosystem */}
          <div className="admin-distribution-grid" style={{ marginBottom: "1.5rem" }}>
            {/* Merchant Network */}
            <div className="admin-dist-card">
              <div className="dist-card-header">
                <h4>🏪 Merchant Ecosystem</h4>
                <span className="dist-total">{totalSellers} Vendors</span>
              </div>
              <div className="admin-dist-chips">
                <div className="admin-dist-chip role-seller-chip">
                  <span className="chip-label">Approved Stores</span>
                  <span className="chip-val">{approvedSellers}</span>
                </div>
                <div className="admin-dist-chip pending">
                  <span className="chip-label">Pending Approval</span>
                  <span className="chip-val">{pendingSellers}</span>
                </div>
                <div className="admin-dist-chip cancelled">
                  <span className="chip-label">Rejected / Suspended</span>
                  <span className="chip-val">{rejectedSellers + suspendedSellers}</span>
                </div>
              </div>
            </div>

            {/* Product Catalog */}
            <div className="admin-dist-card">
              <div className="dist-card-header">
                <h4>📦 Product Catalog</h4>
                <span className="dist-total">{totalProducts} Items</span>
              </div>
              <div className="admin-dist-chips">
                <div className="admin-dist-chip available-stock">
                  <span className="chip-label">Active Listings</span>
                  <span className="chip-val">{approvedProducts}</span>
                </div>
                <div className="admin-dist-chip pending">
                  <span className="chip-label">Pending Moderation</span>
                  <span className="chip-val">{pendingProducts}</span>
                </div>
                <div className="admin-dist-chip cancelled">
                  <span className="chip-label">Rejected / Drafts</span>
                  <span className="chip-val">{rejectedProducts + draftProducts + inactiveProducts}</span>
                </div>
              </div>
            </div>

            {/* User Base Demographics */}
            <div className="admin-dist-card">
              <div className="dist-card-header">
                <h4>👥 User Base Composition</h4>
                <span className="dist-total">{totalUsers} Users</span>
              </div>
              <div className="admin-dist-chips">
                <div className="admin-dist-chip role-customer-chip">
                  <span className="chip-label">Customers</span>
                  <span className="chip-val">{customerUsers}</span>
                </div>
                <div className="admin-dist-chip role-seller-chip">
                  <span className="chip-label">Sellers</span>
                  <span className="chip-val">{sellerUsers}</span>
                </div>
                <div className="admin-dist-chip role-support-chip">
                  <span className="chip-label">Support &amp; Delivery</span>
                  <span className="chip-val">{supportUsers + deliveryUsers}</span>
                </div>
                <div className="admin-dist-chip role-admin-chip">
                  <span className="chip-label">Administrators</span>
                  <span className="chip-val">{adminUsers}</span>
                </div>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Account Health: <strong>{activeUsers}</strong> active accounts • <strong>{inactiveUsers}</strong> deactivated
              </div>
            </div>

            {/* Warehouse & Inventory Health */}
            <div className="admin-dist-card">
              <div className="dist-card-header">
                <h4>🏭 Inventory Velocity &amp; Stock Health</h4>
                <span className="dist-total">{totalInventoryQuantity} Total Units</span>
              </div>
              <div className="admin-dist-chips">
                <div className="admin-dist-chip available-stock">
                  <span className="chip-label">Available for Sale</span>
                  <span className="chip-val">{totalAvailableQuantity}</span>
                </div>
                <div className="admin-dist-chip reserved-stock">
                  <span className="chip-label">Reserved in Carts</span>
                  <span className="chip-val">{totalReservedQuantity}</span>
                </div>
                <div className="admin-dist-chip low-stock">
                  <span className="chip-label">Low Stock Alerts</span>
                  <span className="chip-val">{lowStockItemCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Daily Sales History Timeline (if returned) */}
          {sales.length > 0 && (
            <div className="admin-table-card" style={{ marginBottom: "1.5rem" }}>
              <div className="dist-card-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <h4>📈 Daily Sales Activity Timeline</h4>
                <span className="dist-total">{sales.length} Active Days</span>
              </div>
              <div className="admin-table-wrap">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders Placed</th>
                      <th style={{ textAlign: "right" }}>Daily Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((entry) => (
                      <tr key={entry.date}>
                        <td>
                          <strong>{entry.date}</strong>
                        </td>
                        <td>{entry.orders} orders</td>
                        <td style={{ textAlign: "right", fontWeight: "700", color: "var(--color-success)" }}>
                          ${(Number(entry.revenue) || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Top Revenue-Generating Products (if returned) */}
          {topProducts.length > 0 && (
            <div className="admin-table-card" style={{ marginBottom: "1.5rem" }}>
              <div className="dist-card-header" style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                <h4>🏆 Top Revenue Products</h4>
                <span className="dist-total">Top {topProducts.length} Items</span>
              </div>
              <div className="admin-table-wrap">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units Sold</th>
                      <th style={{ textAlign: "right" }}>Gross Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p) => {
                      const firstImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
                      return (
                        <tr key={p.productId}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <div
                                style={{
                                  width: "36px",
                                  height: "36px",
                                  borderRadius: "var(--radius-sm)",
                                  overflow: "hidden",
                                  backgroundColor: "var(--bg-page)",
                                  border: "1px solid var(--border-subtle)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                {firstImg ? (
                                  <img
                                    src={firstImg}
                                    alt={p.productName}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <span style={{ fontSize: "1.1rem" }}>📦</span>
                                )}
                              </div>
                              <div>
                                <strong>{p.productName}</strong>
                                <div className="table-subtext mono-id">ID: {p.productId}</div>
                              </div>
                            </div>
                          </td>
                          <td>{p.quantitySold} units</td>
                          <td style={{ textAlign: "right", fontWeight: "700", color: "var(--color-success)" }}>
                            ${(Number(p.revenue) || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 6: Administrative Quick Cross-Links */}
          <div className="admin-controls-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <strong>Operational Navigation Links</strong>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Deep-link into live governance queues to execute administrative actions
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                <button
                  type="button"
                  className="btn-secondary btn-action-sm"
                  onClick={() => navigate("/admin/orders")}
                >
                  🛒 View Orders
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-action-sm"
                  onClick={() => navigate("/admin/sellers")}
                >
                  🏪 Moderate Sellers
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-action-sm"
                  onClick={() => navigate("/admin/products")}
                >
                  📦 Moderate Products
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-action-sm"
                  onClick={() => navigate("/admin/users")}
                >
                  👥 Manage Users
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-action-sm"
                  onClick={() => navigate("/admin/audit-logs")}
                >
                  📋 Audit Logs
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
