import express from "express";
import { processMockPayment } from "../controllers/paymentController.js";
import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
    "/:orderId/pay",
    protect,
    authorize("customer"),
    processMockPayment
);

export default router;