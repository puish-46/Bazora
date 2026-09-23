import {
    createTicketService,
    getMyTicketsService,
    getTicketByIdService,
    getSupportTicketsService,
    assignTicketService,
    addTicketMessageService,
    updateTicketStatusService
} from "../services/supportService.js";


export const createTicket = async (
    req,
    res,
    next
) => {
    try {
        const {
            subject,
            description,
            category,
            priority,
            orderId
        } = req.body;

        if (!subject || !description) {
            return res.status(400).json({
                success: false,
                message:
                    "Subject and description are required"
            });
        }

        const ticket =
            await createTicketService(
                req.user.userId,
                subject,
                description,
                category,
                priority,
                orderId
            );

        res.status(201).json({
            success: true,
            message:
                "Support ticket created successfully",
            ticket
        });
    } catch (error) {
        next(error);
    }
};


export const getMyTickets = async (
    req,
    res,
    next
) => {
    try {
        const tickets =
            await getMyTicketsService(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            tickets
        });
    } catch (error) {
        next(error);
    }
};


export const getMyTicketById = async (
    req,
    res,
    next
) => {
    try {
        const { ticketId } = req.params;

        const result =
            await getTicketByIdService(
                req.user.userId,
                ticketId
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};


export const getSupportTickets = async (
    req,
    res,
    next
) => {
    try {
        const {
            status,
            priority
        } = req.query;

        const tickets =
            await getSupportTicketsService(
                status,
                priority
            );

        res.status(200).json({
            success: true,
            tickets
        });
    } catch (error) {
        next(error);
    }
};


export const assignTicket = async (
    req,
    res,
    next
) => {
    try {
        const { ticketId } = req.params;

        const ticket =
            await assignTicketService(
                ticketId,
                req.user.userId
            );

        res.status(200).json({
            success: true,
            message:
                "Ticket assigned successfully",
            ticket
        });
    } catch (error) {
        next(error);
    }
};


export const addCustomerMessage = async (
    req,
    res,
    next
) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const ticketMessage =
            await addTicketMessageService(
                req.user.userId,
                ticketId,
                message,
                false
            );

        res.status(201).json({
            success: true,
            message:
                "Message added successfully",
            ticketMessage
        });
    } catch (error) {
        next(error);
    }
};


export const addAgentMessage = async (
    req,
    res,
    next
) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            });
        }

        const ticketMessage =
            await addTicketMessageService(
                req.user.userId,
                ticketId,
                message,
                true
            );

        res.status(201).json({
            success: true,
            message:
                "Message added successfully",
            ticketMessage
        });
    } catch (error) {
        next(error);
    }
};


export const updateTicketStatus = async (
    req,
    res,
    next
) => {
    try {
        const { ticketId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Status is required"
            });
        }

        const ticket =
            await updateTicketStatusService(
                req.user.userId,
                ticketId,
                status
            );

        res.status(200).json({
            success: true,
            message:
                "Ticket status updated successfully",
            ticket
        });
    } catch (error) {
        next(error);
    }
};