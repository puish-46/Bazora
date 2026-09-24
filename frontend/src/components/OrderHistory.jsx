import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function OrderHistory() {
  const { navigate } = useNavigation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/orders/my");
        if (!isMounted) return;

        if (res && Array.isArray(res.orders)) {
          setOrders(res.orders);
        } else {
          setOrders([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch order history:", err);
        setError(err.message || "Could not retrieve order history.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="orders-page-container">
      <div className="orders-hero-header">
        <h1>My Orders</h1>
        <p>Track your past purchases, payment statuses, and package deliveries</p>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="products-grid-loading" role="status">
          <div className="auth-spinner large"></div>
          <p>Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-cart-card">
          <div className="empty-icon">📦</div>
          <h2>No Orders Found</h2>
          <p>You haven't placed any orders yet. Start exploring our marketplace today!</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/products")}
          >
            Explore Marketplace Products →
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const itemCount = Array.isArray(order.sellerOrders)
              ? order.sellerOrders.reduce((sum, so) => {
                  const items = Array.isArray(so.items) ? so.items : [];
                  return sum + items.reduce((iSum, i) => iSum + (i.quantity || 1), 0);
                }, 0)
              : 0;

            return (
              <div key={order._id} className="order-history-card">
                <div className="order-card-header">
                  <div className="order-id-group">
                    <span className="order-ref-title">Order Reference:</span>
                    <strong className="order-ref-id mono">#{order._id}</strong>
                  </div>
                  <div className="order-status-group">
                    <span className={`status-pill ${order.paymentStatus}`}>
                      Payment: {order.paymentStatus}
                    </span>
                    <span className={`status-pill ${order.orderStatus}`}>
                      Order: {order.orderStatus}
                    </span>
                  </div>
                </div>

                <div className="order-card-meta-row">
                  <div className="meta-item">
                    <span>Date:</span>{" "}
                    <strong>
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </strong>
                  </div>
                  <div className="meta-item">
                    <span>Total Amount:</span>{" "}
                    <strong>${Number(order.totalAmount).toFixed(2)}</strong>
                  </div>
                  <div className="meta-item">
                    <span>Total Items:</span> <strong>{itemCount}</strong>
                  </div>
                  {order.couponCode && (
                    <div className="meta-item">
                      <span>Coupon:</span>{" "}
                      <span className="coupon-history-tag">{order.couponCode}</span>
                    </div>
                  )}
                </div>

                <div className="order-card-actions">
                  <button
                    type="button"
                    className="btn-view-details"
                    onClick={() => navigate(`/order-confirmation/${order._id}`)}
                  >
                    View Order Confirmation / Receipt →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
