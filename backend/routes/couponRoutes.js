import express from "express";

import {
    createCoupon,
    getAllCoupons,
    getCouponById,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
} from "../controllers/couponController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();


// Admin only
router.use(protect);
router.use(authorize("admin"));


// GET /api/coupons
router.get("/", getAllCoupons);


// POST /api/coupons
router.post("/", createCoupon);


// GET /api/coupons/:couponId
router.get("/:couponId", getCouponById);


// PUT /api/coupons/:couponId
router.put("/:couponId", updateCoupon);


// DELETE /api/coupons/:couponId
router.delete("/:couponId", deleteCoupon);


// PATCH /api/coupons/:couponId/toggle
router.patch(
    "/:couponId/toggle",
    toggleCouponStatus
);

export default router;