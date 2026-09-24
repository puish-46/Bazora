import {
    checkoutService,
    getMyOrdersService,
    getOrderByIdService,
    getSellerOrdersService,
    updateSellerOrderStatusService,
    cancelOrderService
} from "../services/orderService.js";

export const checkout = async (req, res, next) => {
    try {
        const { shippingAddress, couponCode } = req.body;

        if (!shippingAddress) {
            return res.status(400).json({
                success: false,
                message: "Shipping address is required"
            });
        }

        const order = await checkoutService(
            req.user.userId,
            shippingAddress,
            couponCode
        );

        res.status(201).json({
            success: true,
            message: "Order created successfully",
            order
        });
    } catch (error) {
        next(error);
    }
};

export const getMyOrders = async (req, res, next) => {
    try {
        const orders = await getMyOrdersService(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const order = await getOrderByIdService(
            req.user.userId,
            orderId
        );

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        next(error);
    }
};

export const getSellerOrders = async (req, res, next) => {
    try {
        const orders = await getSellerOrdersService(
            req.seller._id
        );

        res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        next(error);
    }
};

export const updateSellerOrderStatus = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const sellerOrder = await updateSellerOrderStatusService(
            req.seller._id,
            orderId,
            status
        );

        res.status(200).json({
            success: true,
            message: "Order status updated successfully",
            sellerOrder
        });
    } catch (error) {
        next(error);
    }
};

export const cancelOrder = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const order = await cancelOrderService(
            req.user.userId,
            orderId
        );

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            order
        });
    } catch (error) {
        next(error);
    }
};