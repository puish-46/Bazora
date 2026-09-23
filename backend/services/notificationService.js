import Notification from "../models/Notification.js";


// ==========================================
// CREATE NOTIFICATION
// ==========================================

export const createNotificationService = async (
    userId,
    type,
    title,
    message,
    relatedId = null,
    relatedType = null
) => {
    return await Notification.create({
        userId,
        type,
        title,
        message,
        relatedId,
        relatedType
    });
};


// ==========================================
// GET MY NOTIFICATIONS
// ==========================================

export const getMyNotificationsService = async (
    userId,
    page = 1,
    limit = 20,
    unreadOnly = false
) => {
    const currentPage = Math.max(
        Number(page),
        1
    );

    const itemsPerPage = Math.min(
        Math.max(Number(limit), 1),
        50
    );

    const filter = {
        userId
    };

    if (
        unreadOnly === true ||
        unreadOnly === "true"
    ) {
        filter.isRead = false;
    }

    const skip =
        (currentPage - 1) * itemsPerPage;

    const [
        notifications,
        totalNotifications,
        unreadCount
    ] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage),

        Notification.countDocuments(filter),

        Notification.countDocuments({
            userId,
            isRead: false
        })
    ]);

    const totalPages = Math.ceil(
        totalNotifications / itemsPerPage
    );

    return {
        notifications,
        unreadCount,
        pagination: {
            currentPage,
            itemsPerPage,
            totalNotifications,
            totalPages,
            hasNextPage:
                currentPage < totalPages,
            hasPreviousPage:
                currentPage > 1
        }
    };
};


// ==========================================
// MARK ONE AS READ
// ==========================================

export const markNotificationReadService = async (
    userId,
    notificationId
) => {
    const notification =
        await Notification.findOne({
            _id: notificationId,
            userId
        });

    if (!notification) {
        const error = new Error(
            "Notification not found"
        );
        error.statusCode = 404;
        throw error;
    }

    notification.isRead = true;

    await notification.save();

    return notification;
};


// ==========================================
// MARK ALL AS READ
// ==========================================

export const markAllNotificationsReadService =
    async (userId) => {
        await Notification.updateMany(
            {
                userId,
                isRead: false
            },
            {
                $set: {
                    isRead: true
                }
            }
        );

        return {
            message:
                "All notifications marked as read"
        };
    };


// ==========================================
// DELETE NOTIFICATION
// ==========================================

export const deleteNotificationService = async (
    userId,
    notificationId
) => {
    const notification =
        await Notification.findOne({
            _id: notificationId,
            userId
        });

    if (!notification) {
        const error = new Error(
            "Notification not found"
        );
        error.statusCode = 404;
        throw error;
    }

    await notification.deleteOne();

    return {
        message:
            "Notification deleted successfully"
    };
};