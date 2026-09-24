import { useNavigation } from "../../context/NavigationContext.jsx";

const MODULE_DETAILS = {
  users: {
    title: "User Governance & Account Management",
    icon: "👥",
    step: "Admin Flow — Step 2",
    description:
      "This section will provide comprehensive user administration, including role assignments (Customer, Seller, Support, Delivery, Admin), account activation/deactivation, and search across all registered marketplace accounts.",
  },
  sellers: {
    title: "Seller Approvals & Verification",
    icon: "🏪",
    step: "Admin Flow — Step 3",
    description:
      "This section will handle vendor application review, business document verification, and one-click seller approval or rejection workflows.",
  },
  products: {
    title: "Product Catalog Moderation",
    icon: "📦",
    step: "Admin Flow — Step 4",
    description:
      "This section will manage marketplace product moderation, item approvals, rejection with reason feedback, and catalog governance across all vendor storefronts.",
  },
  orders: {
    title: "Marketplace Order Oversight",
    icon: "🛒",
    step: "Admin Flow — Step 5",
    description:
      "This section will provide global order tracking, cross-vendor transaction status oversight, and logistics dispatch visibility.",
  },
  reports: {
    title: "Financial Analytics & Sales Reports",
    icon: "📈",
    step: "Admin Flow — Step 6",
    description:
      "This section will provide in-depth date-range filtered sales reports, top-performing product leaderboards, and marketplace commission metrics.",
  },
};

export default function AdminPlaceholder({ activeTab }) {
  const { navigate } = useNavigation();
  const moduleInfo = MODULE_DETAILS[activeTab] || {
    title: "Admin Subsystem Module",
    icon: "⚙️",
    step: "Future Admin Flow Phase",
    description: "This administration module will be integrated in subsequent phases of the admin implementation.",
  };

  return (
    <div className="admin-placeholder-container">
      <div className="admin-placeholder-card">
        <div className="admin-placeholder-icon-wrap">{moduleInfo.icon}</div>
        <span className="admin-placeholder-badge">{moduleInfo.step}</span>
        <h2>{moduleInfo.title}</h2>
        <p className="admin-placeholder-desc">{moduleInfo.description}</p>

        <div className="admin-placeholder-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/admin")}
          >
            ← Return to Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
