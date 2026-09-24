import { useState } from "react";
import { useShop } from "../context/ShopContext.jsx";
import { useNavigation } from "../context/NavigationContext.jsx";

export default function Wishlist() {
  const { wishlist, wishlistLoading, wishlistError, removeFromWishlist, fetchWishlist } = useShop();
  const { navigate } = useNavigation();
  const [removingId, setRemovingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (message, type = "info") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRemove = async (productId, productName) => {
    try {
      setRemovingId(productId);
      await removeFromWishlist(productId);
      showFeedback(`Removed "${productName}" from wishlist`);
    } catch (err) {
      showFeedback(err.message || "Failed to remove item", "danger");
    } finally {
      setRemovingId(null);
    }
  };

  const products = Array.isArray(wishlist?.products) ? wishlist.products : [];

  return (
    <div className="wishlist-page-container">
      <div className="wishlist-hero-header">
        <div className="wishlist-title-wrap">
          <span className="wishlist-header-icon">❤️</span>
          <h1>My Wishlist</h1>
        </div>
        <p className="wishlist-subtitle">
          Saved products you're interested in purchasing later
        </p>
      </div>

      {feedback && (
        <div className={`floating-toast toast-${feedback.type}`} role="status">
          {feedback.message}
        </div>
      )}

      {wishlistError && (
        <div className="alert alert-danger" role="alert">
          <span className="alert-icon">⚠️</span>
          <span>{wishlistError}</span>
        </div>
      )}

      {wishlistLoading ? (
        <div className="products-grid-loading" role="status">
          <div className="auth-spinner large"></div>
          <p>Loading your saved wishlist items...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-wishlist-card">
          <div className="empty-icon">🤍</div>
          <h3>Your Wishlist is Empty</h3>
          <p>
            You haven't added any products to your wishlist yet. Explore our marketplace and
            click the heart icon to save products here!
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/products")}
          >
            Explore Marketplace Products →
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {products.map((product) => {
            if (!product || typeof product !== "object") return null;

            const discount = product.discountPercentage || 0;
            const originalPrice = product.basePrice || 0;
            const finalPrice =
              discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
            const imageUrl = product.images?.[0];

            return (
              <div key={product._id} className="wishlist-card">
                <div
                  className="wishlist-image-wrap"
                  onClick={() => navigate(`/products/${product._id}`)}
                  role="button"
                  tabIndex={0}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="wishlist-thumb-img"
                    />
                  ) : (
                    <div className="wishlist-placeholder-img">
                      <span>🛍️</span>
                    </div>
                  )}

                  {discount > 0 && (
                    <span className="product-discount-tag">-{discount}%</span>
                  )}
                </div>

                <div className="wishlist-card-body">
                  <div className="product-meta-row">
                    {product.brand && (
                      <span className="product-brand-tag">{product.brand}</span>
                    )}
                    {product.categoryId?.name && (
                      <span className="product-category-pill">
                        {product.categoryId.name}
                      </span>
                    )}
                  </div>

                  <h3
                    className="wishlist-card-title"
                    onClick={() => navigate(`/products/${product._id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    {product.name}
                  </h3>

                  {product.storeId?.storeName && (
                    <p className="product-store-text">
                      Store: <strong>{product.storeId.storeName}</strong>
                    </p>
                  )}

                  <div className="wishlist-price-row">
                    <div className="price-stack">
                      <span className="current-price">
                        ${finalPrice.toFixed(2)}
                      </span>
                      {discount > 0 && (
                        <span className="original-price">
                          ${originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="wishlist-actions-footer">
                    <button
                      type="button"
                      className="btn-view-details"
                      onClick={() => navigate(`/products/${product._id}`)}
                    >
                      View Product
                    </button>
                    <button
                      type="button"
                      className="btn-remove-wishlist"
                      onClick={() => handleRemove(product._id, product.name)}
                      disabled={removingId === product._id}
                      title="Remove from wishlist"
                    >
                      {removingId === product._id ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
