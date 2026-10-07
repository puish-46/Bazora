import express from "express";
import {
    generateProductDescription,
    generateSellingPoints,
    getReviewSummary,
    getProductSummary,
    chatAssistant
} from "../controllers/aiController.js";
import { protect } from "../middleware/authMiddleware.js";
import { sellerOrAdmin } from "../middleware/sellerMiddleware.js";

const router = express.Router();

// Product description generator (sellers & admin)
router.post(
    "/product-description",
    protect,
    sellerOrAdmin,
    generateProductDescription
);

// Key selling points generator (sellers & admin)
router.post(
    "/product-selling-points",
    protect,
    sellerOrAdmin,
    generateSellingPoints
);

// Review summary generator (authenticated users)
router.get(
    "/products/:productId/review-summary",
    protect,
    getReviewSummary
);

// Product AI summary (authenticated users)
router.get(
    "/products/:productId/summary",
    protect,
    getProductSummary
);

// Customer AI Shopping Assistant (authenticated users)
router.post(
    "/assistant",
    protect,
    chatAssistant
);

export default router;
