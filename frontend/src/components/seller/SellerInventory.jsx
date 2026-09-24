import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "../../services/api.js";

export default function SellerInventory({ accountStatus }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Edit stock modal state
  const [editingItem, setEditingItem] = useState(null); // { variantId, sku, productName, quantity, lowStockThreshold, reservedQuantity }
  const [editQuantity, setEditQuantity] = useState("");
  const [editThreshold, setEditThreshold] = useState("");
  const [savingStock, setSavingStock] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchAllInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch seller's products
      const prodRes = await api.get("/products/my");
      const products = Array.isArray(prodRes?.products) ? prodRes.products : [];

      // 2. Fetch variants for each product
      const inventoryRows = [];

      for (const product of products) {
        try {
          const varRes = await api.get(`/products/${product._id}/variants`);
          const variants = Array.isArray(varRes?.variants) ? varRes.variants : [];

          for (const variant of variants) {
            let inv = null;
            try {
              const invRes = await api.get(`/variants/${variant._id}/inventory`);
              if (invRes && invRes.inventory) {
                inv = invRes.inventory;
              }
            } catch (invErr) {
              // 404 is normal if inventory record hasn't been initialized yet
            }

            inventoryRows.push({
              productId: product._id,
              productName: product.name,
              productImage: product.images?.[0] || null,
              variantId: variant._id,
              sku: variant.sku,
              attributes: variant.attributes || {},
              price: variant.price,
              isActive: variant.isActive,
              inventoryId: inv?._id || null,
              quantity: inv?.quantity !== undefined ? inv.quantity : null,
              reservedQuantity: inv?.reservedQuantity || 0,
              lowStockThreshold: inv?.lowStockThreshold || 5,
            });
          }
        } catch (vErr) {
          console.error(`Failed to fetch variants for product ${product._id}:`, vErr);
        }
      }

      setItems(inventoryRows);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError(formatApiError(err, "Failed to load inventory details."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllInventory();
  }, [fetchAllInventory]);

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditQuantity(item.quantity !== null ? item.quantity : 0);
    setEditThreshold(item.lowStockThreshold || 5);
    setModalError(null);
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    setModalError(null);

    const qty = parseInt(editQuantity, 10);
    const threshold = parseInt(editThreshold, 10);

    if (isNaN(qty) || qty < 0) {
      setModalError("Quantity must be a non-negative integer.");
      return;
    }

    if (isNaN(threshold) || threshold < 0) {
      setModalError("Low stock threshold must be a non-negative integer.");
      return;
    }

    if (qty < editingItem.reservedQuantity) {
      setModalError(
        `Quantity cannot be less than reserved quantity (${editingItem.reservedQuantity}).`
      );
      return;
    }

    try {
      setSavingStock(true);
      const payload = {
        quantity: qty,
        lowStockThreshold: threshold,
      };

      if (editingItem.inventoryId) {
        await api.put(`/variants/${editingItem.variantId}/inventory`, payload);
      } else {
        await api.post(`/variants/${editingItem.variantId}/inventory`, payload);
      }

      setSuccessMsg(`Stock updated for SKU: ${editingItem.sku}`);
      setEditingItem(null);
      await fetchAllInventory();
    } catch (err) {
      console.error("Inventory update error:", err);
      setModalError(formatApiError(err, "Failed to update inventory."));
    } finally {
      setSavingStock(false);
    }
  };

  // Filter & Search logic
  const filteredItems = items.filter((row) => {
    const hasInv = row.quantity !== null;
    const total = hasInv ? row.quantity : 0;
    const reserved = row.reservedQuantity || 0;
    const available = Math.max(0, total - reserved);
    const threshold = row.lowStockThreshold || 5;

    let statusKey = "instock";
    if (!hasInv) statusKey = "uninitialized";
    else if (available === 0) statusKey = "outofstock";
    else if (available <= threshold) statusKey = "lowstock";

    const matchesStatus = statusFilter === "all" || statusKey === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      row.sku?.toLowerCase().includes(q) ||
      row.productName?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="seller-inventory-page">
      <div className="seller-subpage-header">
        <div>
          <h2>Stock & Inventory ({items.length} SKUs)</h2>
          <p className="subpage-subtitle">
            Monitor real-time available quantities, atomic reservations, and low-stock thresholds
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={fetchAllInventory}
          disabled={loading}
        >
          🔄 Refresh Stock
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

      {/* Search & Filter Bar */}
      <div className="seller-table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by SKU or product title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="inv-status-filter">Stock Status:</label>
          <select
            id="inv-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Items ({items.length})</option>
            <option value="instock">In Stock</option>
            <option value="lowstock">Low Stock (≤ Threshold)</option>
            <option value="outofstock">Out of Stock</option>
            <option value="uninitialized">Uninitialized</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="seller-loading-box">
          <div className="auth-spinner large"></div>
          <p>Loading inventory and variant stock levels...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-overview-box large">
          {items.length === 0 ? (
            <>
              <span className="empty-icon-lg">📋</span>
              <h3>No Inventory Items Found</h3>
              <p>
                No variant SKUs are registered under your products yet. Create products and add
                variants to manage inventory.
              </p>
            </>
          ) : (
            <>
              <span className="empty-icon-lg">🔍</span>
              <h3>No Matching Inventory SKUs</h3>
              <p>No inventory items match your current search or stock status filter.</p>
              <button
                type="button"
                className="btn-ghost"
                style={{ marginTop: "1rem" }}
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Search & Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="seller-table-card">
          <table className="seller-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Attributes</th>
                <th>Total Stock</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Threshold</th>
                <th>Stock Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((row) => {
                const hasInv = row.quantity !== null;
                const total = hasInv ? row.quantity : 0;
                const reserved = row.reservedQuantity || 0;
                const available = Math.max(0, total - reserved);
                const threshold = row.lowStockThreshold || 5;

                let statusBadge = (
                  <span className="status-pill confirmed">In Stock</span>
                );

                if (!hasInv) {
                  statusBadge = (
                    <span className="status-pill pending">Uninitialized</span>
                  );
                } else if (available === 0) {
                  statusBadge = (
                    <span className="status-pill failed">Out of Stock</span>
                  );
                } else if (available <= threshold) {
                  statusBadge = (
                    <span className="status-pill processing">Low Stock</span>
                  );
                }

                const attrList = Object.entries(row.attributes || {});

                return (
                  <tr key={row.variantId}>
                    <td>
                      <div className="product-table-cell">
                        <div className="product-mini-thumb">
                          {row.productImage ? (
                            <img src={row.productImage} alt={row.productName} />
                          ) : (
                            <span>🏷️</span>
                          )}
                        </div>
                        <div className="product-cell-info">
                          <strong className="product-cell-title">{row.productName}</strong>
                          <span className="mono bold">{row.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="variant-attributes-tags">
                        {attrList.length > 0
                          ? attrList.map(([k, v]) => (
                              <span key={k} className="attr-tag">
                                {k}: {v}
                              </span>
                            ))
                          : "Standard"}
                      </div>
                    </td>
                    <td>
                      <strong>{hasInv ? total : "—"}</strong>
                    </td>
                    <td>
                      <span className={reserved > 0 ? "text-warning bold" : "text-muted"}>
                        {reserved}
                      </span>
                    </td>
                    <td>
                      <strong className={available === 0 ? "text-danger" : "text-success"}>
                        {hasInv ? available : "—"}
                      </strong>
                    </td>
                    <td>{threshold}</td>
                    <td>{statusBadge}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-action-small primary"
                        onClick={() => handleOpenEdit(row)}
                      >
                        {hasInv ? "Adjust Stock" : "Initialize Stock"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {editingItem && (
        <div className="seller-modal-overlay" role="dialog" aria-modal="true">
          <div className="seller-modal-card">
            <div className="seller-modal-header">
              <div>
                <h3>Adjust Stock: {editingItem.sku}</h3>
                <p className="seller-modal-subtitle">
                  {editingItem.productName}
                </p>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setEditingItem(null)}
                disabled={savingStock}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="alert alert-danger" role="alert">
                <span className="alert-icon">⚠️</span>
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStock} className="seller-modal-form">
              {editingItem.reservedQuantity > 0 && (
                <div className="alert alert-warning" role="alert">
                  <span className="alert-icon">🛡️</span>
                  <span>
                    <strong>{editingItem.reservedQuantity} unit(s)</strong> are currently reserved
                    for active customer checkouts. Total quantity cannot be set lower than this.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="edit-qty">
                  Total Physical Stock Quantity <span className="req-star">*</span>
                </label>
                <input
                  id="edit-qty"
                  type="number"
                  min={editingItem.reservedQuantity || 0}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  required
                  disabled={savingStock}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-threshold">
                  Low Stock Threshold Warning <span className="req-star">*</span>
                </label>
                <input
                  id="edit-threshold"
                  type="number"
                  min="1"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(e.target.value)}
                  required
                  disabled={savingStock}
                />
              </div>

              <div className="seller-modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditingItem(null)}
                  disabled={savingStock}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={savingStock}>
                  {savingStock ? "Saving Stock..." : "Update Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
