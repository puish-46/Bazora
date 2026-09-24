import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { NavigationProvider, useNavigation } from "./context/NavigationContext.jsx";
import { ShopProvider } from "./context/ShopContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Home from "./components/Home.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ProductList from "./components/ProductList.jsx";
import ProductDetails from "./components/ProductDetails.jsx";
import Wishlist from "./components/Wishlist.jsx";
import Cart from "./components/Cart.jsx";
import Checkout from "./components/Checkout.jsx";
import OrderConfirmation from "./components/OrderConfirmation.jsx";
import OrderHistory from "./components/OrderHistory.jsx";
import SellerPortal from "./components/seller/SellerPortal.jsx";
import AdminPortal from "./components/admin/AdminPortal.jsx";
import {
  CustomerDashboard,
  SellerDashboard,
  AdminDashboard,
  SupportDashboard,
  DeliveryDashboard,
  UnauthorizedPage,
} from "./components/RoleDashboards.jsx";
import "./App.css";

function AppRoutes() {
  const { currentPath } = useNavigation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="session-restore-screen" role="status" aria-live="polite">
        <div className="auth-spinner large"></div>
        <p className="session-restore-title">Restoring Bazora session...</p>
        <p className="session-restore-subtitle">Verifying security credentials with server</p>
      </div>
    );
  }

  // Handle dynamic route for Product Details: /products/:id
  if (currentPath.startsWith("/products/")) {
    const productId = currentPath.slice("/products/".length);
    return <ProductDetails productId={productId} />;
  }

  // Handle dynamic route for Order Confirmation: /order-confirmation/:id
  if (currentPath.startsWith("/order-confirmation/")) {
    const orderId = currentPath.slice("/order-confirmation/".length);
    return (
      <ProtectedRoute allowedRoles={["customer"]}>
        <OrderConfirmation orderId={orderId} />
      </ProtectedRoute>
    );
  }

  // Handle all Seller Portal routes: /seller, /seller/products, /seller/inventory, /seller/orders, /seller/settlements
  if (currentPath === "/seller" || currentPath.startsWith("/seller/")) {
    return (
      <ProtectedRoute allowedRoles={["seller"]}>
        <SellerPortal />
      </ProtectedRoute>
    );
  }

  // Handle all Admin Portal routes: /admin, /admin/dashboard, /admin/users, /admin/sellers, /admin/products, /admin/orders, /admin/reports, /admin/audit-logs
  if (currentPath === "/admin" || currentPath.startsWith("/admin/")) {
    return (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminPortal />
      </ProtectedRoute>
    );
  }

  // Routing switch
  switch (currentPath) {
    case "/":
      return <Home />;

    case "/products":
      return <ProductList />;

    case "/wishlist":
      return (
        <ProtectedRoute allowedRoles={["customer"]}>
          <Wishlist />
        </ProtectedRoute>
      );

    case "/cart":
      return (
        <ProtectedRoute allowedRoles={["customer"]}>
          <Cart />
        </ProtectedRoute>
      );

    case "/checkout":
      return (
        <ProtectedRoute allowedRoles={["customer"]}>
          <Checkout />
        </ProtectedRoute>
      );

    case "/orders":
      return (
        <ProtectedRoute allowedRoles={["customer"]}>
          <OrderHistory />
        </ProtectedRoute>
      );

    case "/login":
      return <Login />;

    case "/register":
      return <Register />;

    case "/unauthorized":
      return <UnauthorizedPage />;

    case "/dashboard":
      if (user?.role === "admin") {
        return (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminPortal />
          </ProtectedRoute>
        );
      }
      return (
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerDashboard />
        </ProtectedRoute>
      );

    case "/support":
      return (
        <ProtectedRoute allowedRoles={["support", "admin"]}>
          <SupportDashboard />
        </ProtectedRoute>
      );

    case "/delivery":
      return (
        <ProtectedRoute allowedRoles={["delivery", "admin"]}>
          <DeliveryDashboard />
        </ProtectedRoute>
      );

    default:
      return <Home />;
  }
}

export default function App() {
  return (
    <NavigationProvider>
      <AuthProvider>
        <ShopProvider>
          <div className="bazora-app">
            <Navbar />
            <main className="main-content">
              <AppRoutes />
            </main>
            <footer className="bazora-footer">
              <p>© {new Date().getFullYear()} Bazora Multi-Vendor Marketplace. All rights reserved.</p>
            </footer>
          </div>
        </ShopProvider>
      </AuthProvider>
    </NavigationProvider>
  );
}
