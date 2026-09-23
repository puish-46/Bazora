import {
    createReturnRequestService,
    getMyReturnsService,
    getSellerReturnsService,
    updateReturnStatusService,
    processMockRefundService
} from "../services/returnService.js";

export const createReturnRequest = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Return reason is required"
            });
        }

        const returnRequest =
            await createReturnRequestService(
                req.user.userId,
                orderId,
                reason
            );

        res.status(201).json({
            success: true,
            message: "Return request created successfully",
            returnRequest
        });
    } catch (error) {
        next(error);
    }
};

export const getMyReturns = async (req, res, next) => {
    try {
        const returns = await getMyReturnsService(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            returns
        });
    } catch (error) {
        next(error);
    }
};


export const getSellerReturns = async (req, res, next) => {
    try {
        const returns = await getSellerReturnsService(
            req.seller._id
        );

        res.status(200).json({
            success: true,
            returns
        });
    } catch (error) {
        next(error);
    }
};


export const updateReturnStatus = async (req, res, next) => {
    try {
        const { returnId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const returnRequest =
            await updateReturnStatusService(
                req.seller._id,
                returnId,
                status
            );

        res.status(200).json({
            success: true,
            message: "Return status updated successfully",
            returnRequest
        });
    } catch (error) {
        next(error);
    }
};


export const processMockRefund = async (req, res, next) => {
    try {
        const { returnId } = req.params;

        const returnRequest =
            await processMockRefundService(
                req.seller._id,
                returnId
            );

        res.status(200).json({
            success: true,
            message: "Refund processed successfully",
            returnRequest
        });
    } catch (error) {
        next(error);
    }
};