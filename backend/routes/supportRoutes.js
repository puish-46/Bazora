import express from "express";

import {
    createTicket,
    getMyTickets,
    getMyTicketById,
    getSupportTickets,
    assignTicket,
    addCustomerMessage,
    addAgentMessage,
    updateTicketStatus
} from "../controllers/supportController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();


// ========================
// CUSTOMER
// ========================

router.post(
    "/",
    protect,
    authorize("customer"),
    createTicket
);

router.get(
    "/my",
    protect,
    authorize("customer"),
    getMyTickets
);

router.get(
    "/my/:ticketId",
    protect,
    authorize("customer"),
    getMyTicketById
);

router.post(
    "/:ticketId/messages",
    protect,
    authorize("customer"),
    addCustomerMessage
);


// ========================
// SUPPORT AGENT
// ========================

router.get(
    "/",
    protect,
    authorize("support"),
    getSupportTickets
);

router.patch(
    "/:ticketId/assign",
    protect,
    authorize("support"),
    assignTicket
);

router.post(
    "/:ticketId/messages/agent",
    protect,
    authorize("support"),
    addAgentMessage
);

router.patch(
    "/:ticketId/status",
    protect,
    authorize("support"),
    updateTicketStatus
);

export default router;