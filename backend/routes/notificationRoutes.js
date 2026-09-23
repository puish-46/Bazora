import express from "express";

import {
    getMyNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification
} from "../controllers/notificationController.js";

import {
    protect
} from "../middleware/authMiddleware.js";

const router = express.Router();


// Get notifications
router.get(
    "/",
    protect,
    getMyNotifications
);


// Mark all as read
router.patch(
    "/read-all",
    protect,
    markAllNotificationsRead
);


// Mark one as read
router.patch(
    "/:notificationId/read",
    protect,
    markNotificationRead
);


// Delete one
router.delete(
    "/:notificationId",
    protect,
    deleteNotification
);

export default router;