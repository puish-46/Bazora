import express from "express";

import {
    checkout,
    getMyOrders,
    getOrderById,
    getSellerOrders,
    updateSellerOrderStatus,
    cancelOrder
} from "../controllers/orderController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";
import { approvedSeller } from "../middleware/sellerMiddleware.js";

const router = express.Router();

router.post(
    "/checkout",
    protect,
    authorize("customer"),
    checkout
);

router.get(
    "/my",
    protect,
    authorize("customer"),
    getMyOrders
);

router.get(
    "/:orderId",
    protect,
    authorize("customer"),
    getOrderById
);

router.get(
    "/seller/my",
    protect,
    approvedSeller,
    getSellerOrders
);

router.patch(
    "/seller/:orderId/status",
    protect,
    approvedSeller,
    updateSellerOrderStatus
);

router.patch(
    "/:orderId/cancel",
    protect,
    authorize("customer"),
    cancelOrder
);

export default router;