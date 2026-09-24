import Settlement from "../models/Settlement.js";
import Order from "../models/Order.js";
import Seller from "../models/Seller.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import { validateObjectId } from "../utils/securityUtils.js";

const COMMISSION_PERCENTAGE = 10;


// ==========================================
// CREATE SETTLEMENT
// ==========================================

export const createSettlementService = async (
    orderId,
    sellerOrderId
) => {
    validateObjectId(orderId, "orderId");
    validateObjectId(sellerOrderId, "sellerOrderId");

    const order = await Order.findOne({
        _id: orderId,
        paymentStatus: "paid"
    });

    if (!order) {
        const error = new Error(
            "Paid order not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const sellerOrder = order.sellerOrders.id(
        sellerOrderId
    );

    if (!sellerOrder) {
        const error = new Error(
            "Seller order not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (sellerOrder.status !== "delivered") {
        const error = new Error(
            "Settlement can only be created after delivery"
        );
        error.statusCode = 400;
        throw error;
    }

    const existingSettlement =
        await Settlement.findOne({
            orderId,
            sellerOrderId
        });

    if (existingSettlement) {
        const error = new Error(
            "Settlement already exists for this seller order"
        );
        error.statusCode = 409;
        throw error;
    }

    const grossAmount = sellerOrder.subtotal;

    const commissionAmount =
        Number(
            (
                grossAmount *
                COMMISSION_PERCENTAGE /
                100
            ).toFixed(2)
        );

    const netAmount =
        Number(
            (
                grossAmount -
                commissionAmount
            ).toFixed(2)
        );

    const settlement = await Settlement.create({
        orderId,
        sellerOrderId,
        sellerId: sellerOrder.sellerId,
        grossAmount,
        commissionPercentage:
            COMMISSION_PERCENTAGE,
        commissionAmount,
        netAmount
    });

    const notification =
        notificationTemplates.settlementCreated(
            settlement._id
        );

    await createNotificationService(
        sellerOrder.sellerId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    return settlement;
};


// ==========================================
// SELLER EARNINGS SUMMARY
// ==========================================

export const getSellerEarningsService = async (
    sellerId
) => {
    validateObjectId(sellerId, "sellerId");

    const settlements =
        await Settlement.find({
            sellerId
        }).sort({
            createdAt: -1
        });

    let totalGross = 0;
    let totalCommission = 0;
    let totalNet = 0;
    let pendingAmount = 0;
    let paidAmount = 0;

    for (const settlement of settlements) {
        totalGross += settlement.grossAmount;
        totalCommission +=
            settlement.commissionAmount;
        totalNet += settlement.netAmount;

        if (settlement.status === "pending") {
            pendingAmount += settlement.netAmount;
        }

        if (settlement.status === "paid") {
            paidAmount += settlement.netAmount;
        }
    }

    return {
        summary: {
            totalGross: Number(totalGross.toFixed(2)),
            totalCommission: Number(
                totalCommission.toFixed(2)
            ),
            totalNet: Number(totalNet.toFixed(2)),
            pendingAmount: Number(
                pendingAmount.toFixed(2)
            ),
            paidAmount: Number(
                paidAmount.toFixed(2)
            )
        },
        settlements
    };
};


// ==========================================
// SELLER SETTLEMENT HISTORY
// ==========================================

export const getSellerSettlementsService = async (
    sellerId
) => {
    validateObjectId(sellerId, "sellerId");

    return await Settlement.find({
        sellerId
    })
        .populate(
            "orderId",
            "totalAmount orderStatus paymentStatus createdAt"
        )
        .sort({
            createdAt: -1
        });
};


// ==========================================
// ADMIN VIEW ALL SETTLEMENTS
// ==========================================

export const getAllSettlementsService = async (
    status
) => {
    const filter = {};

    if (status) {
        if (!["pending", "paid"].includes(status)) {
            const error = new Error("Invalid settlement status filter");
            error.statusCode = 400;
            throw error;
        }
        filter.status = status;
    }

    return await Settlement.find(filter)
        .populate(
            "sellerId",
            "businessName businessEmail phone"
        )
        .populate(
            "orderId",
            "userId totalAmount orderStatus paymentStatus"
        )
        .sort({
            createdAt: -1
        });
};


// ==========================================
// ADMIN MARK SETTLEMENT AS PAID
// ==========================================

export const markSettlementPaidService = async (
    settlementId,
    paymentReference
) => {
    validateObjectId(settlementId, "settlementId");

    if (paymentReference && typeof paymentReference === "string" && paymentReference.length > 100) {
        const error = new Error("Payment reference cannot exceed 100 characters");
        error.statusCode = 400;
        throw error;
    }

    const settlement =
        await Settlement.findById(
            settlementId
        );

    if (!settlement) {
        const error = new Error(
            "Settlement not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (settlement.status === "paid") {
        const error = new Error(
            "Settlement is already paid"
        );
        error.statusCode = 400;
        throw error;
    }

    settlement.status = "paid";
    settlement.paidAt = new Date();
    settlement.paymentReference =
        paymentReference || null;

    await settlement.save();

    const notification =
        notificationTemplates.settlementPaid(
            settlement._id
        );

    await createNotificationService(
        settlement.sellerId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    return settlement;
};