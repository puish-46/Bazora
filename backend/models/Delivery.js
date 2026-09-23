import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
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
            required: true
        },

        deliveryPartnerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        status: {
            type: String,
            enum: [
                "assigned",
                "picked_up",
                "out_for_delivery",
                "delivered",
                "cancelled"
            ],
            default: "assigned",
            index: true
        },

        pickedUpAt: {
            type: Date,
            default: null
        },

        outForDeliveryAt: {
            type: Date,
            default: null
        },

        deliveredAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

const Delivery = mongoose.model("Delivery", deliverySchema);

export default Delivery;