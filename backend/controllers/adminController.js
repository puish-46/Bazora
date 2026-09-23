import { getPendingSellersService , approveSellerService , rejectSellerService } from "../services/adminService.js";

export const getPendingSellers = async (req, res, next) => {
    try {
        const sellers = await getPendingSellersService();

        res.status(200).json({
            success: true,
            count: sellers.length,
            sellers
        });

    } catch (error) {
        next(error);
    }
};

export const approveSeller = async (req, res, next) => {
    try {
        const seller = await approveSellerService(req.params.id);

        res.status(200).json({
            success: true,
            message: "Seller approved successfully",
            seller
        });

    } catch (error) {
        next(error);
    }
};

export const rejectSeller = async (req, res, next) => {
    try {
        const seller = await rejectSellerService(req.params.id);

        res.status(200).json({
            success: true,
            message: "Seller rejected successfully",
            seller
        });

    } catch (error) {
        next(error);
    }
};