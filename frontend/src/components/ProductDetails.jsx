import { useState, useEffect } from "react";
import { api } from "../services/api.js";
import { useNavigation } from "../context/NavigationContext.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProductDetails({ productId }) {
  const { navigate } = useNavigation();
  const { addToCart, isInWishlist, addToWishlist, removeFromWishlist } = useShop();
  const { isAuthenticated, role } = useAuth();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartSubmitting, setCartSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  const showNotification = (message, type = "success") => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Fetch Product Information & Associated Variants
  useEffect(() => {
    let isMounted = true;

    const loadProductData = async () => {
      if (!productId) {
        setError("Invalid product ID.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Product
        const productRes = await api.get(`/products/${productId}`);
        if (!isMounted) return;

        if (productRes && productRes.product) {
          setProduct(productRes.product);
        } else {
          throw new Error("Product data not found");
        }

        // 2. Fetch Variants if available
        try {
          const variantRes = await api.get(`/products/${productId}/variants`);
          if (isMounted && variantRes && Array.isArray(variantRes.variants)) {
            const activeVariants = variantRes.variants.filter((v) => v.isActive !== false);
            setVariants(activeVariants);
            if (activeVariants.length > 0) {
              setSelectedVariant(activeVariants[0]);
            }
          }
        } catch {
          // If variants endpoint is restricted (e.g. requires seller permissions) or product has none,
          // continue cleanly with empty variants list
          if (isMounted) {
            setVariants([]);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load product details:", err);
        setError(
          err.status === 404
            ? "The requested product was not found or is no longer available."
            : err.message || "Failed to load product details."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProductData();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Handle Add to Cart
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (role !== "customer") {
      showNotification("Only customer accounts can add items to cart.", "warning");
      return;
    }

    if (!selectedVariant && variants.length > 0) {
      showNotification("Please select a product variant before adding to cart.", "warning");
      return;
    }

    if (!selectedVariant && variants.length === 0) {
      showNotification("This product currently has no available variants in stock.", "warning");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showNotification("Please specify a valid quantity (at least 1).", "warning");
      return;
    }

    try {
      setCartSubmitting(true);
      await addToCart(product._id, selectedVariant._id, quantity);
      showNotification(`Added ${quantity} item(s) to your cart!`, "success");
    } catch (err) {
      showNotification(err.message || "Could not add to cart. Please check stock.", "danger");
    } finally {
      setCartSubmitting(false);
    }
  };

  // Handle Wishlist Toggle
  const handleToggleWishlist = async () => {
    if (!isAuthenticated || role !== "customer") {
      navigate("/login");
      return;
    }

    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist(product._id);
        showNotification("Removed from wishlist", "info");
      } else {
        await addToWishlist(product._id);
        showNotification("Saved to your wishlist!", "success");
      }
    } catch (err) {
      showNotification(err.message || "Could not update wishlist", "danger");
    }
  };

  // Price calculations
  const discount = product?.discountPercentage || 0;
  const basePrice = selectedVariant?.price !== undefined ? selectedVariant.price : (product?.basePrice || 0);
  const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
  const inWishlist = product ? isInWishlist(product._id) : false;

  if (loading) {
    return (
      <div className="product-details-loading" role="status">
        <div className="auth-spinner large"></div>
        <p>Loading product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-not-found-container">
        <div className="not-found-card">
          <div className="not-found-icon">🔍</div>
          <h2>Product Not Found</h2>
          <p>{error || "The product you requested does not exist."}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/products")}
          >
            ← Back to All Products
          </button>
        </div>
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [];

  return (
    <div className="product-details-page">
      {actionFeedback && (
        <div className={`floating-toast toast-${actionFeedback.type}`} role="status">
          {actionFeedback.message}
        </div>
      )}

      {/* Navigation Breadcrumb */}
      <div className="breadcrumb-bar">
        <button
          type="button"
          className="btn-breadcrumb"
          onClick={() => navigate("/products")}
        >
          ← All Products
        </button>
        {product.categoryId?.name && (
          <span className="breadcrumb-current"> / {product.categoryId.name}</span>
        )}
      </div>

      <div className="product-details-grid">
        {/* Left Column: Image Gallery */}
        <div className="product-gallery">
          <div className="main-image-viewport">
            {images.length > 0 ? (
              <img
                src={images[activeImageIndex] || images[0]}
                alt={product.name}
                className="main-product-image"
              />
            ) : (
              <div className="placeholder-large-image">
                <span>🛍️</span>
                <p>No preview image available</p>
              </div>
            )}
            {discount > 0 && (
              <span className="details-discount-badge">-{discount}% OFF</span>
            )}
          </div>

          {images.length > 1 && (
            <div className="gallery-thumbnail-list">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`thumbnail-btn ${activeImageIndex === idx ? "active" : ""}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info & Purchase Controls */}
        <div className="product-info-panel">
          <div className="product-header-group">
            {product.brand && (
              <span className="product-brand-subtitle">{product.brand}</span>
            )}
            <h1 className="product-detail-title">{product.name}</h1>

            <div className="product-sub-metadata">
              {product.categoryId?.name && (
                <span className="detail-meta-chip">
                  Category: <strong>{product.categoryId.name}</strong>
                </span>
              )}
              {product.storeId?.storeName && (
                <span className="detail-meta-chip">
                  Store: <strong>{product.storeId.storeName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Pricing Row */}
          <div className="detail-price-box">
            <span className="detail-current-price">
              ${finalPrice.toFixed(2)}
            </span>
            {discount > 0 && (
              <>
                <span className="detail-original-price">
                  ${basePrice.toFixed(2)}
                </span>
                <span className="detail-savings">
                  Save ${(basePrice - finalPrice).toFixed(2)} ({discount}%)
                </span>
              </>
            )}
          </div>

          {/* Product Description */}
          <div className="detail-section">
            <h3>Description</h3>
            <p className="detail-description-text">{product.description}</p>
          </div>

          {/* Variants Selector */}
          {variants.length > 0 ? (
            <div className="detail-section">
              <label className="variant-section-label">
                Select Option / Variant:
              </label>
              <div className="variants-grid">
                {variants.map((variant) => {
                  const isSelected = selectedVariant?._id === variant._id;
                  const attributeEntries = variant.attributes
                    ? Object.entries(variant.attributes)
                    : [];

                  return (
                    <button
                      key={variant._id}
                      type="button"
                      className={`variant-option-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedVariant(variant)}
                    >
                      <div className="variant-card-sku">SKU: {variant.sku}</div>
                      <div className="variant-card-price">${Number(variant.price).toFixed(2)}</div>
                      {attributeEntries.length > 0 && (
                        <div className="variant-attributes-pills">
                          {attributeEntries.map(([k, v]) => (
                            <span key={k} className="attr-pill">
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="detail-variant-notice">
              <span className="notice-icon">ℹ️</span>
              <span>This product does not currently have separate variants.</span>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="quantity-controls-wrap">
            <label htmlFor="product-qty-input">Quantity:</label>
            <div className="qty-stepper">
              <button
                type="button"
                className="btn-qty"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                −
              </button>
              <input
                id="product-qty-input"
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) || val < 1 ? 1 : val);
                }}
                className="qty-number-input"
              />
              <button
                type="button"
                className="btn-qty"
                onClick={() => setQuantity((q) => q + 1)}
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="detail-actions-group">
            <button
              type="button"
              className="btn-add-cart-primary"
              onClick={handleAddToCart}
              disabled={cartSubmitting || (variants.length > 0 && !selectedVariant)}
            >
              {cartSubmitting ? (
                <span className="btn-spinner-wrap">
                  <span className="btn-spinner"></span>
                  <span>Adding to Cart...</span>
                </span>
              ) : (
                "🛒 Add to Cart"
              )}
            </button>

            <button
              type="button"
              className={`btn-wishlist-detail ${inWishlist ? "wishlist-active" : ""}`}
              onClick={handleToggleWishlist}
            >
              {inWishlist ? "❤️ Saved in Wishlist" : "🤍 Add to Wishlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
