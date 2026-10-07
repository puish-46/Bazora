import { useState, useEffect } from "react";
import { api, formatApiError } from "../services/api.js";
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
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cartSubmitting, setCartSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // AI Insights & Summaries State
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiReviewSummary, setAiReviewSummary] = useState(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiActiveTab, setAiActiveTab] = useState("product");

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
        setVariantsLoading(false);
        return;
      }

      // Reset stale states on product change
      setLoading(true);
      setVariantsLoading(true);
      setError(null);
      setProduct(null);
      setVariants([]);
      setSelectedVariant(null);
      setQuantity(1);
      setActiveImageIndex(0);

      try {
        // 1. Fetch Product
        const productRes = await api.get(`/products/${productId}`);
        if (!isMounted) return;

        if (productRes && productRes.product) {
          setProduct(productRes.product);
        } else {
          throw new Error("Product data not found");
        }

        // Product data successfully loaded
        setLoading(false);

        // 2. Fetch Variants with customer authorization & real-time inventory
        try {
          const variantRes = await api.get(`/products/${productId}/variants`);
          if (isMounted) {
            const rawVariants = Array.isArray(variantRes?.variants) ? variantRes.variants : [];
            const activeVariants = rawVariants.filter((v) => v.isActive !== false);
            setVariants(activeVariants);

            if (activeVariants.length > 0) {
              // Automatically pick the first in-stock variant if available
              const firstInStock = activeVariants.find(
                (v) => v.stock === undefined || v.stock > 0
              );
              setSelectedVariant(firstInStock || activeVariants[0]);
            } else {
              setSelectedVariant(null);
            }
          }
        } catch (variantErr) {
          // If variants endpoint is restricted (e.g. unauthenticated or unavailable), continue cleanly
          if (isMounted) {
            console.warn("Variants not accessible or empty for product:", variantErr);
            setVariants([]);
            setSelectedVariant(null);
          }
        } finally {
          if (isMounted) {
            setVariantsLoading(false);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load product details:", err);
        setError(
          err.status === 404
            ? "The requested product was not found or is no longer available."
            : formatApiError(err, "Failed to load product details.")
        );
        setLoading(false);
        setVariantsLoading(false);
      }
    };

    loadProductData();

    return () => {
      isMounted = false;
    };
  }, [productId, isAuthenticated]);

  // Fetch AI Product Summary & Review Summary
  useEffect(() => {
    let isMounted = true;
    if (!productId || !isAuthenticated) {
      setAiSummary(null);
      setAiReviewSummary(null);
      return;
    }

    const fetchAiInsights = async () => {
      setAiSummaryLoading(true);
      setAiReviewLoading(true);

      try {
        const summaryRes = await api.get(`/ai/products/${productId}/summary`);
        if (isMounted && summaryRes) {
          setAiSummary(summaryRes);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("AI Product Summary not available:", err.message);
        }
      } finally {
        if (isMounted) setAiSummaryLoading(false);
      }

      try {
        const reviewRes = await api.get(`/ai/products/${productId}/review-summary`);
        if (isMounted && reviewRes) {
          setAiReviewSummary(reviewRes);
        }
      } catch (err) {
        if (isMounted) {
          console.warn("AI Review Summary not available:", err.message);
        }
      } finally {
        if (isMounted) setAiReviewLoading(false);
      }
    };

    fetchAiInsights();

    return () => {
      isMounted = false;
    };
  }, [productId, isAuthenticated]);

  // Handle Add to Cart
  const handleAddToCart = async () => {
    // Guard against multiple rapid clicks creating duplicate requests
    if (cartSubmitting) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (role !== "customer") {
      showNotification("Only customer accounts can add items to cart.", "warning");
      return;
    }

    if (variantsLoading) {
      showNotification("Please wait while variant options are loading.", "info");
      return;
    }

    if (!selectedVariant && variants.length === 0) {
      showNotification("This product currently has no available options in stock.", "warning");
      return;
    }

    if (!selectedVariant) {
      showNotification("Please select a product variant before adding to cart.", "warning");
      return;
    }

    if (selectedVariant.stock !== undefined && selectedVariant.stock <= 0) {
      showNotification("The selected variant is currently out of stock.", "warning");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showNotification("Please specify a valid quantity (at least 1).", "warning");
      return;
    }

    if (selectedVariant.stock !== undefined && quantity > selectedVariant.stock) {
      showNotification(`Only ${selectedVariant.stock} item(s) available in stock.`, "warning");
      return;
    }

    try {
      setCartSubmitting(true);
      await addToCart(product._id, selectedVariant._id, quantity);
      showNotification(`Added ${quantity} item(s) to your cart!`, "success");
    } catch (err) {
      showNotification(formatApiError(err, "Could not add to cart. Please check stock."), "danger");
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

  // Price and stock calculations
  const discount = product?.discountPercentage || 0;
  const basePrice = selectedVariant?.price !== undefined ? selectedVariant.price : (product?.basePrice || 0);
  const finalPrice = discount > 0 ? basePrice * (1 - discount / 100) : basePrice;
  const inWishlist = product ? isInWishlist(product._id) : false;

  // Selected variant stock and checkout feasibility
  const isOutOfStock = Boolean(
    selectedVariant &&
    selectedVariant.stock !== undefined &&
    selectedVariant.stock <= 0
  );
  const maxAvailable = selectedVariant?.stock !== undefined ? Math.max(1, selectedVariant.stock) : 99;
  const isAddDisabled = Boolean(
    cartSubmitting ||
    variantsLoading ||
    !selectedVariant ||
    isOutOfStock ||
    variants.length === 0
  );

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

          {/* Real-time Variant Stock Indicator */}
          {selectedVariant && (
            <div className="detail-stock-indicator">
              {isOutOfStock ? (
                <span className="stock-status-pill out-of-stock">⚠️ Currently Out of Stock</span>
              ) : selectedVariant.stock !== undefined && selectedVariant.stock <= 5 ? (
                <span className="stock-status-pill low-stock">⚡ Low Stock: Only {selectedVariant.stock} left in stock</span>
              ) : selectedVariant.stock !== undefined ? (
                <span className="stock-status-pill in-stock">✓ In Stock ({selectedVariant.stock} available)</span>
              ) : null}
            </div>
          )}

          {/* Product Description */}
          <div className="detail-section">
            <h3>Description</h3>
            <p className="detail-description-text">{product.description}</p>
          </div>

          {/* Variants Selector */}
          {variantsLoading ? (
            <div className="detail-section">
              <label className="variant-section-label">Options & Variants:</label>
              <div className="variants-loading-state" role="status">
                <span className="btn-spinner"></span>
                <span>Checking available options and stock...</span>
              </div>
            </div>
          ) : variants.length > 0 ? (
            <div className="detail-section">
              <label className="variant-section-label">
                Select Option / Variant:
              </label>
              <div className="variants-grid">
                {variants.map((variant) => {
                  const isSelected = selectedVariant?._id === variant._id;
                  const isVariantOutOfStock = variant.stock !== undefined && variant.stock <= 0;
                  const attributeEntries = variant.attributes
                    ? Object.entries(variant.attributes)
                    : [];

                  return (
                    <button
                      key={variant._id}
                      type="button"
                      className={`variant-option-card ${isSelected ? "selected" : ""} ${isVariantOutOfStock ? "out-of-stock" : ""}`}
                      onClick={() => {
                        setSelectedVariant(variant);
                        // If current quantity exceeds new variant's available stock, clamp it
                        if (variant.stock !== undefined && variant.stock > 0 && quantity > variant.stock) {
                          setQuantity(variant.stock);
                        }
                      }}
                    >
                      <div className="variant-card-sku">SKU: {variant.sku}</div>
                      <div className="variant-card-price">${Number(variant.price).toFixed(2)}</div>
                      {variant.stock !== undefined && (
                        <div className="variant-card-stock">
                          {isVariantOutOfStock ? (
                            <span className="variant-stock-tag out-of-stock">Out of Stock</span>
                          ) : variant.stock <= 5 ? (
                            <span className="variant-stock-tag low-stock">Only {variant.stock} left!</span>
                          ) : (
                            <span className="variant-stock-tag in-stock">In Stock ({variant.stock})</span>
                          )}
                        </div>
                      )}
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
              <span>This product does not currently have separate variants available.</span>
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
                disabled={quantity <= 1 || isOutOfStock}
              >
                −
              </button>
              <input
                id="product-qty-input"
                type="number"
                min="1"
                max={maxAvailable}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (isNaN(val) || val < 1) {
                    setQuantity(1);
                  } else if (selectedVariant?.stock !== undefined && val > selectedVariant.stock) {
                    setQuantity(selectedVariant.stock);
                  } else {
                    setQuantity(val);
                  }
                }}
                disabled={isOutOfStock}
                className="qty-number-input"
              />
              <button
                type="button"
                className="btn-qty"
                onClick={() => setQuantity((q) => {
                  if (selectedVariant?.stock !== undefined) {
                    return Math.min(selectedVariant.stock, q + 1);
                  }
                  return q + 1;
                })}
                disabled={isOutOfStock || (selectedVariant?.stock !== undefined && quantity >= selectedVariant.stock)}
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
              disabled={isAddDisabled}
            >
              {cartSubmitting ? (
                <span className="btn-spinner-wrap">
                  <span className="btn-spinner"></span>
                  <span>Adding to Cart...</span>
                </span>
              ) : variantsLoading ? (
                <span>Loading Options...</span>
              ) : isOutOfStock ? (
                <span>Out of Stock</span>
              ) : variants.length === 0 ? (
                <span>Currently Unavailable</span>
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

      {/* =====================================================================
          AI INSIGHTS & SUMMARIES (Phase 5 & Phase 6)
          ===================================================================== */}
      <section className="product-ai-insights-section">
        <div className="ai-insights-header-row">
          <div className="ai-insights-title-wrap">
            <div className="ai-insights-pill">
              <span className="graph-node-pip"></span>
              <span className="ai-insights-pill-text">// BAZORA INTELLIGENCE // PRODUCT INSIGHTS</span>
            </div>
            <h2 className="ai-insights-title">AI Product Analysis & Customer Sentiment</h2>
          </div>

          <div className="ai-insights-tab-buttons">
            <button
              type="button"
              className={`ai-tab-btn ${aiActiveTab === "product" ? "active" : ""}`}
              onClick={() => setAiActiveTab("product")}
            >
              <span>✨</span>
              <span>AI Product Summary</span>
            </button>
            <button
              type="button"
              className={`ai-tab-btn ${aiActiveTab === "reviews" ? "active" : ""}`}
              onClick={() => setAiActiveTab("reviews")}
            >
              <span>💬</span>
              <span>AI Review Analysis</span>
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="ai-insights-auth-card">
            <span className="ai-auth-icon">🔒</span>
            <div className="ai-auth-text">
              <h4>Sign in for Bazora AI Insights</h4>
              <p>Sign in to your customer account to view instant AI summaries, ideal use-case matching, and synthesized customer reviews for this product.</p>
            </div>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => navigate("/login")}
            >
              Sign In to View
            </button>
          </div>
        ) : (
          <div className="ai-insights-content-card">
            {aiActiveTab === "product" ? (
              aiSummaryLoading ? (
                <div className="ai-loading-box">
                  <span className="btn-spinner"></span>
                  <p>Synthesizing product specifications and highlights with Bazora AI...</p>
                </div>
              ) : aiSummary ? (
                <div className="ai-summary-details">
                  <div className="ai-summary-overview">
                    <span className="overview-sparkle">💡</span>
                    <p className="overview-text">{aiSummary.summary}</p>
                  </div>

                  <div className="ai-summary-triad">
                    {/* Good for */}
                    <div className="ai-triad-card good-for">
                      <div className="triad-card-header">
                        <span className="triad-icon">🎯</span>
                        <h4>Good for:</h4>
                      </div>
                      {Array.isArray(aiSummary.goodFor) && aiSummary.goodFor.length > 0 ? (
                        <ul className="triad-list">
                          {aiSummary.goodFor.map((item, idx) => (
                            <li key={idx}>✓ {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="triad-empty">General everyday use</p>
                      )}
                    </div>

                    {/* Highlights */}
                    <div className="ai-triad-card highlights">
                      <div className="triad-card-header">
                        <span className="triad-icon">⭐</span>
                        <h4>Highlights:</h4>
                      </div>
                      {Array.isArray(aiSummary.highlights) && aiSummary.highlights.length > 0 ? (
                        <ul className="triad-list">
                          {aiSummary.highlights.map((item, idx) => (
                            <li key={idx}>✓ {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="triad-empty">Quality verified product listing</p>
                      )}
                    </div>

                    {/* Potential concerns */}
                    <div className="ai-triad-card concerns">
                      <div className="triad-card-header">
                        <span className="triad-icon">⚠️</span>
                        <h4>Potential concerns:</h4>
                      </div>
                      {Array.isArray(aiSummary.concerns) && aiSummary.concerns.length > 0 ? (
                        <ul className="triad-list">
                          {aiSummary.concerns.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="triad-empty">No common concerns identified</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ai-empty-box">
                  <span className="empty-sparkle">ℹ️</span>
                  <p>Product summary is currently unavailable. Review factual description above.</p>
                </div>
              )
            ) : (
              aiReviewLoading ? (
                <div className="ai-loading-box">
                  <span className="btn-spinner"></span>
                  <p>Analyzing customer reviews with Bazora AI...</p>
                </div>
              ) : aiReviewSummary ? (
                <div className="ai-review-analysis">
                  {aiReviewSummary.reviewCount === 0 || !aiReviewSummary.positivePoints?.length ? (
                    <div className="ai-empty-box">
                      <span className="empty-sparkle">📝</span>
                      <p>{aiReviewSummary.summary || "Not enough customer reviews to generate a reliable summary yet."}</p>
                    </div>
                  ) : (
                    <>
                      <div className="ai-summary-overview">
                        <span className="overview-sparkle">💬</span>
                        <p className="overview-text">{aiReviewSummary.summary}</p>
                      </div>

                      <div className="ai-review-split">
                        <div className="review-split-card likes">
                          <div className="split-header">
                            <span className="split-icon">👍</span>
                            <h4>Customers generally like:</h4>
                          </div>
                          <ul className="split-list">
                            {aiReviewSummary.positivePoints.map((pt, idx) => (
                              <li key={idx}>✓ {pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="review-split-card concerns">
                          <div className="split-header">
                            <span className="split-icon">👎</span>
                            <h4>Common concern:</h4>
                          </div>
                          {aiReviewSummary.negativePoints && aiReviewSummary.negativePoints.length > 0 ? (
                            <ul className="split-list">
                              {aiReviewSummary.negativePoints.map((pt, idx) => (
                                <li key={idx}>• {pt}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="split-empty">No frequent negative issues reported</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="ai-empty-box">
                  <span className="empty-sparkle">📝</span>
                  <p>Not enough customer reviews to generate a reliable summary yet.</p>
                </div>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}
