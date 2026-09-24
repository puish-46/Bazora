import mongoose from "mongoose";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import Coupon from "../models/Coupon.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import { validateObjectId } from "../utils/securityUtils.js";

export const processMockPaymentService = async (userId, orderId) => {
    validateObjectId(userId, "userId");
    validateObjectId(orderId, "orderId");

    const session = await mongoose.startSession();

    try {
        let updatedOrder;

        await session.withTransaction(async () => {
            const order = await Order.findOne({
                _id: orderId,
                userId
            }).session(session);

            if (!order) {
                const error = new Error("Order not found");
                error.statusCode = 404;
                throw error;
            }

            if (order.paymentStatus === "paid") {
                const error = new Error("Order is already paid");
                error.statusCode = 400;
                throw error;
            }

            if (order.orderStatus !== "pending") {
                const error = new Error("Order cannot be paid in its current state");
                error.statusCode = 400;
                throw error;
            }

            // Confirm reserved inventory
            for (const sellerOrder of order.sellerOrders) {
                for (const item of sellerOrder.items) {
                    const inventory = await Inventory.findOneAndUpdate(
                        {
                            variantId: item.variantId,
                            quantity: { $gte: item.quantity },
                            reservedQuantity: { $gte: item.quantity }
                        },
                        {
                            $inc: {
                                quantity: -item.quantity,
                                reservedQuantity: -item.quantity
                            }
                        },
                        {
                            new: true,
                            session
                        }
                    );

                    if (!inventory) {
                        const error = new Error(
                            "Unable to confirm inventory for the order"
                        );
                        error.statusCode = 400;
                        throw error;
                    }
                }
            }

            if (order.couponId) {
                const coupon = await Coupon.findOneAndUpdate(
                    {
                        _id: order.couponId,
                        isActive: true,
                        $or: [
                            { usageLimit: null },
                            {
                                $expr: {
                                    $lt: ["$usedCount", "$usageLimit"]
                                }
                            }
                        ]
                    },
                    {
                        $inc: {
                            usedCount: 1
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!coupon) {
                    const error = new Error(
                        "Coupon is no longer available or usage limit reached"
                    );
                    error.statusCode = 400;
                    throw error;
                }
            }

            order.paymentStatus = "paid";
            order.paymentMethod = "mock";
            order.transactionId = `MOCK_${Date.now()}_${order._id}`;
            order.paidAt = new Date();
            order.orderStatus = "confirmed";

            order.sellerOrders.forEach((sellerOrder) => {
                sellerOrder.status = "confirmed";
            });

            await order.save({ session });

            updatedOrder = order;

            const notification =
                notificationTemplates.paymentSuccessful(
                    order._id
                );

            await createNotificationService(
                userId,
                notification.type,
                notification.title,
                notification.message,
                notification.relatedId,
                notification.relatedType
            );
        });

        return updatedOrder;
    } finally {
        await session.endSession();
    }
};