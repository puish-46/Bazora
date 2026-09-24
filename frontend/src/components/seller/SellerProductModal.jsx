import { useState, useEffect } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function SellerProductModal({
  product,
  store,
  categories,
  onClose,
  onSaved,
}) {
  const isEditing = Boolean(product?._id);

  const [name, setName] = useState(product?.name || "");
  const [slug, setSlug] = useState(product?.slug || "");
  const [categoryId, setCategoryId] = useState(
    typeof product?.categoryId === "object"
      ? product?.categoryId?._id
      : product?.categoryId || ""
  );
  const [description, setDescription] = useState(product?.description || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [basePrice, setBasePrice] = useState(
    product?.basePrice !== undefined ? product.basePrice : ""
  );
  const [discountPercentage, setDiscountPercentage] = useState(
    product?.discountPercentage !== undefined ? product.discountPercentage : 0
  );
  const [imagesInput, setImagesInput] = useState(
    Array.isArray(product?.images) ? product.images.join("\n") : ""
  );
  const [status, setStatus] = useState(product?.status || "pending");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-generate slug from name if slug hasn't been manually set on create
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    if (!isEditing && (!slug || slug === generateSlug(name))) {
      setSlug(generateSlug(newName));
    }
  };

  const generateSlug = (str) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!slug.trim()) {
      setError("Product slug is required.");
      return;
    }

    if (!isEditing && !categoryId) {
      setError("Please select a product category.");
      return;
    }

    if (!isEditing && !store?._id) {
      setError("Store configuration missing. Please create a storefront first.");
      return;
    }

    const priceNum = Number(basePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Base price must be a valid non-negative number.");
      return;
    }

    const discountNum = Number(discountPercentage);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      setError("Discount percentage must be between 0 and 100.");
      return;
    }

    // Split image URLs by newline or comma
    const imagesList = imagesInput
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    try {
      setSaving(true);

      if (isEditing) {
        const payload = {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          brand: brand.trim(),
          basePrice: priceNum,
          discountPercentage: discountNum,
          images: imagesList,
          status: status,
        };

        const res = await api.put(`/products/${product._id}`, payload);
        if (res && res.product) {
          onSaved(res.product);
          onClose();
        } else {
          throw new Error(res?.message || "Product update failed.");
        }
      } else {
        const payload = {
          storeId: store._id,
          categoryId: categoryId,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          brand: brand.trim(),
          basePrice: priceNum,
          discountPercentage: discountNum,
          images: imagesList,
          status: status,
        };

        const res = await api.post("/products", payload);
        if (res && res.product) {
          onSaved(res.product);
          onClose();
        } else {
          throw new Error(res?.message || "Product creation failed.");
        }
      }
    } catch (err) {
      console.error("Product submit error:", err);
      setError(
        formatApiError(
          err,
          "Could not save product. Please verify fields and ensure the slug is unique."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="seller-modal-overlay" role="dialog" aria-modal="true">
      <div className="seller-modal-card wide">
        <div className="seller-modal-header">
          <div>
            <h3>{isEditing ? `Edit Product: ${product.name}` : "Create New Product"}</h3>
            <p className="seller-modal-subtitle">
              {isEditing
                ? "Update pricing, descriptions, and catalog status"
                : "List a new product under your verified vendor storefront"}
            </p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="seller-modal-form">
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="prod-name">
                Product Title <span className="req-star">*</span>
              </label>
              <input
                id="prod-name"
                type="text"
                placeholder="e.g. Wireless Noise-Cancelling Headphones"
                value={name}
                onChange={handleNameChange}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-slug">
                URL Slug <span className="req-star">*</span>
              </label>
              <input
                id="prod-slug"
                type="text"
                placeholder="e.g. wireless-noise-cancelling-headphones"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-row-2">
            {!isEditing && (
              <div className="form-group">
                <label htmlFor="prod-cat">
                  Category <span className="req-star">*</span>
                </label>
                <select
                  id="prod-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  disabled={saving}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="prod-brand">Brand</label>
              <input
                id="prod-brand"
                type="text"
                placeholder="e.g. Sony, Apple, Nike"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={saving}
              />
            </div>

            {isEditing && (
              <div className="form-group">
                <label htmlFor="prod-status">Catalog Status</label>
                <select
                  id="prod-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={saving}
                >
                  <option value="pending">Pending Admin Review</option>
                  <option value="draft">Draft (Private)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="prod-price">
                Base Price ($) <span className="req-star">*</span>
              </label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-discount">Discount Percentage (%)</label>
              <input
                id="prod-discount"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="prod-desc">Product Description</label>
            <textarea
              id="prod-desc"
              rows={4}
              placeholder="Detailed description, specifications, and key features..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="prod-images">
              Image URLs (Enter one URL per line or separated by commas)
            </label>
            <textarea
              id="prod-images"
              rows={3}
              placeholder="https://images.example.com/product-1.jpg&#10;https://images.example.com/product-2.jpg"
              value={imagesInput}
              onChange={(e) => setImagesInput(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="seller-modal-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? "Submitting..."
                : isEditing
                ? "Update Product"
                : "Submit Product for Approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
