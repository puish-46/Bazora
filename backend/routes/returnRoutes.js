import express from "express";

import {
    createReturnRequest,
    getMyReturns,
    getSellerReturns,
    updateReturnStatus,
    processMockRefund
} from "../controllers/returnController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

import { approvedSeller } from "../middleware/sellerMiddleware.js";

const router = express.Router();


// Customer
router.post(
    "/orders/:orderId",
    protect,
    authorize("customer"),
    createReturnRequest
);

router.get(
    "/my",
    protect,
    authorize("customer"),
    getMyReturns
);


// Seller
router.get(
    "/seller/my",
    protect,
    approvedSeller,
    getSellerReturns
);

router.patch(
    "/seller/:returnId/status",
    protect,
    approvedSeller,
    updateReturnStatus
);

router.patch(
    "/seller/:returnId/refund",
    protect,
    approvedSeller,
    processMockRefund
);


export default router;