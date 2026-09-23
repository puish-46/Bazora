import {
    getMyNotificationsService,
    markNotificationReadService,
    markAllNotificationsReadService,
    deleteNotificationService
} from "../services/notificationService.js";


export const getMyNotifications = async (
    req,
    res,
    next
) => {
    try {
        const {
            page = 1,
            limit = 20,
            unreadOnly = false
        } = req.query;

        const result =
            await getMyNotificationsService(
                req.user.userId,
                page,
                limit,
                unreadOnly
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};


export const markNotificationRead = async (
    req,
    res,
    next
) => {
    try {
        const { notificationId } =
            req.params;

        const notification =
            await markNotificationReadService(
                req.user.userId,
                notificationId
            );

        res.status(200).json({
            success: true,
            message:
                "Notification marked as read",
            notification
        });
    } catch (error) {
        next(error);
    }
};


export const markAllNotificationsRead = async (
    req,
    res,
    next
) => {
    try {
        const result =
            await markAllNotificationsReadService(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};


export const deleteNotification = async (
    req,
    res,
    next
) => {
    try {
        const { notificationId } =
            req.params;

        const result =
            await deleteNotificationService(
                req.user.userId,
                notificationId
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};