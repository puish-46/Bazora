import { useState, useEffect } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function SellerVariantModal({ product, onClose, onVariantsChanged }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New variant form state
  const [isAdding, setIsAdding] = useState(false);
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState(product?.basePrice || "");
  const [attrKey, setAttrKey] = useState("size");
  const [attrVal, setAttrVal] = useState("");
  const [additionalAttrs, setAdditionalAttrs] = useState([]); // [{ key: '', val: '' }]
  const [imageUrls, setImageUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState(null);

  // Load variants
  const fetchVariants = async () => {
    if (!product?._id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/products/${product._id}/variants`);
      if (res && Array.isArray(res.variants)) {
        setVariants(res.variants);
      } else {
        setVariants([]);
      }
    } catch (err) {
      console.error("Failed to fetch product variants:", err);
      setError(formatApiError(err, "Failed to load variants."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariants();
  }, [product]);

  const handleAddAttributePair = () => {
    setAdditionalAttrs([...additionalAttrs, { key: "", val: "" }]);
  };

  const handleUpdateAttr = (idx, field, value) => {
    const updated = [...additionalAttrs];
    updated[idx][field] = value;
    setAdditionalAttrs(updated);
  };

  const handleRemoveAttr = (idx) => {
    setAdditionalAttrs(additionalAttrs.filter((_, i) => i !== idx));
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!sku.trim()) {
      setError("Variant SKU is required.");
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Price must be a valid non-negative number.");
      return;
    }

    // Build attributes object
    const attributes = {};
    if (attrKey.trim() && attrVal.trim()) {
      attributes[attrKey.trim()] = attrVal.trim();
    }
    for (const pair of additionalAttrs) {
      if (pair.key.trim() && pair.val.trim()) {
        attributes[pair.key.trim()] = pair.val.trim();
      }
    }

    const images = imageUrls
      .split(/[\n,]/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    try {
      setSubmitting(true);
      const res = await api.post(`/products/${product._id}/variants`, {
        sku: sku.trim(),
        price: priceNum,
        attributes,
        images,
      });

      if (res && res.variant) {
        setSuccessMsg(`Variant ${res.variant.sku} created!`);
        // Reset form
        setSku("");
        setAttrVal("");
        setAdditionalAttrs([]);
        setImageUrls("");
        setIsAdding(false);
        await fetchVariants();
        if (onVariantsChanged) onVariantsChanged();
      } else {
        throw new Error(res?.message || "Failed to create variant");
      }
    } catch (err) {
      console.error("Variant create error:", err);
      setError(
        formatApiError(err, "Failed to create variant. Check if SKU is unique.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId, variantSku) => {
    if (deletingVariantId || submitting) return;
    if (!window.confirm(`Are you sure you want to delete variant ${variantSku}?`)) return;

    setError(null);
    setSuccessMsg(null);
    setDeletingVariantId(variantId);

    try {
      await api.delete(`/products/${product._id}/variants/${variantId}`);
      setSuccessMsg(`Variant ${variantSku} removed successfully.`);
      await fetchVariants();
      if (onVariantsChanged) onVariantsChanged();
    } catch (err) {
      console.error("Variant delete error:", err);
      setError(formatApiError(err, "Failed to delete variant."));
    } finally {
      setDeletingVariantId(null);
    }
  };

  return (
    <div className="seller-modal-overlay" role="dialog" aria-modal="true">
      <div className="seller-modal-card wide">
        <div className="seller-modal-header">
          <div>
            <h3>Manage Variants: {product.name}</h3>
            <p className="seller-modal-subtitle">
              Configure SKUs, pricing variations, and attributes (colors, sizes, storage)
            </p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            disabled={submitting || Boolean(deletingVariantId)}
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

        {successMsg && (
          <div className="alert alert-success" role="alert">
            <span className="alert-icon">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        <div className="variant-modal-actions-bar">
          <button
            type="button"
            className="btn-primary small"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? "✕ Cancel Add Variant" : "+ Add New Variant"}
          </button>
        </div>

        {/* Add Variant Form */}
        {isAdding && (
          <form onSubmit={handleCreateVariant} className="variant-create-form-box">
            <h4>Add New SKU Variant</h4>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="var-sku">
                  SKU Code <span className="req-star">*</span>
                </label>
                <input
                  id="var-sku"
                  type="text"
                  placeholder="e.g. WH-1000XM4-BLK"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="var-price">
                  Variant Price ($) <span className="req-star">*</span>
                </label>
                <input
                  id="var-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="attr-k">Attribute Name</label>
                <input
                  id="attr-k"
                  type="text"
                  placeholder="e.g. Color, Size, Capacity"
                  value={attrKey}
                  onChange={(e) => setAttrKey(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label htmlFor="attr-v">Attribute Value</label>
                <input
                  id="attr-v"
                  type="text"
                  placeholder="e.g. Midnight Black, 256GB"
                  value={attrVal}
                  onChange={(e) => setAttrVal(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            {additionalAttrs.map((pair, idx) => (
              <div key={idx} className="form-row-2" style={{ marginTop: "0.5rem" }}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Attribute Name"
                    value={pair.key}
                    onChange={(e) => handleUpdateAttr(idx, "key", e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group" style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Attribute Value"
                    value={pair.val}
                    onChange={(e) => handleUpdateAttr(idx, "val", e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="btn-danger-icon"
                    onClick={() => handleRemoveAttr(idx)}
                    disabled={submitting}
                    title="Remove attribute"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="btn-link-sub"
              onClick={handleAddAttributePair}
              disabled={submitting}
            >
              + Add Another Attribute
            </button>

            <div className="form-group" style={{ marginTop: "0.75rem" }}>
              <label htmlFor="var-images">Variant Images (URLs separated by comma)</label>
              <input
                id="var-images"
                type="text"
                placeholder="https://example.com/variant-photo.jpg"
                value={imageUrls}
                onChange={(e) => setImageUrls(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="form-actions-right" style={{ marginTop: "1rem" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? "Saving Variant..." : "Save Variant"}
              </button>
            </div>
          </form>
        )}

        {/* Existing Variants List */}
        <div className="variants-list-table-wrap">
          {loading ? (
            <div className="seller-loading-box">
              <div className="auth-spinner"></div>
              <p>Loading variants...</p>
            </div>
          ) : variants.length === 0 ? (
            <div className="empty-overview-box">
              <p>No variants registered for this product. Click "+ Add New Variant" to create one.</p>
            </div>
          ) : (
            <table className="seller-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Attributes</th>
                  <th>Price</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const attrs = v.attributes ? Object.entries(v.attributes) : [];
                  return (
                    <tr key={v._id}>
                      <td className="mono">
                        <strong>{v.sku}</strong>
                      </td>
                      <td>
                        <div className="variant-attributes-tags">
                          {attrs.map(([k, val]) => (
                            <span key={k} className="attr-tag">
                              {k}: {val}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong>${Number(v.price).toFixed(2)}</strong>
                      </td>
                      <td>
                        <span className={`status-pill small ${v.isActive ? "confirmed" : "failed"}`}>
                          {v.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-danger-text"
                          onClick={() => handleDeleteVariant(v._id, v.sku)}
                          disabled={deletingVariantId === v._id}
                        >
                          {deletingVariantId === v._id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="seller-modal-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            disabled={submitting || Boolean(deletingVariantId)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
