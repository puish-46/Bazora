import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        sku: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },

        attributes: {
            type: Map,
            of: String,
            default: {}
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        images: [
            {
                type: String,
                trim: true
            }
        ],

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

const ProductVariant = mongoose.model(
    "ProductVariant",
    productVariantSchema
);

export default ProductVariant;