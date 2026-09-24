import express from "express";

import {
    getPendingSellers,
    approveSeller,
    rejectSeller,
    getPendingProducts,
    getAllProductsAdmin,
    approveProduct,
    rejectProduct,
    getAllUsersAdmin,
    getUserByIdAdmin,
    updateUserRole,
    toggleUserStatus,
    getReportsOverview,
    getSalesReport,
    getTopProductsReport,
    getAuditLogs
} from "../controllers/adminController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Seller moderation
router.get(
    "/sellers/pending",
    protect,
    authorize("admin"),
    getPendingSellers
);

router.patch(
    "/sellers/:id/approve",
    protect,
    authorize("admin"),
    approveSeller
);

router.patch(
    "/sellers/:id/reject",
    protect,
    authorize("admin"),
    rejectSeller
);

// Product moderation
router.get(
    "/products/pending",
    protect,
    authorize("admin"),
    getPendingProducts
);

router.get(
    "/products",
    protect,
    authorize("admin"),
    getAllProductsAdmin
);

router.patch(
    "/products/:productId/approve",
    protect,
    authorize("admin"),
    approveProduct
);

router.patch(
    "/products/:productId/reject",
    protect,
    authorize("admin"),
    rejectProduct
);

// User management
router.get(
    "/users",
    protect,
    authorize("admin"),
    getAllUsersAdmin
);

router.get(
    "/users/:userId",
    protect,
    authorize("admin"),
    getUserByIdAdmin
);

router.patch(
    "/users/:userId/role",
    protect,
    authorize("admin"),
    updateUserRole
);

router.patch(
    "/users/:userId/toggle-status",
    protect,
    authorize("admin"),
    toggleUserStatus
);

// Reports & Analytics
router.get(
    "/reports/overview",
    protect,
    authorize("admin"),
    getReportsOverview
);

router.get(
    "/reports/sales",
    protect,
    authorize("admin"),
    getSalesReport
);

router.get(
    "/reports/top-products",
    protect,
    authorize("admin"),
    getTopProductsReport
);

// Audit Logs
router.get(
    "/audit-logs",
    protect,
    authorize("admin"),
    getAuditLogs
);

export default router;