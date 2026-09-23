import express from "express";

import {
    addToWishlist,
    getWishlist,
    removeFromWishlist
} from "../controllers/wishlistController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
    "/",
    protect,
    authorize("customer"),
    getWishlist
);

router.post(
    "/:productId",
    protect,
    authorize("customer"),
    addToWishlist
);

router.delete(
    "/:productId",
    protect,
    authorize("customer"),
    removeFromWishlist
);

export default router;