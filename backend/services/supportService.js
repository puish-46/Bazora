import SupportTicket from "../models/SupportTicket.js";
import TicketMessage from "../models/TicketMessage.js";
import User from "../models/User.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import { validateObjectId } from "../utils/securityUtils.js";


export const createTicketService = async (
    userId,
    subject,
    description,
    category,
    priority,
    orderId
) => {
    validateObjectId(userId, "userId");

    if (orderId) {
        validateObjectId(orderId, "orderId");
        const Order = (
            await import("../models/Order.js")
        ).default;

        const order = await Order.findOne({
            _id: orderId,
            userId
        });

        if (!order) {
            const error = new Error(
                "Order not found"
            );
            error.statusCode = 404;
            throw error;
        }
    }

    return await SupportTicket.create({
        userId,
        subject,
        description,
        category,
        priority,
        orderId: orderId || null
    });
};


export const getMyTicketsService = async (
    userId
) => {
    validateObjectId(userId, "userId");
    return await SupportTicket.find({
        userId
    })
        .populate(
            "assignedTo",
            "name email role"
        )
        .populate(
            "orderId",
            "totalAmount orderStatus paymentStatus"
        )
        .sort({ createdAt: -1 });
};


export const getTicketByIdService = async (
    userId,
    ticketId
) => {
    validateObjectId(userId, "userId");
    validateObjectId(ticketId, "ticketId");

    const ticket = await SupportTicket.findOne({
        _id: ticketId,
        userId
    })
        .populate(
            "assignedTo",
            "name email role"
        )
        .populate(
            "orderId",
            "totalAmount orderStatus paymentStatus"
        );

    if (!ticket) {
        const error = new Error(
            "Support ticket not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const messages = await TicketMessage.find({
        ticketId
    })
        .populate(
            "senderId",
            "name email role"
        )
        .sort({ createdAt: 1 });

    return {
        ticket,
        messages
    };
};


export const getSupportTicketsService = async (
    status,
    priority
) => {
    const filter = {};

    if (status) {
        filter.status = status;
    }

    if (priority) {
        filter.priority = priority;
    }

    return await SupportTicket.find(filter)
        .populate(
            "userId",
            "name email"
        )
        .populate(
            "assignedTo",
            "name email role"
        )
        .populate(
            "orderId",
            "totalAmount orderStatus paymentStatus"
        )
        .sort({
            priority: -1,
            createdAt: 1
        });
};


export const assignTicketService = async (
    ticketId,
    supportAgentId
) => {
    validateObjectId(ticketId, "ticketId");
    validateObjectId(supportAgentId, "supportAgentId");

    const agent = await User.findOne({
        _id: supportAgentId,
        role: "support"
    });

    if (!agent) {
        const error = new Error(
            "Support agent not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const ticket = await SupportTicket.findById(
        ticketId
    );

    if (!ticket) {
        const error = new Error(
            "Support ticket not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status === "closed") {
        const error = new Error(
            "Closed tickets cannot be assigned"
        );
        error.statusCode = 400;
        throw error;
    }

    ticket.assignedTo = supportAgentId;
    ticket.status = "in_progress";

    await ticket.save();

    return ticket;
};


export const addTicketMessageService = async (
    senderId,
    ticketId,
    message,
    isSupportAgent
) => {
    validateObjectId(senderId, "senderId");
    validateObjectId(ticketId, "ticketId");

    if (!message || typeof message !== "string" || message.trim().length === 0) {
        const error = new Error("Message is required");
        error.statusCode = 400;
        throw error;
    }

    if (message.length > 5000) {
        const error = new Error("Message exceeds maximum length of 5000 characters");
        error.statusCode = 400;
        throw error;
    }

    const ticket = await SupportTicket.findById(
        ticketId
    );

    if (!ticket) {
        const error = new Error(
            "Support ticket not found"
        );
        error.statusCode = 404;
        throw error;
    }

    if (ticket.status === "closed") {
        const error = new Error(
            "Cannot reply to a closed ticket"
        );
        error.statusCode = 400;
        throw error;
    }

    if (isSupportAgent) {
        if (
            ticket.assignedTo &&
            ticket.assignedTo.toString() !==
                senderId.toString()
        ) {
            const error = new Error(
                "This ticket is assigned to another support agent"
            );
            error.statusCode = 403;
            throw error;
        }
    } else {
        if (
            ticket.userId.toString() !==
            senderId.toString()
        ) {
            const error = new Error(
                "You do not have access to this ticket"
            );
            error.statusCode = 403;
            throw error;
        }
    }

    const ticketMessage =
        await TicketMessage.create({
            ticketId,
            senderId,
            message
        });

        if (isSupportAgent) {
            const notification =
                notificationTemplates.supportReply(
                    ticket._id
                );

            await createNotificationService(
                ticket.userId,
                notification.type,
                notification.title,
                notification.message,
                notification.relatedId,
                notification.relatedType
            );
        }

    return await TicketMessage.findById(
        ticketMessage._id
    ).populate(
        "senderId",
        "name email role"
    );
};


export const updateTicketStatusService = async (
    supportAgentId,
    ticketId,
    status
) => {
    validateObjectId(supportAgentId, "supportAgentId");
    validateObjectId(ticketId, "ticketId");

    const allowedStatuses = [
        "open",
        "in_progress",
        "resolved",
        "closed"
    ];

    if (!allowedStatuses.includes(status)) {
        const error = new Error(
            "Invalid ticket status"
        );
        error.statusCode = 400;
        throw error;
    }

    const ticket = await SupportTicket.findOne({
        _id: ticketId,
        assignedTo: supportAgentId
    });

    if (!ticket) {
        const error = new Error(
            "Assigned support ticket not found"
        );
        error.statusCode = 404;
        throw error;
    }

    const validTransitions = {
        open: ["in_progress"],
        in_progress: ["resolved", "open"],
        resolved: ["closed", "in_progress"],
        closed: []
    };

    if (
        !validTransitions[ticket.status]?.includes(
            status
        )
    ) {
        const error = new Error(
            `Cannot change ticket status from ${ticket.status} to ${status}`
        );
        error.statusCode = 400;
        throw error;
    }

    ticket.status = status;

    if (status === "resolved") {
        ticket.resolvedAt = new Date();
    }

    if (status === "closed") {
        ticket.closedAt = new Date();
    }

    await ticket.save();

    return ticket;
};