import { useState } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function SellerStoreModal({ currentStore, onClose, onSaved }) {
  const isEditing = Boolean(currentStore?._id);

  const [storeName, setStoreName] = useState(currentStore?.storeName || "");
  const [description, setDescription] = useState(currentStore?.description || "");
  const [logo, setLogo] = useState(currentStore?.logo || "");
  const [banner, setBanner] = useState(currentStore?.banner || "");
  const [isActive, setIsActive] = useState(
    currentStore?.isActive !== undefined ? currentStore.isActive : true
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!storeName.trim()) {
      setError("Store name is required.");
      return;
    }

    if (storeName.trim().length > 100) {
      setError("Store name cannot exceed 100 characters.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        storeName: storeName.trim(),
        description: description.trim(),
        logo: logo.trim(),
        banner: banner.trim(),
      };

      if (isEditing) {
        payload.isActive = isActive;
        const res = await api.put("/sellers/store", payload);
        if (res && res.store) {
          onSaved(res.store);
          onClose();
        } else {
          throw new Error(res?.message || "Failed to update store");
        }
      } else {
        const res = await api.post("/sellers/store", payload);
        if (res && res.store) {
          onSaved(res.store);
          onClose();
        } else {
          throw new Error(res?.message || "Failed to create store");
        }
      }
    } catch (err) {
      console.error("Store save error:", err);
      setError(formatApiError(err, "Failed to save storefront configuration."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="seller-modal-overlay" role="dialog" aria-modal="true">
      <div className="seller-modal-card">
        <div className="seller-modal-header">
          <div>
            <h3>{isEditing ? "Configure Storefront" : "Create Your Storefront"}</h3>
            <p className="seller-modal-subtitle">
              {isEditing
                ? "Update your merchant public profile and branding"
                : "Set up your store name and details to start listing products"}
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
          <div className="form-group">
            <label htmlFor="store-name">
              Store Name <span className="req-star">*</span>
            </label>
            <input
              id="store-name"
              type="text"
              placeholder="e.g. Apex Electronics, Modern Living"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              maxLength={100}
              required
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="store-desc">Store Description</label>
            <textarea
              id="store-desc"
              rows={3}
              placeholder="Brief description of your business and product catalog..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              disabled={saving}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="store-logo">Store Logo URL</label>
              <input
                id="store-logo"
                type="url"
                placeholder="https://example.com/logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="store-banner">Store Banner URL</label>
              <input
                id="store-banner"
                type="url"
                placeholder="https://example.com/banner.jpg"
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          {isEditing && (
            <div className="form-checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saving}
                />
                <span>Store is Active (visible to customers)</span>
              </label>
            </div>
          )}

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
              {saving ? "Saving Store..." : isEditing ? "Save Changes" : "Create Storefront"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
