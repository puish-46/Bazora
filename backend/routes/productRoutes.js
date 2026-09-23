import express from "express";

import {
    createProduct,
    getMyProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    searchProducts
} from "../controllers/productController.js";

import { protect } from "../middleware/authMiddleware.js";
import { approvedSeller } from "../middleware/sellerMiddleware.js";

const router = express.Router();

router.get("/", searchProducts);

router.post(
    "/",
    protect,
    approvedSeller,
    createProduct
);

router.get(
    "/my",
    protect,
    approvedSeller,
    getMyProducts
);

router.get(
    "/:id",
    getProductById
);

router.put(
    "/:id",
    protect,
    approvedSeller,
    updateProduct
);

router.delete(
    "/:id",
    protect,
    approvedSeller,
    deleteProduct
);

export default router;