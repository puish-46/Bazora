import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";

export default function AdminOverview() {
  const { navigate } = useNavigation();

  const [overview, setOverview] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchOverviewData = useCallback(async () => {
    setError(null);

    try {
      const [overviewRes, sellersRes, productsRes] = await Promise.allSettled([
        api.get("/admin/reports/overview"),
        api.get("/admin/sellers/pending"),
        api.get("/admin/products/pending?limit=5"),
      ]);

      const errors = [];

      // Process Overview Aggregations
      if (overviewRes.status === "fulfilled" && overviewRes.value?.overview) {
        setOverview(overviewRes.value.overview);
      } else if (overviewRes.status === "rejected") {
        errors.push(
          formatApiError(overviewRes.reason, "Failed to load platform analytics summary.")
        );
      }

      // Process Pending Sellers
      if (sellersRes.status === "fulfilled" && Array.isArray(sellersRes.value?.sellers)) {
        setPendingSellers(sellersRes.value.sellers);
      } else if (sellersRes.status === "rejected") {
        errors.push(
          formatApiError(sellersRes.reason, "Failed to load pending seller applications.")
        );
      }

      // Process Pending Products
      if (productsRes.status === "fulfilled" && Array.isArray(productsRes.value?.products)) {
        setPendingProducts(productsRes.value.products);
      } else if (productsRes.status === "rejected") {
        errors.push(
          formatApiError(productsRes.reason, "Failed to load pending products queue.")
        );
      }

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (err) {
      console.error("Failed to load admin telemetry:", err);
      setError(formatApiError(err, "An error occurred while loading administration overview."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  const handleRefresh = async () => {
    if (loading || refreshing) return;
    setRefreshing(true);
    await fetchOverviewData();
  };

  // Safe KPI computations from live API payload
  const revenueTotal = overview?.revenue?.totalRevenue ?? null;
  const paidOrdersCount = overview?.revenue?.totalPaidOrders ?? null;
  const refundedAmount = overview?.revenue?.totalRefundedAmount ?? null;

  const usersTotal = overview?.users?.total ?? null;
  const activeUsers = overview?.users?.active ?? null;
  const customersCount = overview?.users?.customers ?? null;

  const sellersTotal = overview?.sellers?.totalApplications ?? null;
  const pendingSellersCount = overview?.sellers?.pending ?? null;
  const approvedSellersCount = overview?.sellers?.approved ?? null;

  const productsTotal = overview?.products?.total ?? null;
  const pendingProductsCount = overview?.products?.pending ?? null;
  const approvedProductsCount = overview?.products?.approved ?? null;

  const isZeroActivity =
    !loading &&
    overview &&
    usersTotal === 0 &&
    productsTotal === 0 &&
    (overview?.orders?.total || 0) === 0;

  return (
    <div className="admin-overview-container">
      {/* Overview Banner & Controls */}
      <div className="admin-overview-header">
        <div className="admin-overview-header-left">
          <h2>Marketplace Telemetry & Platform Vitals</h2>
          <p className="subpage-subtitle">
            Live metrics aggregated across user accounts, merchant applications, catalog moderation, and order pipelines.
          </p>
        </div>

        <div className="admin-overview-header-right" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate("/admin/audit-logs")}
            title="Inspect platform administrative audit trail"
          >
            📋 Audit Logs
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Fetch fresh data from backend APIs"
          >
            {refreshing ? "🔄 Refreshing Telemetry..." : "🔄 Refresh Telemetry"}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="alert alert-danger" role="alert" style={{ marginBottom: "1.5rem" }}>
          <span className="alert-icon">⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Telemetry Synchronisation Alert:</strong>
            <p style={{ margin: "0.25rem 0 0" }}>{error}</p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            style={{ marginLeft: "1rem", whiteSpace: "nowrap" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Zero Activity Onboarding Banner */}
      {isZeroActivity && (
        <div className="admin-zero-activity-card">
          <div className="zero-icon">🚀</div>
          <div className="zero-content">
            <h3>Platform Initialized with Zero Activity</h3>
            <p>
              The database currently contains no live user registrations, vendor applications, or catalog submissions.
              As customers register, merchants create stores, and orders are processed, real-time telemetry will populate here.
            </p>
          </div>
        </div>
      )}

      {/* Top Telemetry KPI Grid */}
      <div className="admin-metrics-grid">
        {/* Metric 1: Revenue */}
        <div
          className="metric-card clickable"
          onClick={() => navigate("/admin/reports")}
          title="View Financial Reports & Sales Analytics"
        >
          <div className="metric-icon-wrap green">💰</div>
          <div className="metric-content">
            <span className="metric-label">Gross Platform Revenue</span>
            <div className="metric-number">
              {loading ? (
                <span className="loading-placeholder">...</span>
              ) : revenueTotal !== null ? (
                `$${Number(revenueTotal).toFixed(2)}`
              ) : (
                "N/A"
              )}
            </div>
            <span className="metric-sub">
              {loading ? (
                "Synchronizing..."
              ) : paidOrdersCount !== null ? (
                `${paidOrdersCount} paid orders • $${Number(refundedAmount || 0).toFixed(2)} refunded`
              ) : (
                "Awaiting sales data"
              )}
            </span>
          </div>
        </div>

        {/* Metric 2: Users */}
        <div
          className="metric-card clickable"
          onClick={() => navigate("/admin/users")}
          title="View User Governance"
        >
          <div className="metric-icon-wrap blue">👥</div>
          <div className="metric-content">
            <span className="metric-label">Registered Users</span>
            <div className="metric-number">
              {loading ? (
                <span className="loading-placeholder">...</span>
              ) : usersTotal !== null ? (
                usersTotal
              ) : (
                "N/A"
              )}
            </div>
            <span className="metric-sub">
              {loading ? (
                "Synchronizing..."
              ) : activeUsers !== null ? (
                `${activeUsers} active • ${customersCount || 0} customers`
              ) : (
                "Awaiting user data"
              )}
            </span>
          </div>
        </div>

        {/* Metric 3: Merchant Applications */}
        <div
          className="metric-card clickable"
          onClick={() => navigate("/admin/sellers")}
          title="View Seller Approvals"
        >
          <div className="metric-icon-wrap amber">🏪</div>
          <div className="metric-content">
            <span className="metric-label">Merchant Pipeline</span>
            <div className="metric-number">
              {loading ? (
                <span className="loading-placeholder">...</span>
              ) : sellersTotal !== null ? (
                sellersTotal
              ) : (
                "N/A"
              )}
            </div>
            <span className="metric-sub">
              {loading ? (
                "Synchronizing..."
              ) : pendingSellersCount !== null ? (
                <strong style={{ color: pendingSellersCount > 0 ? "var(--color-warning)" : "inherit" }}>
                  {pendingSellersCount} pending review • {approvedSellersCount || 0} approved
                </strong>
              ) : (
                "Awaiting merchant data"
              )}
            </span>
          </div>
        </div>

        {/* Metric 4: Product Catalog */}
        <div
          className="metric-card clickable"
          onClick={() => navigate("/admin/products")}
          title="View Product Moderation"
        >
          <div className="metric-icon-wrap purple">📦</div>
          <div className="metric-content">
            <span className="metric-label">Catalog Products</span>
            <div className="metric-number">
              {loading ? (
                <span className="loading-placeholder">...</span>
              ) : productsTotal !== null ? (
                productsTotal
              ) : (
                "N/A"
              )}
            </div>
            <span className="metric-sub">
              {loading ? (
                "Synchronizing..."
              ) : pendingProductsCount !== null ? (
                <strong style={{ color: pendingProductsCount > 0 ? "var(--color-warning)" : "inherit" }}>
                  {pendingProductsCount} pending moderation • {approvedProductsCount || 0} approved
                </strong>
              ) : (
                "Awaiting catalog data"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Operational Moderation Queues */}
      <div className="admin-queues-grid">
        {/* Queue 1: Pending Seller Approvals */}
        <div className="admin-queue-card">
          <div className="admin-queue-header">
            <div className="queue-title-cluster">
              <span className="queue-icon">🏪</span>
              <h3>Pending Seller Applications</h3>
              <span className="queue-count-badge">
                {loading ? "..." : pendingSellers.length}
              </span>
            </div>
            <button
              type="button"
              className="btn-text-link"
              onClick={() => navigate("/admin/sellers")}
            >
              Manage Sellers →
            </button>
          </div>

          {loading ? (
            <div className="queue-loading-box">
              <div className="auth-spinner"></div>
              <p>Fetching pending seller applications...</p>
            </div>
          ) : pendingSellers.length === 0 ? (
            <div className="admin-empty-queue">
              <span className="empty-icon">✅</span>
              <h4>No Pending Seller Applications</h4>
              <p>All merchant onboarding applications have been processed. Queue is clear.</p>
            </div>
          ) : (
            <div className="admin-queue-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Business Name</th>
                    <th>Applicant Contact</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSellers.slice(0, 5).map((seller) => (
                    <tr key={seller._id}>
                      <td>
                        <strong>{seller.businessName || "Unnamed Business"}</strong>
                        {seller.phone && (
                          <div className="table-subtext">📞 {seller.phone}</div>
                        )}
                      </td>
                      <td>
                        <div>{seller.userId?.name || "Registered User"}</div>
                        <div className="table-subtext">
                          {seller.businessEmail || seller.userId?.email || "No email"}
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
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="queue-footer-note">
                <span>Showing up to 5 pending applicants. One-click approvals active in Admin Flow Step 3.</span>
              </div>
            </div>
          )}
        </div>

        {/* Queue 2: Pending Product Moderation */}
        <div className="admin-queue-card">
          <div className="admin-queue-header">
            <div className="queue-title-cluster">
              <span className="queue-icon">📦</span>
              <h3>Pending Product Moderation</h3>
              <span className="queue-count-badge">
                {loading ? "..." : pendingProducts.length}
              </span>
            </div>
            <button
              type="button"
              className="btn-text-link"
              onClick={() => navigate("/admin/products")}
            >
              Moderate Catalog →
            </button>
          </div>

          {loading ? (
            <div className="queue-loading-box">
              <div className="auth-spinner"></div>
              <p>Fetching product catalog moderation items...</p>
            </div>
          ) : pendingProducts.length === 0 ? (
            <div className="admin-empty-queue">
              <span className="empty-icon">✅</span>
              <h4>No Products Pending Moderation</h4>
              <p>Catalog moderation queue is clear. All merchant listings have been reviewed.</p>
            </div>
          ) : (
            <div className="admin-queue-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Product Title</th>
                    <th>Merchant Store</th>
                    <th>Category</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingProducts.slice(0, 5).map((prod) => (
                    <tr key={prod._id}>
                      <td>
                        <strong>{prod.name}</strong>
                      </td>
                      <td>
                        {prod.storeId?.storeName ||
                          prod.sellerId?.businessName ||
                          "Merchant"}
                      </td>
                      <td>
                        {prod.categoryId?.name || "General"}
                      </td>
                      <td>
                        <span className="status-pill pending">Awaiting Review</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="queue-footer-note">
                <span>Showing up to 5 pending items. Full moderation workflow active in Admin Flow Step 4.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Distribution & Infrastructure Breakdown */}
      <div className="admin-distribution-grid">
        {/* Section 1: Order Lifecycle Status */}
        <div className="admin-dist-card">
          <div className="dist-card-header">
            <h4>🛒 Order Lifecycle Pipeline</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="dist-total">
                Total: {loading ? "..." : (overview?.orders?.total ?? 0)}
              </span>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => navigate("/admin/orders")}
                title="View Order Oversight & Fulfillment Records"
              >
                Manage Orders →
              </button>
            </div>
          </div>

          {loading ? (
            <div className="dist-loading">Loading order pipeline metrics...</div>
          ) : (overview?.orders?.total || 0) === 0 ? (
            <p className="dist-empty-note">No customer orders have been placed yet across the marketplace.</p>
          ) : (
            <div className="admin-dist-chips">
              <div className="admin-dist-chip pending">
                <span className="chip-label">Pending Payment</span>
                <span className="chip-val">{overview?.orders?.pending ?? 0}</span>
              </div>
              <div className="admin-dist-chip confirmed">
                <span className="chip-label">Confirmed</span>
                <span className="chip-val">{overview?.orders?.confirmed ?? 0}</span>
              </div>
              <div className="admin-dist-chip processing">
                <span className="chip-label">Processing</span>
                <span className="chip-val">{overview?.orders?.processing ?? 0}</span>
              </div>
              <div className="admin-dist-chip shipped">
                <span className="chip-label">In Transit</span>
                <span className="chip-val">{overview?.orders?.shipped ?? 0}</span>
              </div>
              <div className="admin-dist-chip delivered">
                <span className="chip-label">Delivered</span>
                <span className="chip-val">{overview?.orders?.delivered ?? 0}</span>
              </div>
              <div className="admin-dist-chip cancelled">
                <span className="chip-label">Cancelled</span>
                <span className="chip-val">{overview?.orders?.cancelled ?? 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: User Role Governance Breakdown */}
        <div className="admin-dist-card">
          <div className="dist-card-header">
            <h4>👤 Account Role Breakdown</h4>
            <span className="dist-total">
              Total: {loading ? "..." : (overview?.users?.total ?? 0)}
            </span>
          </div>

          {loading ? (
            <div className="dist-loading">Loading account role metrics...</div>
          ) : (
            <div className="admin-dist-chips">
              <div className="admin-dist-chip role-customer-chip">
                <span className="chip-label">Customers</span>
                <span className="chip-val">{overview?.users?.customers ?? 0}</span>
              </div>
              <div className="admin-dist-chip role-seller-chip">
                <span className="chip-label">Sellers</span>
                <span className="chip-val">{overview?.users?.sellers ?? 0}</span>
              </div>
              <div className="admin-dist-chip role-support-chip">
                <span className="chip-label">Support Agents</span>
                <span className="chip-val">{overview?.users?.supportAgents ?? 0}</span>
              </div>
              <div className="admin-dist-chip role-delivery-chip">
                <span className="chip-label">Delivery Partners</span>
                <span className="chip-val">{overview?.users?.deliveryPartners ?? 0}</span>
              </div>
              <div className="admin-dist-chip role-admin-chip">
                <span className="chip-label">Administrators</span>
                <span className="chip-val">{overview?.users?.admins ?? 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Inventory Health */}
        <div className="admin-dist-card">
          <div className="dist-card-header">
            <h4>📋 Inventory System Health</h4>
            <span className="dist-total">
              SKU Records: {loading ? "..." : (overview?.inventory?.totalRecords ?? 0)}
            </span>
          </div>

          {loading ? (
            <div className="dist-loading">Loading inventory metrics...</div>
          ) : (
            <div className="admin-dist-chips">
              <div className="admin-dist-chip available-stock">
                <span className="chip-label">Available Units</span>
                <span className="chip-val">{overview?.inventory?.totalAvailableQuantity ?? 0}</span>
              </div>
              <div className="admin-dist-chip reserved-stock">
                <span className="chip-label">Reserved Units</span>
                <span className="chip-val">{overview?.inventory?.totalReservedQuantity ?? 0}</span>
              </div>
              <div className="admin-dist-chip low-stock">
                <span className="chip-label">Low Stock Variants</span>
                <span className="chip-val">{overview?.inventory?.lowStockItemCount ?? 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
