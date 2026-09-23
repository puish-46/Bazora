import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: [
                "order",
                "payment",
                "delivery",
                "return",
                "refund",
                "review",
                "support",
                "seller",
                "system"
            ],
            required: true
        },

        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },

        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        relatedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        relatedType: {
            type: String,
            enum: [
                "Order",
                "Payment",
                "Delivery",
                "ReturnRequest",
                "Review",
                "SupportTicket",
                "Seller",
                "Settlement",
                null
            ],
            default: null
        },

        isRead: {
            type: Boolean,
            default: false,
            index: true
        }
    },
    { timestamps: true }
);

notificationSchema.index({
    userId: 1,
    createdAt: -1
});

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;