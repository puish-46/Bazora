import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function OrderConfirmation({ orderId }) {
  const { navigate } = useNavigation();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrderDetails = async () => {
      if (!orderId) {
        setError("Invalid order ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/orders/${orderId}`);
        if (!isMounted) return;

        if (res && res.order) {
          setOrder(res.order);
        } else {
          throw new Error("Order not found");
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load order confirmation details:", err);
        setError(
          err.status === 404
            ? "Order not found. Please verify the order reference."
            : err.message || "Failed to load order details"
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrderDetails();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="order-confirmation-loading" role="status">
        <div className="auth-spinner large"></div>
        <p>Loading order confirmation details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="order-confirmation-container">
        <div className="confirmation-error-card">
          <div className="not-found-icon">⚠️</div>
          <h2>Unable to Load Order</h2>
          <p>{error || "The requested order could not be located."}</p>
          <div className="confirmation-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate("/orders")}
            >
              Go to Order History
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate("/products")}
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { shippingAddress } = order;
  const sellerOrders = Array.isArray(order.sellerOrders) ? order.sellerOrders : [];

  return (
    <div className="order-confirmation-container">
      {/* Success Hero Header */}
      <div className="confirmation-hero">
        <div className="confirmation-icon-badge">🎉</div>
        <h1>Order Confirmed!</h1>
        <p className="confirmation-subtitle">
          Thank you for your purchase. Your order has been placed and payment has been processed.
        </p>
      </div>

      <div className="confirmation-card">
        {/* Order Quick Metadata Bar */}
        <div className="confirmation-meta-bar">
          <div className="meta-col">
            <span className="meta-label">Order Number</span>
            <span className="meta-val mono">#{order._id}</span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Date Placed</span>
            <span className="meta-val">
              {new Date(order.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Payment Status</span>
            <span className={`status-pill ${order.paymentStatus}`}>
              {order.paymentStatus.toUpperCase()}
            </span>
          </div>
          <div className="meta-col">
            <span className="meta-label">Order Status</span>
            <span className={`status-pill ${order.orderStatus}`}>
              {order.orderStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Transaction Details (Mock Payment Reference) */}
        {order.transactionId && (
          <div className="transaction-banner">
            <span>Transaction Reference:</span>
            <code className="mono">{order.transactionId}</code>
            <span className="payment-method-chip">Method: {order.paymentMethod || "mock"}</span>
          </div>
        )}

        <div className="confirmation-body-grid">
          {/* Left Column: Multi-Vendor Items Ordered */}
          <div className="confirmation-items-column">
            <h3>Ordered Items</h3>

            {sellerOrders.map((sellerOrder, sIdx) => {
              const sellerName =
                sellerOrder.sellerId?.businessName ||
                sellerOrder.sellerId?.businessEmail ||
                `Vendor ${sIdx + 1}`;

              const items = Array.isArray(sellerOrder.items) ? sellerOrder.items : [];

              return (
                <div key={sIdx} className="seller-suborder-box">
                  <div className="seller-suborder-header">
                    <span className="vendor-icon">🏪</span>
                    <span className="vendor-title">Package from: <strong>{sellerName}</strong></span>
                    <span className={`status-pill small ${sellerOrder.status || "confirmed"}`}>
                      {sellerOrder.status || "confirmed"}
                    </span>
                  </div>

                  <div className="suborder-items-list">
                    {items.map((item, iIdx) => {
                      const product = item.productId || {};
                      const variant = item.variantId || {};
                      const imageUrl = product.images?.[0];
                      const attributes = variant.attributes
                        ? Object.entries(variant.attributes)
                        : [];

                      return (
                        <div key={iIdx} className="confirmation-item-row">
                          <div className="item-thumbnail">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.name || "Item"} />
                            ) : (
                              <span>🛍️</span>
                            )}
                          </div>

                          <div className="item-info">
                            <div className="item-name">{product.name || "Product"}</div>
                            <div className="item-variant-line">
                              {variant.sku && <span>SKU: {variant.sku}</span>}
                              {attributes.map(([k, v]) => (
                                <span key={k} className="attr-tag">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                            <div className="item-qty-price">
                              {item.quantity} × ${Number(item.price).toFixed(2)}
                            </div>
                          </div>

                          <div className="item-subtotal">
                            ${Number(item.subtotal || item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Shipping & Payment Summary */}
          <div className="confirmation-summary-column">
            {/* Shipping Info */}
            <div className="info-sub-card">
              <h4>📍 Shipping Destination</h4>
              {shippingAddress ? (
                <div className="address-display">
                  <p className="recipient-name">
                    <strong>{shippingAddress.name}</strong>
                  </p>
                  <p>{shippingAddress.addressLine1}</p>
                  {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                  <p>
                    {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                  </p>
                  <p>{shippingAddress.country || "India"}</p>
                  <p className="phone-line">📞 {shippingAddress.phone}</p>
                </div>
              ) : (
                <p className="text-muted">Standard Shipping Address</p>
              )}
            </div>

            {/* Cost Breakdown */}
            <div className="info-sub-card">
              <h4>💰 Cost Breakdown</h4>
              <div className="cost-breakdown-list">
                {order.discountAmount > 0 && order.couponCode && (
                  <div className="cost-line discount">
                    <span>Coupon ({order.couponCode})</span>
                    <span>-${Number(order.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="cost-line">
                  <span>Shipping</span>
                  <span className="free-shipping-tag">FREE</span>
                </div>
                <div className="summary-divider"></div>
                <div className="cost-line total">
                  <span>Total Amount Paid</span>
                  <span className="total-val">${Number(order.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="confirmation-footer-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/orders")}
          >
            📋 View My Orders
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/products")}
          >
            ← Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
