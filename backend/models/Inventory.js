import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
    {
        variantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductVariant",
            required: true,
            unique: true,
            index: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        reservedQuantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        lowStockThreshold: {
            type: Number,
            required: true,
            min: 0,
            default: 5
        }
    },
    { timestamps: true }
);

inventorySchema.virtual("availableQuantity").get(function () {
    return this.quantity - this.reservedQuantity;
});

inventorySchema.set("toJSON", {
    virtuals: true
});

inventorySchema.set("toObject", {
    virtuals: true
});

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;