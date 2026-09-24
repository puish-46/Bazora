import express from "express";
import {
    generateProductDescription,
    generateSellingPoints,
    getReviewSummary
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

export default router;
