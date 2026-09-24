import Coupon from "../models/Coupon.js";
import { createAuditLog } from "./auditLogService.js";
import { validateObjectId } from "../utils/securityUtils.js";

// ==========================================
// CREATE COUPON
// ==========================================

export const createCouponService = async (couponData, adminId = null) => {
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

    if (!["percentage", "fixed"].includes(discountType)) {
        const error = new Error("Invalid discountType. Must be 'percentage' or 'fixed'");
        error.statusCode = 400;
        throw error;
    }

    if (typeof discountValue !== "number" || isNaN(discountValue) || discountValue < 0) {
        const error = new Error("discountValue must be a valid non-negative number");
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
        minimumOrderAmount !== undefined &&
        (typeof minimumOrderAmount !== "number" || isNaN(minimumOrderAmount) || minimumOrderAmount < 0)
    ) {
        const error = new Error("minimumOrderAmount must be a non-negative number");
        error.statusCode = 400;
        throw error;
    }

    if (
        maximumDiscountAmount !== undefined &&
        (typeof maximumDiscountAmount !== "number" || isNaN(maximumDiscountAmount) || maximumDiscountAmount < 0)
    ) {
        const error = new Error("maximumDiscountAmount must be a non-negative number");
        error.statusCode = 400;
        throw error;
    }

    if (
        usageLimit !== undefined &&
        (typeof usageLimit !== "number" || isNaN(usageLimit) || usageLimit < 1 || !Number.isInteger(usageLimit))
    ) {
        const error = new Error("usageLimit must be a positive integer");
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

    const coupon = await Coupon.create({
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

    await createAuditLog({
        userId: adminId,
        action: "COUPON_CREATED",
        resourceType: "Coupon",
        resourceId: coupon._id,
        details: {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        }
    });

    return coupon;
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
    validateObjectId(couponId, "couponId");
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
    updateData,
    adminId = null
) => {
    validateObjectId(couponId, "couponId");
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    if (
        updateData.discountType !== undefined &&
        !["percentage", "fixed"].includes(updateData.discountType)
    ) {
        const error = new Error("Invalid discountType. Must be 'percentage' or 'fixed'");
        error.statusCode = 400;
        throw error;
    }

    if (
        updateData.discountValue !== undefined &&
        (typeof updateData.discountValue !== "number" || isNaN(updateData.discountValue) || updateData.discountValue < 0)
    ) {
        const error = new Error("discountValue must be a valid non-negative number");
        error.statusCode = 400;
        throw error;
    }

    const effectiveType = updateData.discountType || coupon.discountType;
    const effectiveValue = updateData.discountValue !== undefined ? updateData.discountValue : coupon.discountValue;

    if (effectiveType === "percentage" && effectiveValue > 100) {
        const error = new Error(
            "Percentage discount cannot exceed 100"
        );
        error.statusCode = 400;
        throw error;
    }

    if (
        updateData.minimumOrderAmount !== undefined &&
        (typeof updateData.minimumOrderAmount !== "number" || isNaN(updateData.minimumOrderAmount) || updateData.minimumOrderAmount < 0)
    ) {
        const error = new Error("minimumOrderAmount must be a non-negative number");
        error.statusCode = 400;
        throw error;
    }

    if (
        updateData.maximumDiscountAmount !== undefined &&
        (typeof updateData.maximumDiscountAmount !== "number" || isNaN(updateData.maximumDiscountAmount) || updateData.maximumDiscountAmount < 0)
    ) {
        const error = new Error("maximumDiscountAmount must be a non-negative number");
        error.statusCode = 400;
        throw error;
    }

    if (
        updateData.usageLimit !== undefined &&
        (typeof updateData.usageLimit !== "number" || isNaN(updateData.usageLimit) || updateData.usageLimit < 1 || !Number.isInteger(updateData.usageLimit))
    ) {
        const error = new Error("usageLimit must be a positive integer");
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

    // Mass assignment prevention: only allow updating approved fields
    const allowedFields = [
        "code",
        "description",
        "discountType",
        "discountValue",
        "minimumOrderAmount",
        "maximumDiscountAmount",
        "usageLimit",
        "startDate",
        "expiryDate",
        "isActive"
    ];

    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            coupon[field] = updateData[field];
        }
    }

    const updatedCoupon = await coupon.save();

    await createAuditLog({
        userId: adminId,
        action: "COUPON_UPDATED",
        resourceType: "Coupon",
        resourceId: updatedCoupon._id,
        details: {
            code: updatedCoupon.code,
            updatedFields: Object.keys(updateData)
        }
    });

    return updatedCoupon;
};


// ==========================================
// DELETE COUPON
// ==========================================

export const deleteCouponService = async (couponId, adminId = null) => {
    validateObjectId(couponId, "couponId");
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    await coupon.deleteOne();

    await createAuditLog({
        userId: adminId,
        action: "COUPON_DELETED",
        resourceType: "Coupon",
        resourceId: coupon._id,
        details: {
            code: coupon.code
        }
    });

    return {
        message: "Coupon deleted successfully"
    };
};


// ==========================================
// ACTIVATE / DEACTIVATE COUPON
// ==========================================

export const toggleCouponStatusService = async (
    couponId,
    adminId = null
) => {
    validateObjectId(couponId, "couponId");
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        const error = new Error("Coupon not found");
        error.statusCode = 404;
        throw error;
    }

    coupon.isActive = !coupon.isActive;

    await coupon.save();

    await createAuditLog({
        userId: adminId,
        action: "COUPON_STATUS_CHANGED",
        resourceType: "Coupon",
        resourceId: coupon._id,
        details: {
            code: coupon.code,
            isActive: coupon.isActive
        }
    });

    return coupon;
};