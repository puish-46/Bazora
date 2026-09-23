import Coupon from "../models/Coupon.js";

// ==========================================
// CREATE COUPON
// ==========================================

export const createCouponService = async (couponData) => {
    const {
        code,
        description,
        discountType,
        discountValue,
        minimumOrderAmount,
        maximumDiscountAmount,
        usageLimit,
        startDate,
        expiryDate
    } = couponData;

    if (
        !code ||
        !discountType ||
        discountValue === undefined ||
        !startDate ||
        !expiryDate
    ) {
        const error = new Error(
            "Required coupon fields are missing"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        discountType === "percentage" &&
        discountValue > 100
    ) {
        const error = new Error(
            "Percentage discount cannot exceed 100"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        new Date(expiryDate) <= new Date(startDate)
    ) {
        const error = new Error(
            "Expiry date must be after start date"
        );
        error.statusCode = 400;
        throw error;
    }

    const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase()
    });

    if (existingCoupon) {
        const error = new Error(
            "Coupon code already exists"
        );
        error.statusCode = 409;
        throw error;
    }

    return await Coupon.create({
        code,
        description,
        discountType,
        discountValue,
        minimumOrderAmount,
        maximumDiscountAmount,
        usageLimit,
        startDate,
        expiryDate
    });
};


// ==========================================
// GET ALL COUPONS
// ==========================================

export const getAllCouponsService = async () => {
    return await Coupon.find()
        .sort({ createdAt: -1 });
};


// ==========================================
// GET COUPON BY ID
// ==========================================

export const getCouponByIdService = async (couponId) => {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    return coupon;
};


// ==========================================
// UPDATE COUPON
// ==========================================

export const updateCouponService = async (
    couponId,
    updateData
) => {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        updateData.discountType === "percentage" &&
        updateData.discountValue > 100
    ) {
        const error = new Error(
            "Percentage discount cannot exceed 100"
        );
        error.statusCode = 400;
        throw error;
    }

    const startDate =
        updateData.startDate || coupon.startDate;

    const expiryDate =
        updateData.expiryDate || coupon.expiryDate;

    if (new Date(expiryDate) <= new Date(startDate)) {
        const error = new Error(
            "Expiry date must be after start date"
        );
        error.statusCode = 400;
        throw error;
    }

    if (updateData.code) {
        updateData.code =
            updateData.code.toUpperCase();

        const existingCoupon = await Coupon.findOne({
            code: updateData.code,
            _id: { $ne: couponId }
        });

        if (existingCoupon) {
            const error = new Error(
                "Coupon code already exists"
            );
            error.statusCode = 409;
            throw error;
        }
    }

    Object.assign(coupon, updateData);

    return await coupon.save();
};


// ==========================================
// DELETE COUPON
// ==========================================

export const deleteCouponService = async (couponId) => {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    await coupon.deleteOne();

    return {
        message: "Coupon deleted successfully"
    };
};


// ==========================================
// ACTIVATE / DEACTIVATE COUPON
// ==========================================

export const toggleCouponStatusService = async (
    couponId
) => {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    coupon.isActive = !coupon.isActive;

    await coupon.save();

    return coupon;
};