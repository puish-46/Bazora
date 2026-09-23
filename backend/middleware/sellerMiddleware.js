import Seller from "../models/Seller.js";

export const approvedSeller = async (req, res, next) => {
    try {
        const seller = await Seller.findOne({
            userId: req.user.userId
        });

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller profile not found"
            });
        }

        if (seller.approvalStatus !== "approved") {
            return res.status(403).json({
                success: false,
                message: "Seller account is not approved"
            });
        }

        req.seller = seller;

        next();

    } catch (error) {
        next(error);
    }
};