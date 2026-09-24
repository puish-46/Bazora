import mongoose from "mongoose";
import ReturnRequest from "../models/ReturnRequest.js";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import { validateObjectId } from "../utils/securityUtils.js";

export const createReturnRequestService = async (
    userId,
    orderId,
    reason
) => {
    validateObjectId(userId, "userId");
    validateObjectId(orderId, "orderId");

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
        const error = new Error("Return reason is required");
        error.statusCode = 400;
        throw error;
    }

    if (reason.trim().length > 500) {
        const error = new Error("Return reason cannot exceed 500 characters");
        error.statusCode = 400;
        throw error;
    }

    const trimmedReason = reason.trim();

    const order = await Order.findOne({
        _id: orderId,
        userId
    });

    if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
    }

    if (order.orderStatus !== "delivered") {
        const error = new Error(
            "Only delivered orders can be returned"
        );
        error.statusCode = 400;
        throw error;
    }

    if (order.paymentStatus !== "paid") {
        const error = new Error(
            "Only paid orders can be returned"
        );
        error.statusCode = 400;
        throw error;
    }

    const existingReturn = await ReturnRequest.findOne({
        orderId,
        userId,
        status: {
            $nin: ["rejected", "cancelled"]
        }
    });

    if (existingReturn) {
        const error = new Error(
            "A return request already exists for this order"
        );
        error.statusCode = 409;
        throw error;
    }

    const sellerOrder = order.sellerOrders.find(
        (sellerOrder) =>
            sellerOrder.status === "delivered"
    );

    if (!sellerOrder) {
        const error = new Error(
            "No delivered seller order found"
        );
        error.statusCode = 400;
        throw error;
    }

    const items = sellerOrder.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reason
    }));

    const refundAmount = sellerOrder.subtotal;

    const returnRequest = await ReturnRequest.create({
        orderId,
        userId,
        sellerId: sellerOrder.sellerId,
        items,
        reason,
        refundAmount
    });

    const notification =
        notificationTemplates.returnRequested(
            returnRequest._id
        );

    await createNotificationService(
        sellerOrder.sellerId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    return returnRequest;
};

export const getMyReturnsService = async (userId) => {
    validateObjectId(userId, "userId");
    return await ReturnRequest.find({ userId })
        .populate(
            "orderId",
            "totalAmount paymentStatus orderStatus createdAt"
        )
        .populate(
            "sellerId",
            "businessName businessEmail"
        )
        .populate(
            "items.productId",
            "name slug images"
        )
        .populate(
            "items.variantId",
            "sku attributes price"
        )
        .sort({ createdAt: -1 });
};


export const getSellerReturnsService = async (sellerId) => {
    validateObjectId(sellerId, "sellerId");
    return await ReturnRequest.find({ sellerId })
        .populate(
            "orderId",
            "totalAmount paymentStatus orderStatus createdAt shippingAddress"
        )
        .populate(
            "userId",
            "name email"
        )
        .populate(
            "items.productId",
            "name slug images"
        )
        .populate(
            "items.variantId",
            "sku attributes price"
        )
        .sort({ createdAt: -1 });
};


export const updateReturnStatusService = async (
    sellerId,
    returnId,
    status
) => {
    validateObjectId(sellerId, "sellerId");
    validateObjectId(returnId, "returnId");

    const allowedStatuses = [
        "approved",
        "rejected",
        "picked_up",
        "received"
    ];

    if (!allowedStatuses.includes(status)) {
        const error = new Error("Invalid return status");
        error.statusCode = 400;
        throw error;
    }

    const returnRequest = await ReturnRequest.findOne({
        _id: returnId,
        sellerId
    });

    if (!returnRequest) {
        const error = new Error("Return request not found");
        error.statusCode = 404;
        throw error;
    }

    const currentStatus = returnRequest.status;

    const validTransitions = {
        requested: ["approved", "rejected"],
        approved: ["picked_up"],
        picked_up: ["received"],
        received: [],
        rejected: [],
        refunded: [],
        cancelled: []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
        const error = new Error(
            `Cannot change return status from ${currentStatus} to ${status}`
        );
        error.statusCode = 400;
        throw error;
    }

    returnRequest.status = status;

    if (status === "approved") {
        returnRequest.approvedAt = new Date();
    }

    await returnRequest.save();

    const notification =
        notificationTemplates.returnStatusUpdated(
            returnRequest._id,
            status
        );

    await createNotificationService(
        returnRequest.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    return returnRequest;
};


export const processMockRefundService = async (
    sellerId,
    returnId
) => {
    validateObjectId(sellerId, "sellerId");
    validateObjectId(returnId, "returnId");

    const session = await mongoose.startSession();

    try {
        let updatedReturn;

        await session.withTransaction(async () => {
            const returnRequest = await ReturnRequest.findOne({
                _id: returnId,
                sellerId
            }).session(session);

            if (!returnRequest) {
                const error = new Error(
                    "Return request not found"
                );
                error.statusCode = 404;
                throw error;
            }

            if (returnRequest.status !== "received") {
                const error = new Error(
                    "Return must be received before refund"
                );
                error.statusCode = 400;
                throw error;
            }

            const order = await Order.findById(
                returnRequest.orderId
            ).session(session);

            if (!order) {
                const error = new Error("Original order not found");
                error.statusCode = 404;
                throw error;
            }

            if (order.paymentStatus !== "paid") {
                const error = new Error(
                    "Order is not eligible for refund"
                );
                error.statusCode = 400;
                throw error;
            }

            for (const item of returnRequest.items) {
                const inventory = await Inventory.findOneAndUpdate(
                    {
                        variantId: item.variantId
                    },
                    {
                        $inc: {
                            quantity: item.quantity
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!inventory) {
                    const error = new Error(
                        "Inventory not found for returned product"
                    );
                    error.statusCode = 404;
                    throw error;
                }
            }

            returnRequest.status = "refunded";
            returnRequest.refundTransactionId =
                `REFUND_MOCK_${Date.now()}_${returnRequest._id}`;
            returnRequest.refundedAt = new Date();

            await returnRequest.save({ session });

            order.paymentStatus = "refunded";

            await order.save({ session });

            updatedReturn = returnRequest;
        });

        const notification =
            notificationTemplates.refundProcessed(
                updatedReturn._id
            );

        await createNotificationService(
            updatedReturn.userId,
            notification.type,
            notification.title,
            notification.message,
            notification.relatedId,
            notification.relatedType
        );

        return updatedReturn;
    } finally {
        await session.endSession();
    }
};