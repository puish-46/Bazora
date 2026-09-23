import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        subject: {
            type: String,
            required: true,
            trim: true,
            minlength: 5,
            maxlength: 200
        },

        description: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 2000
        },

        category: {
            type: String,
            enum: [
                "order",
                "payment",
                "delivery",
                "return",
                "refund",
                "product",
                "account",
                "other"
            ],
            default: "other"
        },

        priority: {
            type: String,
            enum: [
                "low",
                "medium",
                "high",
                "urgent"
            ],
            default: "medium"
        },

        status: {
            type: String,
            enum: [
                "open",
                "in_progress",
                "resolved",
                "closed"
            ],
            default: "open",
            index: true
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },

        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        },

        resolvedAt: {
            type: Date,
            default: null
        },

        closedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const SupportTicket = mongoose.model(
    "SupportTicket",
    supportTicketSchema
);

export default SupportTicket;