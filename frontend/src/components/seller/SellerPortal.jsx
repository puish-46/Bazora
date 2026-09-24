import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigation } from "../../context/NavigationContext.jsx";

import SellerOverview from "./SellerOverview.jsx";
import SellerProducts from "./SellerProducts.jsx";
import SellerInventory from "./SellerInventory.jsx";
import SellerOrders from "./SellerOrders.jsx";
import SellerSettlements from "./SellerSettlements.jsx";
import SellerStoreModal from "./SellerStoreModal.jsx";

export default function SellerPortal() {
  const { user } = useAuth();
  const { currentPath, navigate } = useNavigation();

  const [store, setStore] = useState(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);

  // Fetch Seller Store
  const fetchStore = useCallback(async () => {
    setLoadingStore(true);
    try {
      const res = await api.get("/sellers/store");
      if (res && res.store) {
        setStore(res.store);
        setAccountStatus({ approved: true });
      } else {
        setStore(null);
        setAccountStatus({ approved: true });
      }
    } catch (err) {
      if (err.status === 403) {
        setStore(null);
        setAccountStatus({
          pendingApproval: true,
          message: err.message || "Seller account is awaiting administrator approval.",
        });
      } else {
        // 404 means seller has not created a store yet
        setStore(null);
        setAccountStatus({ approved: true });
      }
    } finally {
      setLoadingStore(false);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // Determine active subpath
  let activeTab = "overview";
  if (currentPath.startsWith("/seller/products")) {
    activeTab = "products";
  } else if (currentPath.startsWith("/seller/inventory")) {
    activeTab = "inventory";
  } else if (currentPath.startsWith("/seller/orders")) {
    activeTab = "orders";
  } else if (currentPath.startsWith("/seller/settlements")) {
    activeTab = "settlements";
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case "products":
        return (
          <SellerProducts
            store={store}
            accountStatus={accountStatus}
            onStoreRequested={() => setStoreModalOpen(true)}
          />
        );
      case "inventory":
        return <SellerInventory accountStatus={accountStatus} />;
      case "orders":
        return <SellerOrders accountStatus={accountStatus} />;
      case "settlements":
        return <SellerSettlements accountStatus={accountStatus} />;
      case "overview":
      default:
        return (
          <SellerOverview
            store={store}
            accountStatus={accountStatus}
            onStoreUpdated={(newStore) => setStore(newStore)}
            onRefreshAll={fetchStore}
          />
        );
    }
  };

  return (
    <div className="seller-portal-container">
      {/* Seller Top Navigation Bar */}
      <div className="seller-portal-header">
        <div className="seller-brand-cluster">
          <div className="seller-badge">Seller Center</div>
          <h1>{store ? store.storeName : `Merchant Portal: ${user?.name || "Seller"}`}</h1>
        </div>

        <nav className="seller-nav-tabs" aria-label="Seller Portal Navigation">
          <button
            type="button"
            className={`seller-tab-link ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => navigate("/seller")}
          >
            📊 Dashboard
          </button>
          <button
            type="button"
            className={`seller-tab-link ${activeTab === "products" ? "active" : ""}`}
            onClick={() => navigate("/seller/products")}
          >
            📦 Products
          </button>
          <button
            type="button"
            className={`seller-tab-link ${activeTab === "inventory" ? "active" : ""}`}
            onClick={() => navigate("/seller/inventory")}
          >
            📋 Inventory
          </button>
          <button
            type="button"
            className={`seller-tab-link ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => navigate("/seller/orders")}
          >
            🛒 Orders
          </button>
          <button
            type="button"
            className={`seller-tab-link ${activeTab === "settlements" ? "active" : ""}`}
            onClick={() => navigate("/seller/settlements")}
          >
            💰 Settlements
          </button>
        </nav>
      </div>

      {/* Main View Area */}
      <div className="seller-portal-content">
        {accountStatus?.pendingApproval && (
          <div className="alert alert-warning" role="alert" style={{ marginBottom: "1.5rem" }}>
            <span className="alert-icon">⏳</span>
            <div>
              <strong>Seller Application Pending Approval:</strong>
              <p style={{ margin: "0.25rem 0 0" }}>
                Your vendor application has been received and is awaiting administrator verification. Storefront configuration, product additions, and order fulfillment will activate once your merchant status is approved.
              </p>
            </div>
          </div>
        )}

        {loadingStore ? (
          <div className="seller-loading-box">
            <div className="auth-spinner large"></div>
            <p>Verifying merchant storefront credentials...</p>
          </div>
        ) : (
          renderActiveView()
        )}
      </div>

      {/* Global Store Setup Modal if triggered from any tab */}
      {storeModalOpen && (
        <SellerStoreModal
          currentStore={store}
          onClose={() => setStoreModalOpen(false)}
          onSaved={(updatedStore) => {
            setStore(updatedStore);
            setStoreModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
