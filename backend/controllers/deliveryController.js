import {
    assignDeliveryPartnerService,
    getMyDeliveriesService,
    updateDeliveryStatusService
} from "../services/deliveryService.js";

export const assignDeliveryPartner = async (
    req,
    res,
    next
) => {
    try {
        const { orderId } = req.params;
        const {
            sellerOrderId,
            deliveryPartnerId
        } = req.body;

        if (!sellerOrderId || !deliveryPartnerId) {
            return res.status(400).json({
                success: false,
                message:
                    "sellerOrderId and deliveryPartnerId are required"
            });
        }

        const delivery =
            await assignDeliveryPartnerService(
                orderId,
                sellerOrderId,
                deliveryPartnerId
            );

        res.status(201).json({
            success: true,
            message:
                "Delivery partner assigned successfully",
            delivery
        });
    } catch (error) {
        next(error);
    }
};


export const getMyDeliveries = async (
    req,
    res,
    next
) => {
    try {
        const deliveries =
            await getMyDeliveriesService(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            deliveries
        });
    } catch (error) {
        next(error);
    }
};


export const updateDeliveryStatus = async (
    req,
    res,
    next
) => {
    try {
        const { deliveryId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const delivery =
            await updateDeliveryStatusService(
                req.user.userId,
                deliveryId,
                status
            );

        res.status(200).json({
            success: true,
            message:
                "Delivery status updated successfully",
            delivery
        });
    } catch (error) {
        next(error);
    }
};