import mongoose from "mongoose";

const ticketMessageSchema = new mongoose.Schema(
    {
        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SupportTicket",
            required: true,
            index: true
        },

        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        message: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 3000
        }
    },
    { timestamps: true }
);

const TicketMessage = mongoose.model(
    "TicketMessage",
    ticketMessageSchema
);

export default TicketMessage;