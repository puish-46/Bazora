import mongoose from "mongoose";
import Delivery from "../models/Delivery.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import { validateObjectId } from "../utils/securityUtils.js";

export const assignDeliveryPartnerService = async (
    orderId,
    sellerOrderId,
    deliveryPartnerId
) => {
    validateObjectId(orderId, "orderId");
    validateObjectId(sellerOrderId, "sellerOrderId");
    validateObjectId(deliveryPartnerId, "deliveryPartnerId");

    const order = await Order.findById(orderId);

    if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
    }

    const sellerOrder = order.sellerOrders.id(sellerOrderId);

    if (!sellerOrder) {
        const error = new Error("Seller order not found");
        error.statusCode = 404;
        throw error;
    }

    if (sellerOrder.status !== "shipped") {
        const error = new Error(
            "Delivery partner can only be assigned after the order is shipped"
        );
        error.statusCode = 400;
        throw error;
    }

    const deliveryPartner = await User.findOne({
        _id: deliveryPartnerId,
        role: "delivery"
    });

    if (!deliveryPartner) {
        const error = new Error(
            "Delivery partner not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const existingDelivery = await Delivery.findOne({
        orderId,
        sellerOrderId
    });

    if (existingDelivery) {
        const error = new Error(
            "A delivery partner is already assigned"
        );
        error.statusCode = 409;
        throw error;
    }

    const delivery = await Delivery.create({
        orderId,
        sellerOrderId,
        sellerId: sellerOrder.sellerId,
        deliveryPartnerId
    });

    const notification =
        notificationTemplates.deliveryAssigned(
            delivery._id
        );

    await createNotificationService(
        deliveryPartnerId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    return delivery;
};


export const getMyDeliveriesService = async (
    deliveryPartnerId
) => {
    validateObjectId(deliveryPartnerId, "deliveryPartnerId");
    return await Delivery.find({
        deliveryPartnerId
    })
        .populate(
            "orderId",
            "userId shippingAddress paymentStatus orderStatus totalAmount"
        )
        .populate(
            "sellerId",
            "businessName businessEmail"
        )
        .sort({ createdAt: -1 });
};


export const updateDeliveryStatusService = async (
    deliveryPartnerId,
    deliveryId,
    status
) => {
    validateObjectId(deliveryPartnerId, "deliveryPartnerId");
    validateObjectId(deliveryId, "deliveryId");

    const allowedStatuses = ["picked_up", "out_for_delivery", "delivered", "cancelled"];
    if (!allowedStatuses.includes(status)) {
        const error = new Error("Invalid delivery status");
        error.statusCode = 400;
        throw error;
    }

    const delivery = await Delivery.findOne({
        _id: deliveryId,
        deliveryPartnerId
    });

    if (!delivery) {
        const error = new Error("Delivery not found");
        error.statusCode = 404;
        throw error;
    }

    const validTransitions = {
        assigned: ["picked_up", "cancelled"],
        picked_up: ["out_for_delivery"],
        out_for_delivery: ["delivered"],
        delivered: [],
        cancelled: []
    };

    if (!validTransitions[delivery.status]?.includes(status)) {
        const error = new Error(
            `Cannot change delivery status from ${delivery.status} to ${status}`
        );
        error.statusCode = 400;
        throw error;
    }

    delivery.status = status;

    if (status === "picked_up") {
        delivery.pickedUpAt = new Date();
    }

    if (status === "out_for_delivery") {
        delivery.outForDeliveryAt = new Date();

        const notification =
            notificationTemplates.orderOutForDelivery(
                delivery.orderId
            );

        const order = await Order.findById(
            delivery.orderId
        );

        if (order) {
            await createNotificationService(
                order.userId,
                notification.type,
                notification.title,
                notification.message,
                notification.relatedId,
                notification.relatedType
            );
        }
    }

    if (status === "delivered") {
            delivery.deliveredAt = new Date();

        const notification =
            notificationTemplates.orderDelivered(
                delivery.orderId
            );

        const order = await Order.findById(
            delivery.orderId
        );

        if (order) {
            await createNotificationService(
                order.userId,
                notification.type,
                notification.title,
                notification.message,
                notification.relatedId,
                notification.relatedType
            );
        }
    }

    await delivery.save();

    return delivery;
};