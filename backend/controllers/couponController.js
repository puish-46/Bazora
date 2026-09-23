import {
    createCouponService,
    getAllCouponsService,
    getCouponByIdService,
    updateCouponService,
    deleteCouponService,
    toggleCouponStatusService
} from "../services/couponService.js";


// ==========================================
// CREATE COUPON
// ==========================================

export const createCoupon = async (req, res, next) => {
    try {
        const coupon =
            await createCouponService(req.body);

        res.status(201).json({
            success: true,
            message: "Coupon created successfully",
            coupon
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// GET ALL COUPONS
// ==========================================

export const getAllCoupons = async (req, res, next) => {
    try {
        const coupons =
            await getAllCouponsService();

        res.status(200).json({
            success: true,
            coupons
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// GET COUPON BY ID
// ==========================================

export const getCouponById = async (req, res, next) => {
    try {
        const coupon =
            await getCouponByIdService(
                req.params.couponId
            );

        res.status(200).json({
            success: true,
            coupon
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// UPDATE COUPON
// ==========================================

export const updateCoupon = async (req, res, next) => {
    try {
        const coupon =
            await updateCouponService(
                req.params.couponId,
                req.body
            );

        res.status(200).json({
            success: true,
            message: "Coupon updated successfully",
            coupon
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// DELETE COUPON
// ==========================================

export const deleteCoupon = async (req, res, next) => {
    try {
        const result =
            await deleteCouponService(
                req.params.couponId
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// TOGGLE COUPON STATUS
// ==========================================

export const toggleCouponStatus = async (
    req,
    res,
    next
) => {
    try {
        const coupon =
            await toggleCouponStatusService(
                req.params.couponId
            );

        res.status(200).json({
            success: true,
            message: `Coupon ${
                coupon.isActive
                    ? "activated"
                    : "deactivated"
            } successfully`,
            coupon
        });
    } catch (error) {
        next(error);
    }
};