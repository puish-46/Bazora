import express from "express";

import {
    createReview,
    getProductReviews,
    getMyReviews,
    updateReview,
    deleteReview
} from "../controllers/reviewController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();


// Public product reviews
router.get(
    "/product/:productId",
    getProductReviews
);


// Customer creates review
router.post(
    "/",
    protect,
    authorize("customer"),
    createReview
);


// Customer's own reviews
router.get(
    "/my",
    protect,
    authorize("customer"),
    getMyReviews
);


// Customer updates own review
router.put(
    "/:reviewId",
    protect,
    authorize("customer"),
    updateReview
);


// Customer deletes own review
router.delete(
    "/:reviewId",
    protect,
    authorize("customer"),
    deleteReview
);

export default router;