import mongoose from "mongoose";

const sellerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true
        },

        businessName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        businessEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected", "suspended"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

const Seller = mongoose.model("Seller", sellerSchema);

export default Seller;