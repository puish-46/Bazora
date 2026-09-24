import { useState, useEffect } from "react";
import { api, formatApiError } from "../../services/api.js";
import { useNavigation } from "../../context/NavigationContext.jsx";

export default function SellerOrders({ accountStatus }) {
  const { currentPath, navigate } = useNavigation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingAction, setUpdatingAction] = useState(null); // { orderId, status }

  // Order Details Modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/orders/seller/my");
      if (res && Array.isArray(res.orders)) {
        setOrders(res.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to load seller orders:", err);
      setError(formatApiError(err, "Failed to load seller orders."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Support direct route: /seller/orders/:id
  useEffect(() => {
    if (currentPath.startsWith("/seller/orders/")) {
      const urlOrderId = currentPath.slice("/seller/orders/".length).trim();
      if (urlOrderId && orders.length > 0) {
        const matching = orders.find((o) => o.orderId === urlOrderId);
        if (matching) {
          setSelectedOrder(matching);
        }
      }
    }
  }, [currentPath, orders]);

  const handleCloseModal = () => {
    setSelectedOrder(null);
    if (currentPath.startsWith("/seller/orders/")) {
      navigate("/seller/orders");
    }
  };

  const handleOpenDetails = (ord) => {
    setSelectedOrder(ord);
    navigate(`/seller/orders/${ord.orderId}`);
  };

  // Helper for safe shipping address display
  const formatAddress = (addr) => {
    if (!addr) return null;
    const parts = [
      addr.addressLine1,
      addr.addressLine2,
      addr.city,
      addr.state,
      addr.postalCode,
      addr.country || "India",
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  // Allowed transitions dictionary defined strictly by backend rules:
  // confirmed -> processing, cancelled
  // processing -> shipped, cancelled
  // shipped -> delivered
  // delivered, cancelled -> terminal
  const getAllowedTransitions = (currentStatus) => {
    switch (currentStatus) {
      case "confirmed":
        return ["processing", "cancelled"];
      case "processing":
        return ["shipped", "cancelled"];
      case "shipped":
        return ["delivered"];
      case "delivered":
      case "cancelled":
      default:
        return [];
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    if (updatingAction) return;

    setError(null);
    setSuccessMsg(null);
    setUpdatingAction({ orderId, status: newStatus });

    try {
      const res = await api.patch(`/orders/seller/${orderId}/status`, {
        status: newStatus,
      });

      if (res && res.success) {
        setSuccessMsg(`Order #${orderId} marked as ${newStatus.toUpperCase()}`);
        await fetchOrders();
        if (selectedOrder && selectedOrder.orderId === orderId) {
          setSelectedOrder((prev) => ({
            ...prev,
            sellerOrder: {
              ...prev.sellerOrder,
              status: newStatus,
            },
          }));
        }
      } else {
        throw new Error(res?.message || "Failed to update order status");
      }
    } catch (err) {
      console.error("Order status update failed:", err);
      setError(
        formatApiError(err, "Could not transition order to the requested status.")
      );
    } finally {
      setUpdatingAction(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "all") return true;
    return o.sellerOrder?.status === statusFilter;
  });

  return (
    <div className="seller-orders-page">
      <div className="seller-subpage-header">
        <div>
          <h2>Merchant Order Fulfillment ({orders.length})</h2>
          <p className="subpage-subtitle">
            Manage your store's packages, pack shipments, and transition delivery milestones
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={fetchOrders}
          disabled={loading}
        >
          🔄 Refresh Orders
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success" role="alert">
          <span className="alert-icon">✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="orders-filter-bar">
        {["all", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((st) => (
          <button
            key={st}
            type="button"
            className={`filter-tab-btn ${statusFilter === st ? "active" : ""}`}
            onClick={() => setStatusFilter(st)}
          >
            {st.charAt(0).toUpperCase() + st.slice(1)}{" "}
            {st === "all"
              ? `(${orders.length})`
              : `(${orders.filter((o) => o.sellerOrder?.status === st).length})`}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="seller-loading-box">
          <div className="auth-spinner large"></div>
          <p>Loading your vendor orders queue...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-overview-box large">
          <span className="empty-icon-lg">🛒</span>
          <h3>No Orders Found</h3>
          <p>
            {orders.length === 0
              ? "No customer orders have been placed for your store yet."
              : `No orders currently match status: "${statusFilter}".`}
          </p>
          {orders.length > 0 && statusFilter !== "all" && (
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: "1rem" }}
              onClick={() => setStatusFilter("all")}
            >
              View All Orders ({orders.length})
            </button>
          )}
        </div>
      ) : (
        <div className="seller-orders-list">
          {filteredOrders.map((ord) => {
            const sOrder = ord.sellerOrder || {};
            const items = Array.isArray(sOrder.items) ? sOrder.items : [];
            const allowed = getAllowedTransitions(sOrder.status);
            const addressString = formatAddress(ord.shippingAddress);

            return (
              <div key={ord.orderId} className="seller-order-card">
                <div className="seller-order-card-header">
                  <div className="order-id-group">
                    <span className="order-num mono">#{ord.orderId}</span>
                    <span className="order-date">
                      {new Date(ord.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="order-badges-group">
                    <span className={`status-pill ${ord.paymentStatus}`}>
                      Payment: {ord.paymentStatus}
                    </span>
                    <span className={`status-pill ${sOrder.status || "confirmed"}`}>
                      Package: {sOrder.status || "confirmed"}
                    </span>
                  </div>
                </div>

                <div className="seller-order-card-body">
                  {/* Customer and destination brief */}
                  <div className="order-brief-column">
                    <div className="order-section-title">Customer & Destination</div>
                    <div className="customer-name-row">
                      <strong>{ord.customer?.name || "Customer"}</strong>{" "}
                      {ord.customer?.email ? `(${ord.customer.email})` : ""}
                    </div>
                    {addressString && (
                      <div className="shipping-address-snippet">
                        📍 {addressString}
                      </div>
                    )}
                  </div>

                  {/* Items Ordered */}
                  <div className="order-items-column">
                    <div className="order-section-title">Items ({items.length})</div>
                    <div className="seller-order-items-list">
                      {items.map((item, idx) => {
                        const product = item.productId || {};
                        const variant = item.variantId || {};
                        const attrs = variant.attributes ? Object.entries(variant.attributes) : [];

                        return (
                          <div key={idx} className="seller-order-item-row">
                            <div className="item-title-box">
                              <span className="product-name">{product.name || "Product"}</span>
                              {variant.sku && (
                                <span className="sku-tag mono">{variant.sku}</span>
                              )}
                              {attrs.map(([k, v]) => (
                                <span key={k} className="attr-tag">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                            <div className="item-qty-calc">
                              {item.quantity} × ${Number(item.price).toFixed(2)} ={" "}
                              <strong>${Number(item.subtotal).toFixed(2)}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Financial & Status Actions */}
                  <div className="order-status-action-column">
                    <div className="order-section-title">Your Package Subtotal</div>
                    <div className="seller-subtotal-val">
                      ${Number(sOrder.subtotal || 0).toFixed(2)}
                    </div>

                    <div className="status-transition-box">
                      <span className="transition-label">Transition Status:</span>

                      {allowed.length === 0 ? (
                        <span className="terminal-status-hint">
                          Order is {sOrder.status} (Completed)
                        </span>
                      ) : (
                        <div className="transition-buttons-row">
                          {allowed.map((nextSt) => {
                            const isThisButtonUpdating =
                              updatingAction?.orderId === ord.orderId &&
                              updatingAction?.status === nextSt;

                            return (
                              <button
                                key={nextSt}
                                type="button"
                                className={`btn-transition ${nextSt}`}
                                onClick={() => handleUpdateStatus(ord.orderId, nextSt)}
                                disabled={Boolean(updatingAction)}
                              >
                                {isThisButtonUpdating ? "Updating..." : `Mark as ${nextSt}`}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-view-order-details"
                      onClick={() => handleOpenDetails(ord)}
                    >
                      View Full Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="seller-modal-overlay" role="dialog" aria-modal="true">
          <div className="seller-modal-card wide">
            <div className="seller-modal-header">
              <div>
                <h3>Order Reference: #{selectedOrder.orderId}</h3>
                <p className="seller-modal-subtitle">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            <div className="order-modal-details-grid">
              <div className="detail-panel">
                <h4>👤 Customer Information</h4>
                <p>
                  <strong>Name:</strong> {selectedOrder.customer?.name || "Customer"}
                </p>
                <p>
                  <strong>Email:</strong> {selectedOrder.customer?.email || "N/A"}
                </p>
                {selectedOrder.shippingAddress?.phone && (
                  <p>
                    <strong>Phone:</strong> {selectedOrder.shippingAddress.phone}
                  </p>
                )}
              </div>

              <div className="detail-panel">
                <h4>📍 Shipping Destination</h4>
                {selectedOrder.shippingAddress ? (
                  <div className="address-block">
                    {selectedOrder.shippingAddress.name && (
                      <p>
                        <strong>{selectedOrder.shippingAddress.name}</strong>
                      </p>
                    )}
                    <p>{formatAddress(selectedOrder.shippingAddress)}</p>
                  </div>
                ) : (
                  <p>Standard delivery address</p>
                )}
              </div>

              <div className="detail-panel">
                <h4>💳 Payment & Status</h4>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  <span className={`status-pill ${selectedOrder.paymentStatus}`}>
                    {selectedOrder.paymentStatus}
                  </span>
                </p>
                <p>
                  <strong>Package Status:</strong>{" "}
                  <span className={`status-pill ${selectedOrder.sellerOrder?.status}`}>
                    {selectedOrder.sellerOrder?.status}
                  </span>
                </p>
                <p>
                  <strong>Package Subtotal:</strong>{" "}
                  <strong>${Number(selectedOrder.sellerOrder?.subtotal || 0).toFixed(2)}</strong>
                </p>
              </div>
            </div>

            <div className="order-modal-items-section">
              <h4>📦 Package Line Items</h4>
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU & Variant</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.sellerOrder?.items?.map((it, i) => (
                    <tr key={i}>
                      <td>{it.productId?.name || "Product"}</td>
                      <td className="mono">{it.variantId?.sku || "Standard"}</td>
                      <td>${Number(it.price).toFixed(2)}</td>
                      <td>{it.quantity}</td>
                      <td>
                        <strong>${Number(it.subtotal).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="seller-modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
