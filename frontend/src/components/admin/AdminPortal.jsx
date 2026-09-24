import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigation } from "../../context/NavigationContext.jsx";
import AdminOverview from "./AdminOverview.jsx";
import AdminUsers from "./AdminUsers.jsx";
import AdminSellers from "./AdminSellers.jsx";
import AdminProducts from "./AdminProducts.jsx";
import AdminOrders from "./AdminOrders.jsx";
import AdminReports from "./AdminReports.jsx";
import AdminAuditLogs from "./AdminAuditLogs.jsx";
import AdminPlaceholder from "./AdminPlaceholder.jsx";

export default function AdminPortal() {
  const { user, logout } = useAuth();
  const { currentPath, navigate } = useNavigation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Determine active tab from hash path
  let activeTab = "dashboard";
  if (currentPath === "/admin" || currentPath === "/admin/dashboard") {
    activeTab = "dashboard";
  } else if (currentPath.startsWith("/admin/users")) {
    activeTab = "users";
  } else if (currentPath.startsWith("/admin/sellers")) {
    activeTab = "sellers";
  } else if (currentPath.startsWith("/admin/products")) {
    activeTab = "products";
  } else if (currentPath.startsWith("/admin/orders")) {
    activeTab = "orders";
  } else if (currentPath.startsWith("/admin/reports")) {
    activeTab = "reports";
  } else if (currentPath.startsWith("/admin/audit-logs")) {
    activeTab = "audit-logs";
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminOverview />;
      case "users":
        return <AdminUsers />;
      case "sellers":
        return <AdminSellers />;
      case "products":
        return <AdminProducts />;
      case "orders":
        return <AdminOrders />;
      case "reports":
        return <AdminReports />;
      case "audit-logs":
        return <AdminAuditLogs />;
      default:
        return <AdminPlaceholder activeTab={activeTab} />;
    }
  };

  return (
    <div className="admin-portal-container">
      {/* Top Admin Header Bar */}
      <div className="admin-portal-header">
        <div className="admin-brand-cluster">
          <div className="admin-badge">Admin Console</div>
          <h1>Platform Administration</h1>
          <p className="admin-subtitle">
            Welcome back, <strong>{user?.name || "Administrator"}</strong> • Master Governance & System Telemetry
          </p>
        </div>

        <div className="admin-user-cluster">
          <div className="admin-user-info">
            <span className="admin-user-name">{user?.name || "Admin"}</span>
            <span className="admin-user-email">{user?.email || "admin@bazora.com"}</span>
          </div>
          <button
            type="button"
            className="btn-logout-admin"
            onClick={handleLogout}
            title="Log out of Admin Console"
          >
            🔒 Log Out
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="admin-nav-bar">
        <nav className="admin-nav-tabs" aria-label="Admin Portal Navigation">
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => navigate("/admin")}
          >
            📊 Dashboard
          </button>
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "users" ? "active" : ""}`}
            onClick={() => navigate("/admin/users")}
          >
            👥 Users
          </button>
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "sellers" ? "active" : ""}`}
            onClick={() => navigate("/admin/sellers")}
          >
            🏪 Sellers
          </button>
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "products" ? "active" : ""}`}
            onClick={() => navigate("/admin/products")}
          >
            📦 Products
          </button>
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => navigate("/admin/orders")}
          >
            🛒 Orders
          </button>
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => navigate("/admin/reports")}
          >
            📈 Reports / Analytics
          </button>
          <button
            type="button"
            className={`admin-tab-link ${activeTab === "audit-logs" ? "active" : ""}`}
            onClick={() => navigate("/admin/audit-logs")}
          >
            📋 Audit Logs
          </button>
        </nav>
      </div>

      {/* Main Admin Content Body */}
      <div className="admin-portal-content">
        {renderActiveView()}
      </div>
    </div>
  );
}
