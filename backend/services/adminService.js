import Seller from "../models/Seller.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";

export const getPendingSellersService = async () => {
    return await Seller.find({
        approvalStatus: "pending"
    })
        .populate("userId", "name email")
        .sort({ createdAt: -1 });
};

export const approveSellerService = async (sellerId) => {
    const seller = await Seller.findById(sellerId);

    if (!seller) {
        const error = new Error("Seller application not found");
        error.statusCode = 404;
        throw error;
    }

    if (seller.approvalStatus === "approved") {
        const error = new Error("Seller is already approved");
        error.statusCode = 400;
        throw error;
    }

    seller.approvalStatus = "approved";

    await seller.save();

    await User.findByIdAndUpdate(seller.userId, { role: "seller" });

    const notification = notificationTemplates.sellerApproved(seller._id);

    await createNotificationService(
        seller.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    return seller;
};

export const rejectSellerService = async (sellerId) => {
    const seller = await Seller.findById(sellerId);

    if (!seller) {
        const error = new Error("Seller application not found");
        error.statusCode = 404;
        throw error;
    }

    if (seller.approvalStatus === "rejected") {
        const error = new Error("Seller is already rejected");
        error.statusCode = 400;
        throw error;
    }

    seller.approvalStatus = "rejected";

    await seller.save();

    const notification = notificationTemplates.sellerRejected(seller._id);

    await createNotificationService(
        seller.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );
    

    return seller;
};