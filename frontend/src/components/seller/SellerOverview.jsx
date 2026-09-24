import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";
import SellerStoreModal from "./SellerStoreModal.jsx";

export default function SellerOverview({ store, accountStatus, onStoreUpdated, onRefreshAll }) {
  const { navigate } = useNavigation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);

  const [showStoreModal, setShowStoreModal] = useState(false);

  const loadOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [prodRes, orderRes, earnRes] = await Promise.allSettled([
        api.get("/products/my"),
        api.get("/orders/seller/my"),
        api.get("/settlements/seller/earnings"),
      ]);

      // Check if user is pending approval
      const firstRejected = [prodRes, orderRes, earnRes].find(
        (r) => r.status === "rejected"
      );

      if (firstRejected) {
        const reason = firstRejected.reason;
        if (reason?.status === 403) {
          setError(
            "Your seller account is awaiting administrator approval. Overview metrics are unavailable until approved."
          );
        } else {
          setError(formatApiError(reason, "Failed to load seller metrics."));
        }
      }

      if (prodRes.status === "fulfilled" && prodRes.value?.products) {
        setProducts(prodRes.value.products);
      }

      if (orderRes.status === "fulfilled" && orderRes.value?.orders) {
        setOrders(orderRes.value.orders);
      }

      if (earnRes.status === "fulfilled" && earnRes.value) {
        setEarnings(earnRes.value);
      }
    } catch (err) {
      console.error("Failed to load seller overview:", err);
      setError(formatApiError(err, "Failed to load seller metrics."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  const handleRefresh = async () => {
    await loadOverviewData();
    if (onRefreshAll) onRefreshAll();
  };

  // Compute metrics from actual backend data
  const totalProducts = products.length;
  const approvedProducts = products.filter((p) => p.status === "approved").length;
  const pendingProducts = products.filter((p) => p.status === "pending").length;

  const totalOrders = orders.length;
  const actionableOrders = orders.filter((o) =>
    ["confirmed", "processing"].includes(o.sellerOrder?.status)
  ).length;

  const grossSales = earnings?.summary?.totalGross ?? 0;
  const netEarnings = earnings?.summary?.totalNet ?? 0;
  const pendingPayout = earnings?.summary?.pendingAmount ?? 0;

  // Recent 4 orders
  const recentOrders = orders.slice(0, 4);

  return (
    <div className="seller-overview-container">
      {/* Storefront Header Card */}
      <div className="store-profile-banner">
        <div className="store-banner-left">
          {store?.logo ? (
            <img src={store.logo} alt={store.storeName} className="store-logo-img" />
          ) : (
            <div className="store-logo-placeholder">🏪</div>
          )}
          <div className="store-info-text">
            <div className="store-title-row">
              <h2>{store ? store.storeName : "Storefront Not Configured"}</h2>
              {store && (
                <span className={`status-pill ${store.isActive ? "confirmed" : "pending"}`}>
                  {store.isActive ? "Active Store" : "Inactive"}
                </span>
              )}
            </div>
            <p className="store-description-text">
              {store?.description ||
                "Create your storefront to customize your merchant branding and list products on Bazora."}
            </p>
          </div>
        </div>

        <div className="store-banner-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh metrics and orders"
          >
            🔄 Refresh Overview
          </button>
          <button
            type="button"
            className="btn-configure-store"
            onClick={() => setShowStoreModal(true)}
          >
            ⚙️ {store ? "Configure Store" : "Create Storefront"}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="seller-metrics-grid">
        <div
          className="metric-card clickable"
          onClick={() => navigate("/seller/products")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon-wrap blue">📦</div>
          <div className="metric-content">
            <span className="metric-label">Products</span>
            <div className="metric-number">{loading ? "..." : totalProducts}</div>
            <span className="metric-sub">
              {loading
                ? "Synchronizing..."
                : `${approvedProducts} approved • ${pendingProducts} pending`}
            </span>
          </div>
        </div>

        <div
          className="metric-card clickable"
          onClick={() => navigate("/seller/orders")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon-wrap amber">🛒</div>
          <div className="metric-content">
            <span className="metric-label">Orders</span>
            <div className="metric-number">{loading ? "..." : totalOrders}</div>
            <span className="metric-sub">
              {loading ? (
                "Synchronizing..."
              ) : actionableOrders > 0 ? (
                <strong className="text-warning">{actionableOrders} require fulfillment</strong>
              ) : (
                "All current orders fulfilled"
              )}
            </span>
          </div>
        </div>

        <div
          className="metric-card clickable"
          onClick={() => navigate("/seller/settlements")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon-wrap green">💰</div>
          <div className="metric-content">
            <span className="metric-label">Gross Sales</span>
            <div className="metric-number">
              {loading ? "..." : `$${grossSales.toFixed(2)}`}
            </div>
            <span className="metric-sub">From delivered orders</span>
          </div>
        </div>

        <div
          className="metric-card clickable"
          onClick={() => navigate("/seller/settlements")}
          role="button"
          tabIndex={0}
        >
          <div className="metric-icon-wrap purple">💵</div>
          <div className="metric-content">
            <span className="metric-label">Net Earnings</span>
            <div className="metric-number">
              {loading ? "..." : `$${netEarnings.toFixed(2)}`}
            </div>
            <span className="metric-sub">
              {loading ? "Synchronizing..." : `$${pendingPayout.toFixed(2)} pending payout`}
            </span>
          </div>
        </div>
      </div>

      {/* Zero Activity Onboarding Empty State */}
      {!loading && products.length === 0 && orders.length === 0 && (
        <div className="seller-onboarding-card">
          <div className="onboarding-text">
            <h3>🚀 Welcome to Your Bazora Merchant Hub</h3>
            <p>
              Your store currently has zero activity. To start generating sales:
              {!store
                ? " First configure your storefront branding, then list your products."
                : " Click '+ Create New Product' to list your first item for marketplace review."}
            </p>
          </div>
          <div className="onboarding-actions">
            {!store ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowStoreModal(true)}
              >
                ⚙️ Set Up Storefront
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => navigate("/seller/products")}
              >
                + List First Product
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Access Links */}
      <div className="seller-quick-actions-bar">
        <h3>Quick Navigation</h3>
        <div className="action-buttons-group">
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => navigate("/seller/products")}
          >
            📦 Manage Catalog & Products →
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => navigate("/seller/inventory")}
          >
            📋 Inventory & Stock Levels →
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => navigate("/seller/orders")}
          >
            🚚 Fulfillment & Orders →
          </button>
          <button
            type="button"
            className="quick-action-btn"
            onClick={() => navigate("/seller/settlements")}
          >
            💳 Payouts & Settlements →
          </button>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="dashboard-sub-section">
        <div className="section-header-row">
          <h3>Recent Vendor Orders</h3>
          <button
            type="button"
            className="link-button"
            onClick={() => navigate("/seller/orders")}
          >
            View All ({orders.length}) →
          </button>
        </div>

        {loading ? (
          <div className="seller-loading-box">
            <div className="auth-spinner"></div>
            <p>Loading recent activity...</p>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="empty-overview-box">
            <span className="empty-icon-sm">📦</span>
            <p>No customer orders placed for your store yet.</p>
          </div>
        ) : (
          <div className="recent-orders-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => {
                  const sOrder = ord.sellerOrder || {};
                  const itemCount = Array.isArray(sOrder.items)
                    ? sOrder.items.reduce((s, i) => s + (i.quantity || 1), 0)
                    : 0;

                  return (
                    <tr key={ord.orderId}>
                      <td className="mono">#{ord.orderId}</td>
                      <td>
                        <div className="customer-info-cell">
                          <strong>{ord.customer?.name || "Customer"}</strong>
                          <span className="cell-sub">{ord.customer?.email}</span>
                        </div>
                      </td>
                      <td>{new Date(ord.createdAt).toLocaleDateString()}</td>
                      <td>{itemCount} item(s)</td>
                      <td>
                        <strong>${Number(sOrder.subtotal || 0).toFixed(2)}</strong>
                      </td>
                      <td>
                        <span className={`status-pill ${sOrder.status || "confirmed"}`}>
                          {sOrder.status || "confirmed"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-table-action"
                          onClick={() => navigate("/seller/orders")}
                        >
                          Fulfill →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showStoreModal && (
        <SellerStoreModal
          currentStore={store}
          onClose={() => setShowStoreModal(false)}
          onSaved={(updatedStore) => {
            onStoreUpdated(updatedStore);
            if (onRefreshAll) onRefreshAll();
          }}
        />
      )}
    </div>
  );
}
