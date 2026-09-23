import { processMockPaymentService } from "../services/paymentService.js";

export const processMockPayment = async (req, res, next) => {
    try {
        const { orderId } = req.params;

        const order = await processMockPaymentService(
            req.user.userId,
            orderId
        );

        res.status(200).json({
            success: true,
            message: "Payment successful",
            order
        });
    } catch (error) {
        next(error);
    }
};