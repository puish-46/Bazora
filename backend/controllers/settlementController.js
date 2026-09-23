import {
    createSettlementService,
    getSellerEarningsService,
    getSellerSettlementsService,
    getAllSettlementsService,
    markSettlementPaidService
} from "../services/settlementService.js";

import Seller from "../models/Seller.js";


// ==========================================
// ADMIN CREATE SETTLEMENT
// ==========================================

export const createSettlement = async (
    req,
    res,
    next
) => {
    try {
        const {
            orderId,
            sellerOrderId
        } = req.body;

        if (!orderId || !sellerOrderId) {
            return res.status(400).json({
                success: false,
                message:
                    "orderId and sellerOrderId are required"
            });
        }

        const settlement =
            await createSettlementService(
                orderId,
                sellerOrderId
            );

        res.status(201).json({
            success: true,
            message:
                "Settlement created successfully",
            settlement
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// SELLER EARNINGS
// ==========================================

export const getSellerEarnings = async (
    req,
    res,
    next
) => {
    try {
        const seller =
            await Seller.findOne({
                userId: req.user.userId
            });

        if (!seller) {
            return res.status(404).json({
                success: false,
                message:
                    "Seller profile not found"
            });
        }

        const result =
            await getSellerEarningsService(
                seller._id
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
// SELLER SETTLEMENT HISTORY
// ==========================================

export const getSellerSettlements = async (
    req,
    res,
    next
) => {
    try {
        const seller =
            await Seller.findOne({
                userId: req.user.userId
            });

        if (!seller) {
            return res.status(404).json({
                success: false,
                message:
                    "Seller profile not found"
            });
        }

        const settlements =
            await getSellerSettlementsService(
                seller._id
            );

        res.status(200).json({
            success: true,
            settlements
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// ADMIN VIEW SETTLEMENTS
// ==========================================

export const getAllSettlements = async (
    req,
    res,
    next
) => {
    try {
        const {
            status
        } = req.query;

        const settlements =
            await getAllSettlementsService(
                status
            );

        res.status(200).json({
            success: true,
            settlements
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// ADMIN MARK PAID
// ==========================================

export const markSettlementPaid = async (
    req,
    res,
    next
) => {
    try {
        const { settlementId } =
            req.params;

        const {
            paymentReference
        } = req.body;

        const settlement =
            await markSettlementPaidService(
                settlementId,
                paymentReference
            );

        res.status(200).json({
            success: true,
            message:
                "Settlement marked as paid",
            settlement
        });
    } catch (error) {
        next(error);
    }
};