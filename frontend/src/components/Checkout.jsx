import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function Checkout() {
  const { user, isAuthenticated, role } = useAuth();
  const { cart, cartCount, cartSubtotal, cartLoading, fetchCart } = useShop();
  const { navigate } = useNavigation();

  // Shipping Address Form State
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });

  // Coupon State
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [couponError, setCouponError] = useState(null);

  // Checkout & Payment Lifecycle State
  const [formErrors, setFormErrors] = useState({});
  const [checkoutError, setCheckoutError] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Created Order & Mock Payment Modal
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Update name if user details load after mount
  useEffect(() => {
    if (user?.name && !shippingAddress.name) {
      setShippingAddress((prev) => ({ ...prev, name: user.name }));
    }
  }, [user]);

  // Handle address input change
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (checkoutError) setCheckoutError(null);
  };

  // Validate address form
  const validateForm = () => {
    const errors = {};
    const required = [
      { key: "name", label: "Full Name" },
      { key: "phone", label: "Phone Number" },
      { key: "addressLine1", label: "Street Address" },
      { key: "city", label: "City" },
      { key: "state", label: "State / Province" },
      { key: "postalCode", label: "Postal / ZIP Code" },
    ];

    for (const { key, label } of required) {
      if (!shippingAddress[key] || !shippingAddress[key].trim()) {
        errors[key] = `${label} is required`;
      }
    }

    if (shippingAddress.phone && shippingAddress.phone.trim().length < 5) {
      errors.phone = "Please enter a valid contact phone number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Apply Coupon
  const handleApplyCoupon = (e) => {
    e.preventDefault();
    setCouponError(null);
    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setAppliedCoupon(couponInput.trim().toUpperCase());
    setCouponError(null);
  };

  // Handle Remove Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon("");
    setCouponInput("");
    setCouponError(null);
  };

  // Step 1: Create Order using backend /api/orders/checkout
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setCheckoutError(null);
    setPaymentError(null);

    if (cartCount === 0) {
      setCheckoutError("Your cart is empty. Please add items before checking out.");
      return;
    }

    if (!validateForm()) {
      setCheckoutError("Please fill out all required shipping address fields.");
      return;
    }

    try {
      setIsSubmittingOrder(true);

      const payload = {
        shippingAddress: {
          name: shippingAddress.name.trim(),
          phone: shippingAddress.phone.trim(),
          addressLine1: shippingAddress.addressLine1.trim(),
          addressLine2: shippingAddress.addressLine2 ? shippingAddress.addressLine2.trim() : "",
          city: shippingAddress.city.trim(),
          state: shippingAddress.state.trim(),
          postalCode: shippingAddress.postalCode.trim(),
          country: shippingAddress.country ? shippingAddress.country.trim() : "India",
        },
      };

      if (appliedCoupon) {
        payload.couponCode = appliedCoupon;
      }

      const res = await api.post("/orders/checkout", payload);

      if (res && res.success && res.order) {
        setCreatedOrder(res.order);
        // Refresh cart in background since backend clears cart upon checkout
        fetchCart();
      } else {
        throw new Error(res?.message || "Order creation failed");
      }
    } catch (err) {
      console.error("Checkout order creation error:", err);

      // Handle specific coupon errors
      const msg = err.message || "Failed to create order";
      if (
        msg.toLowerCase().includes("coupon") ||
        msg.toLowerCase().includes("minimum order")
      ) {
        setCouponError(msg);
      }

      setCheckoutError(msg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Step 2: Process Mock Payment using backend /api/payments/:orderId/pay
  const handleConfirmMockPayment = async () => {
    if (!createdOrder || !createdOrder._id) return;

    try {
      setIsProcessingPayment(true);
      setPaymentError(null);

      const res = await api.post(`/payments/${createdOrder._id}/pay`);

      if (res && res.success && res.order) {
        // Sync cart state
        await fetchCart();
        // Navigate to Order Confirmation
        navigate(`/order-confirmation/${createdOrder._id}`);
      } else {
        throw new Error(res?.message || "Mock payment failed");
      }
    } catch (err) {
      console.error("Mock payment failed:", err);
      setPaymentError(
        err.message || "Payment processing failed. Please verify order state and try again."
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const items = Array.isArray(cart?.items) ? cart.items : [];

  // Empty cart view
  if (!cartLoading && cartCount === 0 && !createdOrder) {
    return (
      <div className="checkout-page-container">
        <div className="empty-cart-card">
          <div className="empty-icon">🛒</div>
          <h2>Your Cart is Empty</h2>
          <p>You cannot proceed to checkout without items in your cart.</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/products")}
          >
            ← Explore Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-hero-header">
        <h1>Secure Checkout</h1>
        <p>Complete your shipping information and finalize your multi-vendor order</p>
      </div>

      {checkoutError && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <strong>Checkout Error:</strong> {checkoutError}
            {checkoutError.toLowerCase().includes("stock") && (
              <div style={{ marginTop: "0.4rem" }}>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => navigate("/cart")}
                >
                  Return to Cart to adjust quantities →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="checkout-layout-grid">
        {/* Left Column: Shipping Address & Coupon Entry */}
        <div className="checkout-form-column">
          <div className="checkout-card">
            <div className="card-title-bar">
              <span className="step-badge">1</span>
              <h2>Shipping Address</h2>
            </div>

            <form onSubmit={handlePlaceOrder} id="checkout-form" noValidate>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="ship-name">
                    Full Name <span className="req-star">*</span>
                  </label>
                  <input
                    id="ship-name"
                    name="name"
                    type="text"
                    placeholder="Recipient's full name"
                    value={shippingAddress.name}
                    onChange={handleAddressChange}
                    className={formErrors.name ? "input-error" : ""}
                    disabled={isSubmittingOrder || Boolean(createdOrder)}
                    required
                  />
                  {formErrors.name && (
                    <span className="field-error-text">{formErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="ship-phone">
                    Phone Number <span className="req-star">*</span>
                  </label>
                  <input
                    id="ship-phone"
                    name="phone"
                    type="tel"
                    placeholder="e.g. +91 9876543210"
                    value={shippingAddress.phone}
                    onChange={handleAddressChange}
                    className={formErrors.phone ? "input-error" : ""}
                    disabled={isSubmittingOrder || Boolean(createdOrder)}
                    required
                  />
                  {formErrors.phone && (
                    <span className="field-error-text">{formErrors.phone}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ship-address1">
                  Street Address <span className="req-star">*</span>
                </label>
                <input
                  id="ship-address1"
                  name="addressLine1"
                  type="text"
                  placeholder="House/Apartment number, street name"
                  value={shippingAddress.addressLine1}
                  onChange={handleAddressChange}
                  className={formErrors.addressLine1 ? "input-error" : ""}
                  disabled={isSubmittingOrder || Boolean(createdOrder)}
                  required
                />
                {formErrors.addressLine1 && (
                  <span className="field-error-text">{formErrors.addressLine1}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="ship-address2">Apartment, Suite, Unit (Optional)</label>
                <input
                  id="ship-address2"
                  name="addressLine2"
                  type="text"
                  placeholder="Apartment, suite, building, floor, etc."
                  value={shippingAddress.addressLine2}
                  onChange={handleAddressChange}
                  disabled={isSubmittingOrder || Boolean(createdOrder)}
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label htmlFor="ship-city">
                    City <span className="req-star">*</span>
                  </label>
                  <input
                    id="ship-city"
                    name="city"
                    type="text"
                    placeholder="City"
                    value={shippingAddress.city}
                    onChange={handleAddressChange}
                    className={formErrors.city ? "input-error" : ""}
                    disabled={isSubmittingOrder || Boolean(createdOrder)}
                    required
                  />
                  {formErrors.city && (
                    <span className="field-error-text">{formErrors.city}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="ship-state">
                    State / Province <span className="req-star">*</span>
                  </label>
                  <input
                    id="ship-state"
                    name="state"
                    type="text"
                    placeholder="State"
                    value={shippingAddress.state}
                    onChange={handleAddressChange}
                    className={formErrors.state ? "input-error" : ""}
                    disabled={isSubmittingOrder || Boolean(createdOrder)}
                    required
                  />
                  {formErrors.state && (
                    <span className="field-error-text">{formErrors.state}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="ship-postal">
                    Postal / ZIP Code <span className="req-star">*</span>
                  </label>
                  <input
                    id="ship-postal"
                    name="postalCode"
                    type="text"
                    placeholder="Postal code"
                    value={shippingAddress.postalCode}
                    onChange={handleAddressChange}
                    className={formErrors.postalCode ? "input-error" : ""}
                    disabled={isSubmittingOrder || Boolean(createdOrder)}
                    required
                  />
                  {formErrors.postalCode && (
                    <span className="field-error-text">{formErrors.postalCode}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="ship-country">Country</label>
                <input
                  id="ship-country"
                  name="country"
                  type="text"
                  value={shippingAddress.country}
                  onChange={handleAddressChange}
                  disabled={isSubmittingOrder || Boolean(createdOrder)}
                />
              </div>
            </form>
          </div>

          {/* Coupon Entry Card */}
          <div className="checkout-card">
            <div className="card-title-bar">
              <span className="step-badge">2</span>
              <h2>Promotional Coupon</h2>
            </div>
            <p className="card-hint">
              Have a discount code? Enter it below. Your coupon will be validated and applied by
              the backend during order calculation.
            </p>

            {appliedCoupon ? (
              <div className="applied-coupon-chip">
                <div className="coupon-info">
                  <span className="coupon-tag-icon">🏷️</span>
                  <span>
                    Coupon Code: <strong>{appliedCoupon}</strong>
                  </span>
                </div>
                {!createdOrder && (
                  <button
                    type="button"
                    className="btn-remove-coupon"
                    onClick={handleRemoveCoupon}
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="coupon-input-wrap">
                <input
                  type="text"
                  placeholder="e.g. SAVE20, BAZORA10"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value);
                    if (couponError) setCouponError(null);
                  }}
                  className="coupon-text-input"
                  disabled={isSubmittingOrder || Boolean(createdOrder)}
                />
                <button
                  type="submit"
                  className="btn-apply-coupon"
                  disabled={!couponInput.trim() || isSubmittingOrder || Boolean(createdOrder)}
                >
                  Apply
                </button>
              </form>
            )}

            {couponError && (
              <div className="coupon-error-banner" role="alert">
                <span className="alert-icon">⚠️</span>
                <span>{couponError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order Action */}
        <div className="checkout-summary-column">
          <div className="checkout-card summary-sticky-card">
            <h2>Order Review ({cartCount} items)</h2>

            {/* Cart Items List */}
            <div className="checkout-items-preview-list">
              {items.map((item) => {
                const product = item.productId || {};
                const variant = item.variantId || {};
                const unitPrice =
                  variant.price !== undefined ? variant.price : product.basePrice || 0;
                const discount = product.discountPercentage || 0;
                const finalUnitPrice =
                  discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice;
                const itemTotal = finalUnitPrice * (item.quantity || 1);

                return (
                  <div key={item._id} className="checkout-item-preview-row">
                    <div className="item-preview-desc">
                      <div className="item-name" title={product.name}>
                        {product.name || "Product"}
                      </div>
                      <div className="item-meta">
                        {variant.sku && <span>SKU: {variant.sku}</span>}
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="item-preview-price">
                      ${itemTotal.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="summary-divider"></div>

            {/* Pricing Lines */}
            <div className="summary-line-item">
              <span>Cart Subtotal</span>
              <span>${cartSubtotal.toFixed(2)}</span>
            </div>

            {appliedCoupon && (
              <div className="summary-line-item coupon-discount-line">
                <span>Coupon ({appliedCoupon})</span>
                <span className="discount-value">
                  {createdOrder
                    ? `-$${createdOrder.discountAmount.toFixed(2)}`
                    : "Applied on backend"}
                </span>
              </div>
            )}

            <div className="summary-line-item">
              <span>Delivery / Shipping</span>
              <span className="free-shipping-tag">FREE</span>
            </div>

            <div className="summary-divider"></div>

            <div className="summary-total-row">
              <span>Payable Total</span>
              <span className="summary-total-amount">
                ${createdOrder
                  ? createdOrder.totalAmount.toFixed(2)
                  : cartSubtotal.toFixed(2)}
              </span>
            </div>

            {!createdOrder ? (
              <button
                type="submit"
                form="checkout-form"
                className="btn-checkout-primary"
                disabled={isSubmittingOrder || cartCount === 0}
              >
                {isSubmittingOrder ? (
                  <span className="btn-spinner-wrap">
                    <span className="btn-spinner"></span>
                    <span>Validating & Creating Order...</span>
                  </span>
                ) : (
                  "🔒 Place Order & Proceed to Payment"
                )}
              </button>
            ) : (
              <div className="order-created-ready-banner">
                <span className="ready-icon">✓</span>
                <span>Order Created! Proceed to payment below.</span>
              </div>
            )}

            <div className="checkout-trust-badge">
              <span>🛡️ Backend atomic inventory reservation guaranteed</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOCK PAYMENT STEP MODAL / DIALOG
          Triggered upon successful order creation
          ========================================================================= */}
      {createdOrder && (
        <div className="mock-payment-overlay" role="dialog" aria-modal="true">
          <div className="mock-payment-card">
            <div className="mock-payment-header">
              <div className="payment-modal-badge">💳 Mock Payment Gateway</div>
              <h2>Complete Your Payment</h2>
              <p className="payment-subtitle">
                Order <strong>#{createdOrder._id}</strong> has been created and inventory reserved.
              </p>
            </div>

            {paymentError && (
              <div className="alert alert-danger" role="alert">
                <span className="alert-icon">⚠️</span>
                <span>{paymentError}</span>
              </div>
            )}

            <div className="payment-details-box">
              <div className="payment-detail-line">
                <span>Order Total Amount:</span>
                <span className="amount-highlight">
                  ${createdOrder.totalAmount.toFixed(2)}
                </span>
              </div>
              {createdOrder.discountAmount > 0 && (
                <div className="payment-detail-line discount">
                  <span>Coupon Discount Applied:</span>
                  <span>-${createdOrder.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="payment-detail-line">
                <span>Payment Method:</span>
                <span className="method-pill">Mock Simulator</span>
              </div>
              <div className="payment-detail-line">
                <span>Status:</span>
                <span className="status-pill pending">Pending Payment</span>
              </div>
            </div>

            <p className="payment-notice-text">
              This simulated payment transaction interacts with the Bazora backend mock payment
              endpoint. Confirming will verify reserved stock, increment coupon limits, mark the
              order as confirmed, and generate a transaction receipt.
            </p>

            <div className="payment-action-buttons">
              <button
                type="button"
                className="btn-pay-confirm"
                onClick={handleConfirmMockPayment}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <span className="btn-spinner-wrap">
                    <span className="btn-spinner"></span>
                    <span>Processing Mock Payment...</span>
                  </span>
                ) : (
                  `Pay $${createdOrder.totalAmount.toFixed(2)} (Confirm Mock Payment)`
                )}
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => navigate("/orders")}
                disabled={isProcessingPayment}
              >
                Pay Later (View in Orders)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
