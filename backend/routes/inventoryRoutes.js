import express from "express";

import {
    createInventory,
    getInventory,
    updateInventory,
    getMyInventory
} from "../controllers/inventoryController.js";

import { protect } from "../middleware/authMiddleware.js";
import { approvedSeller } from "../middleware/sellerMiddleware.js";

const router = express.Router();

router.get(
    "/inventory/my",
    protect,
    approvedSeller,
    getMyInventory
);

router.post(
    "/variants/:variantId/inventory",
    protect,
    approvedSeller,
    createInventory
);

router.get(
    "/variants/:variantId/inventory",
    protect,
    approvedSeller,
    getInventory
);

router.put(
    "/variants/:variantId/inventory",
    protect,
    approvedSeller,
    updateInventory
);

export default router;