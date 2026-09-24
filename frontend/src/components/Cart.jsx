import { useState } from "react";
import { useShop } from "../context/ShopContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function Cart() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    cartLoading,
    cartError,
    updateCartItem,
    removeCartItem,
    clearCart,
  } = useShop();

  const { navigate } = useNavigation();

  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);
  const [clearingCart, setClearingCart] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (message, type = "info") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const items = Array.isArray(cart?.items) ? cart.items : [];

  const handleQuantityChange = async (itemId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    try {
      setUpdatingItemId(itemId);
      await updateCartItem(itemId, newQty);
    } catch (err) {
      showFeedback(err.message || "Failed to update item quantity", "danger");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleManualQtyChange = async (itemId, val) => {
    const qty = parseInt(val, 10);
    if (isNaN(qty) || qty < 1) return;

    try {
      setUpdatingItemId(itemId);
      await updateCartItem(itemId, qty);
    } catch (err) {
      showFeedback(err.message || "Failed to update item quantity", "danger");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (itemId, productName) => {
    try {
      setRemovingItemId(itemId);
      await removeCartItem(itemId);
      showFeedback(`Removed "${productName}" from your cart`);
    } catch (err) {
      showFeedback(err.message || "Could not remove item from cart", "danger");
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm("Are you sure you want to remove all items from your cart?")) {
      return;
    }

    try {
      setClearingCart(true);
      await clearCart();
      showFeedback("Your cart has been cleared");
    } catch (err) {
      showFeedback(err.message || "Could not clear cart", "danger");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <div className="cart-page-container">
      <div className="cart-hero-header">
        <div className="cart-title-wrap">
          <span className="cart-header-icon">🛒</span>
          <h1>Shopping Cart</h1>
        </div>
        <p className="cart-subtitle">
          Review your selected items, modify quantities, and proceed to checkout
        </p>
      </div>

      {feedback && (
        <div className={`floating-toast toast-${feedback.type}`} role="status">
          {feedback.message}
        </div>
      )}

      {cartError && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{cartError}</span>
        </div>
      )}

      {cartLoading && items.length === 0 ? (
        <div className="products-grid-loading" role="status">
          <div className="auth-spinner large"></div>
          <p>Loading your shopping cart...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-cart-card">
          <div className="empty-icon">🛒</div>
          <h3>Your Shopping Cart is Empty</h3>
          <p>
            You don't have any items in your cart yet. Explore our catalog and discover
            exciting products from verified marketplace sellers!
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/products")}
          >
            Start Shopping →
          </button>
        </div>
      ) : (
        <div className="cart-layout-grid">
          {/* Left Column: Cart Items List */}
          <div className="cart-items-section">
            <div className="cart-items-header">
              <span className="items-count-heading">
                {cartCount} Item{cartCount !== 1 ? "s" : ""}
              </span>
              <button
                type="button"
                className="btn-clear-cart"
                onClick={handleClearCart}
                disabled={clearingCart}
              >
                {clearingCart ? "Clearing..." : "Clear Cart"}
              </button>
            </div>

            <div className="cart-items-list">
              {items.map((item) => {
                const product = item.productId || {};
                const variant = item.variantId || {};
                const discount = product.discountPercentage || 0;
                const unitPrice =
                  variant.price !== undefined
                    ? variant.price
                    : product.basePrice || 0;
                const finalUnitPrice =
                  discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice;
                const itemTotal = finalUnitPrice * (item.quantity || 1);
                const isUpdating = updatingItemId === item._id;
                const isRemoving = removingItemId === item._id;
                const imageUrl = product.images?.[0];

                const attributeEntries = variant.attributes
                  ? Object.entries(variant.attributes)
                  : [];

                return (
                  <div key={item._id} className="cart-item-row">
                    <div
                      className="cart-item-image-wrap"
                      onClick={() =>
                        product._id && navigate(`/products/${product._id}`)
                      }
                      role="button"
                      tabIndex={0}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.name || "Product"}
                          className="cart-thumb-img"
                        />
                      ) : (
                        <div className="cart-placeholder-img">
                          <span>🛍️</span>
                        </div>
                      )}
                    </div>

                    <div className="cart-item-details">
                      <h4
                        className="cart-item-title"
                        onClick={() =>
                          product._id && navigate(`/products/${product._id}`)
                        }
                        role="button"
                        tabIndex={0}
                      >
                        {product.name || "Product Item"}
                      </h4>

                      <div className="cart-variant-info">
                        {variant.sku && (
                          <span className="cart-sku-tag">SKU: {variant.sku}</span>
                        )}
                        {attributeEntries.map(([k, v]) => (
                          <span key={k} className="cart-attr-tag">
                            {k}: {v}
                          </span>
                        ))}
                      </div>

                      <div className="cart-unit-price">
                        Unit Price: <strong>${finalUnitPrice.toFixed(2)}</strong>
                        {discount > 0 && (
                          <span className="cart-original-unit">
                            ${unitPrice.toFixed(2)} (-{discount}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="cart-item-quantity-box">
                      <div className="qty-stepper small">
                        <button
                          type="button"
                          className="btn-qty"
                          onClick={() =>
                            handleQuantityChange(item._id, item.quantity, -1)
                          }
                          disabled={item.quantity <= 1 || isUpdating}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={item.quantity}
                          onChange={(e) =>
                            handleManualQtyChange(item._id, e.target.value)
                          }
                          disabled={isUpdating}
                          className="qty-number-input"
                        />
                        <button
                          type="button"
                          className="btn-qty"
                          onClick={() =>
                            handleQuantityChange(item._id, item.quantity, 1)
                          }
                          disabled={isUpdating}
                        >
                          +
                        </button>
                      </div>
                      {isUpdating && <span className="updating-hint">Updating...</span>}
                    </div>

                    {/* Item Total & Remove */}
                    <div className="cart-item-subtotal-box">
                      <div className="cart-item-total">
                        ${itemTotal.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        className="btn-remove-item"
                        onClick={() => handleRemoveItem(item._id, product.name)}
                        disabled={isRemoving}
                        title="Remove item"
                      >
                        {isRemoving ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-actions-bottom">
              <button
                type="button"
                className="btn-continue-shopping"
                onClick={() => navigate("/products")}
              >
                ← Continue Shopping
              </button>
            </div>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="cart-summary-section">
            <div className="order-summary-card">
              <h3>Order Summary</h3>

              <div className="summary-line-item">
                <span>Subtotal ({cartCount} items)</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>

              <div className="summary-line-item">
                <span>Shipping Estimate</span>
                <span className="free-shipping-tag">Calculated at Checkout</span>
              </div>

              <div className="summary-line-item">
                <span>Tax</span>
                <span>Included / Estimated</span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total-row">
                <span>Estimated Total</span>
                <span className="summary-total-amount">
                  ${cartSubtotal.toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                className="btn-checkout-primary"
                onClick={() => {
                  if (cartCount > 0) {
                    navigate("/checkout");
                  } else {
                    showFeedback("Your cart is empty. Please add items before checkout.", "warning");
                  }
                }}
              >
                Proceed to Checkout →
              </button>

              <div className="checkout-trust-badge">
                <span>🔒 Secure 256-bit SSL encrypted transaction</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
