import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";

export const createAuditLog = async ({
    userId,
    action,
    resourceType,
    resourceId = null,
    details = {}
}) => {
    try {
        if (!userId || !action || !resourceType) {
            return null;
        }

        let validResourceId = null;
        if (resourceId) {
            if (mongoose.Types.ObjectId.isValid(resourceId)) {
                validResourceId = resourceId;
            } else if (resourceId._id && mongoose.Types.ObjectId.isValid(resourceId._id)) {
                validResourceId = resourceId._id;
            }
        }

        return await AuditLog.create({
            userId,
            action,
            resourceType,
            resourceId: validResourceId,
            details
        });
    } catch (error) {
        console.error("Failed to create audit log:", error.message);
        return null;
    }
};

export const getAuditLogsService = async (queryParams = {}) => {
    const {
        page = 1,
        limit = 20,
        action,
        resourceType,
        userId,
        startDate,
        endDate
    } = queryParams;

    const filter = {};

    if (action) {
        filter.action = action.trim().toUpperCase();
    }

    if (resourceType) {
        filter.resourceType = resourceType.trim();
    }

    if (userId) {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            const error = new Error("Invalid userId format");
            error.statusCode = 400;
            throw error;
        }
        filter.userId = userId;
    }

    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                const error = new Error("Invalid startDate format. Use YYYY-MM-DD");
                error.statusCode = 400;
                throw error;
            }
            filter.createdAt.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                const error = new Error("Invalid endDate format. Use YYYY-MM-DD");
                error.statusCode = 400;
                throw error;
            }
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            const error = new Error("startDate cannot be after endDate");
            error.statusCode = 400;
            throw error;
        }
    }

    const currentPage = Math.max(Number(page), 1);
    const itemsPerPage = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (currentPage - 1) * itemsPerPage;

    const [logs, totalLogs] = await Promise.all([
        AuditLog.find(filter)
            .populate("userId", "name email role")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage),

        AuditLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalLogs / itemsPerPage);

    return {
        logs,
        pagination: {
            currentPage,
            itemsPerPage,
            totalLogs,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        }
    };
};
