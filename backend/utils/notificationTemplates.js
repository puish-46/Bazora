export const notificationTemplates = {
    sellerApproved: (sellerId) => ({
        type: "seller",
        title: "Seller application approved",
        message: "Your seller application has been approved. You can now start selling on Bazora.",
        relatedId: sellerId,
        relatedType: "Seller"
    }),

    sellerRejected: (sellerId) => ({
        type: "seller",
        title: "Seller application rejected",
        message: "Your seller application has been rejected.",
        relatedId: sellerId,
        relatedType: "Seller"
    }),

    orderPlaced: (orderId) => ({
        type: "order",
        title: "Order placed",
        message: "Your order has been placed successfully.",
        relatedId: orderId,
        relatedType: "Order"
    }),

    paymentSuccessful: (orderId) => ({
        type: "payment",
        title: "Payment successful",
        message: "Your payment was completed successfully.",
        relatedId: orderId,
        relatedType: "Payment"
    }),

    orderShipped: (orderId) => ({
        type: "delivery",
        title: "Order shipped",
        message: "Your order has been shipped.",
        relatedId: orderId,
        relatedType: "Order"
    }),

    deliveryAssigned: (deliveryId) => ({
        type: "delivery",
        title: "New delivery assigned",
        message: "A new delivery has been assigned to you.",
        relatedId: deliveryId,
        relatedType: "Delivery"
    }),

    orderOutForDelivery: (orderId) => ({
        type: "delivery",
        title: "Out for delivery",
        message: "Your order is out for delivery.",
        relatedId: orderId,
        relatedType: "Order"
    }),

    orderDelivered: (orderId) => ({
        type: "delivery",
        title: "Order delivered",
        message: "Your order has been delivered successfully.",
        relatedId: orderId,
        relatedType: "Order"
    }),

    returnRequested: (returnId) => ({
        type: "return",
        title: "Return requested",
        message: "A customer has requested a return.",
        relatedId: returnId,
        relatedType: "ReturnRequest"
    }),

    returnStatusUpdated: (returnId, status) => ({
        type: "return",
        title: "Return request updated",
        message: `Your return request is now ${status.replace("_", " ")}.`,
        relatedId: returnId,
        relatedType: "ReturnRequest"
    }),

    refundProcessed: (returnId) => ({
        type: "refund",
        title: "Refund processed",
        message: "Your refund has been processed successfully.",
        relatedId: returnId,
        relatedType: "ReturnRequest"
    }),

    supportReply: (ticketId) => ({
        type: "support",
        title: "Support ticket updated",
        message: "You have a new reply on your support ticket.",
        relatedId: ticketId,
        relatedType: "SupportTicket"
    }),

    settlementCreated: (settlementId) => ({
        type: "seller",
        title: "Settlement created",
        message: "A new seller settlement has been created for your order.",
        relatedId: settlementId,
        relatedType: "Settlement"
    }),

    settlementPaid: (settlementId) => ({
        type: "seller",
        title: "Settlement paid",
        message: "Your seller settlement has been paid successfully.",
        relatedId: settlementId,
        relatedType: "Settlement"
    })
};  