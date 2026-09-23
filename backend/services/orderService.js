import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import Inventory from "../models/Inventory.js";
import Order from "../models/Order.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import Coupon from "../models/Coupon.js";

export const checkoutService = async (userId, shippingAddress, couponCode = null) => {
    const session = await mongoose.startSession();

    try {
        let createdOrder;

        await session.withTransaction(async () => {
            // 1. Get customer's cart
            const cart = await Cart.findOne({ userId }).session(session);

            if (!cart || cart.items.length === 0) {
                const error = new Error("Cart is empty");
                error.statusCode = 400;
                throw error;
            }

            // 2. Validate shipping address
            const requiredFields = [
                "name",
                "phone",
                "addressLine1",
                "city",
                "state",
                "postalCode"
            ];

            for (const field of requiredFields) {
                if (!shippingAddress[field]) {
                    const error = new Error(
                        `${field} is required`
                    );
                    error.statusCode = 400;
                    throw error;
                }
            }

            // Seller orders grouped by seller
            const sellerOrderMap = new Map();

            let totalAmount = 0;

            // 3. Validate every cart item
            for (const cartItem of cart.items) {
                const product = await Product.findOne({
                    _id: cartItem.productId,
                    status: "approved"
                }).session(session);

                if (!product) {
                    const error = new Error(
                        "One of the products is no longer available"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                const variant = await ProductVariant.findOne({
                    _id: cartItem.variantId,
                    productId: cartItem.productId,
                    isActive: true
                }).session(session);

                if (!variant) {
                    const error = new Error(
                        "One of the product variants is no longer available"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                // 4. Reserve inventory atomically
                const inventory = await Inventory.findOneAndUpdate(
                    {
                        variantId: cartItem.variantId,
                        $expr: {
                            $gte: [
                                {
                                    $subtract: [
                                        "$quantity",
                                        "$reservedQuantity"
                                    ]
                                },
                                cartItem.quantity
                            ]
                        }
                    },
                    {
                        $inc: {
                            reservedQuantity: cartItem.quantity
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!inventory) {
                    const error = new Error(
                        `Insufficient stock for ${product.name}`
                    );
                    error.statusCode = 400;
                    throw error;
                }

                // 5. Calculate subtotal using variant price
                const price = variant.price;

                const subtotal =
                    price * cartItem.quantity;

                totalAmount += subtotal;

                // 6. Group items by seller
                const sellerId = product.sellerId.toString();

                if (!sellerOrderMap.has(sellerId)) {
                    sellerOrderMap.set(sellerId, {
                        sellerId: product.sellerId,
                        items: [],
                        subtotal: 0
                    });
                }

                const sellerOrder =
                    sellerOrderMap.get(sellerId);

                sellerOrder.items.push({
                    productId: product._id,
                    variantId: variant._id,
                    sellerId: product.sellerId,
                    quantity: cartItem.quantity,
                    price,
                    subtotal
                });

                sellerOrder.subtotal += subtotal;
            }

            // 7. Convert grouped seller orders into array
            const sellerOrders =
                Array.from(sellerOrderMap.values());

            // 8. Create order
            const orders = await Order.create(
                [
                    {
                        userId,
                        sellerOrders,
                        totalAmount,
                        paymentStatus: "pending",
                        orderStatus: "pending",
                        shippingAddress
                    }
                ],
                { session }
            );

            createdOrder = orders[0];

            // 9. Clear cart
            cart.items = [];
            await cart.save({ session });
        });

        const notification =notificationTemplates.orderPlaced(createdOrder._id);

        await createNotificationService(
            userId,
            notification.type,
            notification.title,
            notification.message,
            notification.relatedId,
            notification.relatedType
        );

        return await Order.findById(createdOrder._id)
            .populate(
                "sellerOrders.sellerId",
                "businessName businessEmail"
            )
            .populate(
                "sellerOrders.items.productId",
                "name slug images"
            )
            .populate(
                "sellerOrders.items.variantId",
                "sku attributes price"
            );
    } finally {
        await session.endSession();
    }
};


export const getMyOrdersService = async (userId) => {
    return await Order.find({ userId })
        .populate(
            "sellerOrders.sellerId",
            "businessName businessEmail"
        )
        .populate(
            "sellerOrders.items.productId",
            "name slug images"
        )
        .populate(
            "sellerOrders.items.variantId",
            "sku attributes price"
        )
        .sort({ createdAt: -1 });
};


export const getOrderByIdService = async (userId, orderId) => {
    const order = await Order.findOne({
        _id: orderId,
        userId
    })
        .populate(
            "sellerOrders.sellerId",
            "businessName businessEmail"
        )
        .populate(
            "sellerOrders.items.productId",
            "name slug images"
        )
        .populate(
            "sellerOrders.items.variantId",
            "sku attributes price"
        );

    if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
    }

    return order;
};

export const getSellerOrdersService = async (sellerId) => {
    const orders = await Order.find({
        "sellerOrders.sellerId": sellerId
    })
        .populate(
            "userId",
            "name email"
        )
        .populate(
            "sellerOrders.items.productId",
            "name slug images"
        )
        .populate(
            "sellerOrders.items.variantId",
            "sku attributes price"
        )
        .sort({ createdAt: -1 });

    return orders.map((order) => {
        const sellerOrder = order.sellerOrders.find(
            (sellerOrder) =>
                sellerOrder.sellerId.toString() === sellerId.toString()
        );

        return {
            orderId: order._id,
            customer: order.userId,
            shippingAddress: order.shippingAddress,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            createdAt: order.createdAt,
            sellerOrder
        };
    });
};

export const updateSellerOrderStatusService = async (
    sellerId,
    orderId,
    status
) => {
    const allowedStatuses = [
        "processing",
        "shipped",
        "delivered",
        "cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
        const error = new Error("Invalid order status");
        error.statusCode = 400;
        throw error;
    }

    const order = await Order.findOne({
        _id: orderId,
        "sellerOrders.sellerId": sellerId
    });

    if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
    }

    const sellerOrder = order.sellerOrders.find(
        (sellerOrder) =>
            sellerOrder.sellerId.toString() === sellerId.toString()
    );

    if (!sellerOrder) {
        const error = new Error("Seller order not found");
        error.statusCode = 404;
        throw error;
    }

    const currentStatus = sellerOrder.status;

    const validTransitions = {
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered"],
        delivered: [],
        cancelled: []
    };

    if (!validTransitions[currentStatus]?.includes(status)) {
        const error = new Error(
            `Cannot change order status from ${currentStatus} to ${status}`
        );
        error.statusCode = 400;
        throw error;
    }

    if (status === "cancelled") {
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                for (const item of sellerOrder.items) {
                    const inventory = await Inventory.findOneAndUpdate(
                        {
                            variantId: item.variantId
                        },
                        {
                            $inc: {
                                reservedQuantity: -item.quantity
                            }
                        },
                        {
                            new: true,
                            session
                        }
                    );

                    if (!inventory || inventory.reservedQuantity < 0) {
                        const error = new Error(
                            "Unable to release reserved inventory"
                        );
                        error.statusCode = 400;
                        throw error;
                    }
                }

                sellerOrder.status = "cancelled";

                const allCancelled = order.sellerOrders.every(
                    (sellerOrder) =>
                        sellerOrder.status === "cancelled"
                );

                if (allCancelled) {
                    order.orderStatus = "cancelled";
                }

                await order.save({ session });
            });
        } finally {
            await session.endSession();
        }
    } else {
        sellerOrder.status = status;

        const sellerStatuses = order.sellerOrders.map(
            (sellerOrder) => sellerOrder.status
        );

        if (status === "shipped") {
            const notification =
                notificationTemplates.orderShipped(
                    order._id
                );

            await createNotificationService(
                order.userId,
                notification.type,
                notification.title,
                notification.message,
                notification.relatedId,
                notification.relatedType
            );
        }

        if (sellerStatuses.includes("shipped")) {
            order.orderStatus = "shipped";
        } else if (sellerStatuses.includes("processing")) {
            order.orderStatus = "processing";
        } else if (
            sellerStatuses.every(
                (status) => status === "delivered"
            )
        ) {
            order.orderStatus = "delivered";
        } else if (
            sellerStatuses.every(
                (status) =>
                    status === "confirmed" ||
                    status === "processing"
            )
        ) {
            order.orderStatus = "confirmed";
        }

        await order.save();
    }

    return sellerOrder;
};

export const cancelOrderService = async (userId, orderId) => {
    const session = await mongoose.startSession();

    try {
        let cancelledOrder;

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

            if (
                order.paymentStatus === "paid" &&
                order.orderStatus !== "pending" &&
                order.orderStatus !== "confirmed"
            ) {
                const error = new Error(
                    "Order can no longer be cancelled"
                );
                error.statusCode = 400;
                throw error;
            }

            if (order.orderStatus === "cancelled") {
                const error = new Error("Order is already cancelled");
                error.statusCode = 400;
                throw error;
            }

            if (order.orderStatus === "delivered") {
                const error = new Error(
                    "Delivered orders cannot be cancelled"
                );
                error.statusCode = 400;
                throw error;
            }

            for (const sellerOrder of order.sellerOrders) {
                if (sellerOrder.status === "cancelled") {
                    continue;
                }

                if (
                    sellerOrder.status === "shipped" ||
                    sellerOrder.status === "delivered"
                ) {
                    const error = new Error(
                        "Order cannot be cancelled after shipping"
                    );
                    error.statusCode = 400;
                    throw error;
                }

                for (const item of sellerOrder.items) {
                    const inventory = await Inventory.findOneAndUpdate(
                        {
                            variantId: item.variantId,
                            reservedQuantity: {
                                $gte: item.quantity
                            }
                        },
                        {
                            $inc: {
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
                            "Unable to release reserved inventory"
                        );
                        error.statusCode = 400;
                        throw error;
                    }
                }

                sellerOrder.status = "cancelled";
            }

            order.orderStatus = "cancelled";

            if (order.paymentStatus === "paid") {
                order.paymentStatus = "refunded";
            }

            await order.save({ session });

            cancelledOrder = order;
        });

        return cancelledOrder;
    } finally {
        await session.endSession();
    }
};