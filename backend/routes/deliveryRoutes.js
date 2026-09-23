import express from "express";

import {
    assignDeliveryPartner,
    getMyDeliveries,
    updateDeliveryStatus
} from "../controllers/deliveryController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();


// Admin assigns delivery partner
router.post(
    "/orders/:orderId/assign",
    protect,
    authorize("admin"),
    assignDeliveryPartner
);


// Delivery partner views assigned deliveries
router.get(
    "/my",
    protect,
    authorize("delivery"),
    getMyDeliveries
);


// Delivery partner updates delivery status
router.patch(
    "/:deliveryId/status",
    protect,
    authorize("delivery"),
    updateDeliveryStatus
);

export default router;