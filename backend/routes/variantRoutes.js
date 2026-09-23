import express from "express";

import {
    createVariant,
    getProductVariants,
    updateVariant,
    deleteVariant
} from "../controllers/variantController.js";

import { protect } from "../middleware/authMiddleware.js";
import { approvedSeller } from "../middleware/sellerMiddleware.js";

const router = express.Router();

router.post(
    "/products/:productId/variants",
    protect,
    approvedSeller,
    createVariant
);

router.get(
    "/products/:productId/variants",
    protect,
    approvedSeller,
    getProductVariants
);

router.put(
    "/products/:productId/variants/:variantId",
    protect,
    approvedSeller,
    updateVariant
);

router.delete(
    "/products/:productId/variants/:variantId",
    protect,
    approvedSeller,
    deleteVariant
);

export default router;