import mongoose from "mongoose";

const returnItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant",
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        }
    },
    { _id: true }
);

const returnRequestSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
            index: true
        },

        items: [returnItemSchema],

        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500
        },

        status: {
            type: String,
            enum: [
                "requested",
                "approved",
                "rejected",
                "picked_up",
                "received",
                "refunded",
                "cancelled"
            ],
            default: "requested",
            index: true
        },

        refundAmount: {
            type: Number,
            required: true,
            min: 0
        },

        refundTransactionId: {
            type: String,
            default: null
        },

        refundedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const ReturnRequest = mongoose.model(
    "ReturnRequest",
    returnRequestSchema
);

export default ReturnRequest;