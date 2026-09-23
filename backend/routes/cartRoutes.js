import express from "express";

import {
    addToCart,
    getCart,
    updateCartItem,
    removeCartItem
} from "../controllers/cartController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
    "/",
    protect,
    authorize("customer"),
    getCart
);

router.post(
    "/",
    protect,
    authorize("customer"),
    addToCart
);

router.put(
    "/items/:itemId",
    protect,
    authorize("customer"),
    updateCartItem
);

router.delete(
    "/items/:itemId",
    protect,
    authorize("customer"),
    removeCartItem
);

export default router;