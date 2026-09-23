import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true
        },

        sellerOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        sellerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Seller",
            required: true,
            index: true
        },

        grossAmount: {
            type: Number,
            required: true,
            min: 0
        },

        commissionPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 10
        },

        commissionAmount: {
            type: Number,
            required: true,
            min: 0
        },

        netAmount: {
            type: Number,
            required: true,
            min: 0
        },

        status: {
            type: String,
            enum: ["pending", "paid"],
            default: "pending",
            index: true
        },

        paidAt: {
            type: Date,
            default: null
        },

        paymentReference: {
            type: String,
            default: null,
            trim: true
        }
    },
    { timestamps: true }
);

settlementSchema.index(
    { orderId: 1, sellerOrderId: 1 },
    { unique: true }
);

const Settlement = mongoose.model(
    "Settlement",
    settlementSchema
);

export default Settlement;