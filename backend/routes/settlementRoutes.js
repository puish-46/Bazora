import express from "express";

import {
    createSettlement,
    getSellerEarnings,
    getSellerSettlements,
    getAllSettlements,
    markSettlementPaid
} from "../controllers/settlementController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

import {
    approvedSeller
} from "../middleware/sellerMiddleware.js";

const router = express.Router();


// ==========================================
// ADMIN
// ==========================================

// Create settlement
router.post(
    "/",
    protect,
    authorize("admin"),
    createSettlement
);


// View all settlements
router.get(
    "/",
    protect,
    authorize("admin"),
    getAllSettlements
);


// Mark settlement as paid
router.patch(
    "/:settlementId/pay",
    protect,
    authorize("admin"),
    markSettlementPaid
);


// ==========================================
// SELLER
// ==========================================

// Earnings dashboard
router.get(
    "/seller/earnings",
    protect,
    approvedSeller,
    getSellerEarnings
);


// Settlement history
router.get(
    "/seller/my",
    protect,
    approvedSeller,
    getSellerSettlements
);

export default router;