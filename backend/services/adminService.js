import mongoose from "mongoose";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Inventory from "../models/Inventory.js";
import { createNotificationService } from "./notificationService.js";
import { notificationTemplates } from "../utils/notificationTemplates.js";
import { createAuditLog } from "./auditLogService.js";
import { escapeRegex, validateObjectId } from "../utils/securityUtils.js";

export const getPendingSellersService = async () => {
    return await Seller.find({
        approvalStatus: "pending"
    })
        .populate("userId", "name email")
        .sort({ createdAt: -1 });
};

export const approveSellerService = async (sellerId, adminId = null) => {
    validateObjectId(sellerId, "sellerId");
    const seller = await Seller.findById(sellerId);

    if (!seller) {
        const error = new Error("Seller application not found");
        error.statusCode = 404;
        throw error;
    }

    if (seller.approvalStatus === "approved") {
        const error = new Error("Seller is already approved");
        error.statusCode = 400;
        throw error;
    }

    seller.approvalStatus = "approved";

    await seller.save();

    await User.findByIdAndUpdate(seller.userId, { role: "seller" });

    const notification = notificationTemplates.sellerApproved(seller._id);

    await createNotificationService(
        seller.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    await createAuditLog({
        userId: adminId,
        action: "SELLER_APPROVED",
        resourceType: "Seller",
        resourceId: seller._id,
        details: {
            sellerUserId: seller.userId,
            businessName: seller.businessName
        }
    });

    return seller;
};

export const rejectSellerService = async (sellerId, adminId = null) => {
    validateObjectId(sellerId, "sellerId");
    const seller = await Seller.findById(sellerId);

    if (!seller) {
        const error = new Error("Seller application not found");
        error.statusCode = 404;
        throw error;
    }

    if (seller.approvalStatus === "rejected") {
        const error = new Error("Seller is already rejected");
        error.statusCode = 400;
        throw error;
    }

    seller.approvalStatus = "rejected";

    await seller.save();

    const notification = notificationTemplates.sellerRejected(seller._id);

    await createNotificationService(
        seller.userId,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    await createAuditLog({
        userId: adminId,
        action: "SELLER_REJECTED",
        resourceType: "Seller",
        resourceId: seller._id,
        details: {
            sellerUserId: seller.userId,
            businessName: seller.businessName
        }
    });

    return seller;
};


// ==========================================
// ADMIN PRODUCT MODERATION SERVICES
// ==========================================

export const getPendingProductsService = async (queryParams = {}) => {
    const {
        page = 1,
        limit = 10
    } = queryParams;

    const filter = {
        status: "pending"
    };

    const currentPage = Math.max(Number(page), 1);
    const itemsPerPage = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * itemsPerPage;

    const [products, totalProducts] = await Promise.all([
        Product.find(filter)
            .populate("sellerId", "businessName businessEmail phone")
            .populate("storeId", "storeName logo description")
            .populate("categoryId", "name slug")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage),

        Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    return {
        products,
        pagination: {
            currentPage,
            itemsPerPage,
            totalProducts,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        }
    };
};

export const getAllProductsAdminService = async (queryParams = {}) => {
    const {
        status,
        search,
        page = 1,
        limit = 10
    } = queryParams;

    const filter = {};

    if (status) {
        filter.status = status;
    }

    if (search && typeof search === "string" && search.trim() !== "") {
        const safeSearch = escapeRegex(search.trim());
        filter.$or = [
            { name: { $regex: safeSearch, $options: "i" } },
            { description: { $regex: safeSearch, $options: "i" } },
            { brand: { $regex: safeSearch, $options: "i" } }
        ];
    }

    const currentPage = Math.max(Number(page), 1);
    const itemsPerPage = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * itemsPerPage;

    const [products, totalProducts] = await Promise.all([
        Product.find(filter)
            .populate("sellerId", "businessName businessEmail phone")
            .populate("storeId", "storeName logo description")
            .populate("categoryId", "name slug")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage),

        Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    return {
        products,
        pagination: {
            currentPage,
            itemsPerPage,
            totalProducts,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        }
    };
};

export const approveProductService = async (productId, adminId = null) => {
    validateObjectId(productId, "productId");
    const product = await Product.findById(productId);

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    if (product.status !== "pending") {
        const error = new Error("Product is not pending moderation");
        error.statusCode = 400;
        throw error;
    }

    product.status = "approved";
    product.rejectionReason = null;

    await product.save();

    const seller = await Seller.findById(product.sellerId);
    if (seller && seller.userId) {
        const notification = notificationTemplates.productApproved(
            product._id,
            product.name
        );

        await createNotificationService(
            seller.userId,
            notification.type,
            notification.title,
            notification.message,
            notification.relatedId,
            notification.relatedType
        );
    }

    await createAuditLog({
        userId: adminId,
        action: "PRODUCT_APPROVED",
        resourceType: "Product",
        resourceId: product._id,
        details: {
            productName: product.name,
            sellerId: product.sellerId
        }
    });

    return product;
};

export const rejectProductService = async (productId, reason = null, adminId = null) => {
    validateObjectId(productId, "productId");
    const product = await Product.findById(productId);

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    if (product.status !== "pending") {
        const error = new Error("Product is not pending moderation");
        error.statusCode = 400;
        throw error;
    }

    product.status = "rejected";
    if (reason) {
        product.rejectionReason = reason;
    }

    await product.save();

    const seller = await Seller.findById(product.sellerId);
    if (seller && seller.userId) {
        const notification = notificationTemplates.productRejected(
            product._id,
            product.name,
            reason
        );

        await createNotificationService(
            seller.userId,
            notification.type,
            notification.title,
            notification.message,
            notification.relatedId,
            notification.relatedType
        );
    }

    await createAuditLog({
        userId: adminId,
        action: "PRODUCT_REJECTED",
        resourceType: "Product",
        resourceId: product._id,
        details: {
            productName: product.name,
            sellerId: product.sellerId,
            reason: reason || null
        }
    });

    return product;
};


// ==========================================
// ADMIN USER MANAGEMENT SERVICES
// ==========================================

export const getAllUsersAdminService = async (queryParams = {}) => {
    const {
        page = 1,
        limit = 10,
        role,
        isActive,
        search
    } = queryParams;

    const filter = {};

    if (role) {
        filter.role = role;
    }

    if (isActive !== undefined && isActive !== "") {
        filter.isActive = isActive === "true" || isActive === true;
    }

    if (search && typeof search === "string" && search.trim() !== "") {
        const safeSearch = escapeRegex(search.trim());
        filter.$or = [
            { name: { $regex: safeSearch, $options: "i" } },
            { email: { $regex: safeSearch, $options: "i" } }
        ];
    }

    const currentPage = Math.max(Number(page), 1);
    const itemsPerPage = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * itemsPerPage;

    const [users, totalUsers] = await Promise.all([
        User.find(filter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage),

        User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalUsers / itemsPerPage);

    return {
        users,
        pagination: {
            currentPage,
            itemsPerPage,
            totalUsers,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        }
    };
};

export const getUserByIdAdminService = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error("Invalid user ID");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    return user;
};

export const updateUserRoleService = async (currentAdminId, userId, role) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error("Invalid user ID");
        error.statusCode = 400;
        throw error;
    }

    const allowedRoles = [
        "customer",
        "seller",
        "admin",
        "support",
        "delivery"
    ];

    if (!role || !allowedRoles.includes(role)) {
        const error = new Error(`Invalid role. Allowed roles: ${allowedRoles.join(", ")}`);
        error.statusCode = 400;
        throw error;
    }

    if (currentAdminId && currentAdminId.toString() === userId.toString()) {
        const error = new Error("Cannot change your own role");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    const notification = notificationTemplates.userRoleUpdated(role);
    await createNotificationService(
        user._id,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    await createAuditLog({
        userId: currentAdminId,
        action: "USER_ROLE_CHANGED",
        resourceType: "User",
        resourceId: user._id,
        details: {
            previousRole,
            newRole: role,
            email: user.email
        }
    });

    return await User.findById(userId).select("-password");
};

export const toggleUserStatusService = async (currentAdminId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        const error = new Error("Invalid user ID");
        error.statusCode = 400;
        throw error;
    }

    if (currentAdminId && currentAdminId.toString() === userId.toString()) {
        const error = new Error("Cannot deactivate your own account");
        error.statusCode = 400;
        throw error;
    }

    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const previousStatus = user.isActive === undefined ? true : user.isActive;
    const newStatus = !previousStatus;
    user.isActive = newStatus;
    await user.save();

    const notification = notificationTemplates.accountStatusUpdated(user.isActive);
    await createNotificationService(
        user._id,
        notification.type,
        notification.title,
        notification.message,
        notification.relatedId,
        notification.relatedType
    );

    await createAuditLog({
        userId: currentAdminId,
        action: "USER_STATUS_CHANGED",
        resourceType: "User",
        resourceId: user._id,
        details: {
            previousStatus,
            newStatus,
            email: user.email
        }
    });

    return await User.findById(userId).select("-password");
};


// ==========================================
// ADMIN REPORTS & ANALYTICS SERVICES
// ==========================================

export const getReportsOverviewService = async (queryParams = {}) => {
    const { startDate, endDate } = queryParams;

    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                const error = new Error("Invalid startDate format. Use YYYY-MM-DD");
                error.statusCode = 400;
                throw error;
            }
            dateFilter.createdAt.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                const error = new Error("Invalid endDate format. Use YYYY-MM-DD");
                error.statusCode = 400;
                throw error;
            }
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = end;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            const error = new Error("startDate cannot be after endDate");
            error.statusCode = 400;
            throw error;
        }
    }

    const orderMatch = Object.keys(dateFilter).length > 0 ? { ...dateFilter } : {};

    const [
        userAgg,
        productAgg,
        orderAgg,
        sellerAgg,
        inventoryAgg
    ] = await Promise.all([
        User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalCustomers: {
                        $sum: { $cond: [{ $eq: ["$role", "customer"] }, 1, 0] }
                    },
                    totalSellers: {
                        $sum: { $cond: [{ $eq: ["$role", "seller"] }, 1, 0] }
                    },
                    totalSupportAgents: {
                        $sum: { $cond: [{ $eq: ["$role", "support"] }, 1, 0] }
                    },
                    totalDeliveryPartners: {
                        $sum: { $cond: [{ $eq: ["$role", "delivery"] }, 1, 0] }
                    },
                    totalAdmins: {
                        $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] }
                    },
                    activeUsers: {
                        $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
                    },
                    inactiveUsers: {
                        $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] }
                    }
                }
            }
        ]),

        Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    approvedProducts: {
                        $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
                    },
                    pendingProducts: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
                    },
                    rejectedProducts: {
                        $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
                    },
                    inactiveProducts: {
                        $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] }
                    },
                    draftProducts: {
                        $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] }
                    }
                }
            }
        ]),

        Order.aggregate([
            { $match: orderMatch },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "pending"] }, 1, 0] }
                    },
                    confirmedOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "confirmed"] }, 1, 0] }
                    },
                    processingOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "processing"] }, 1, 0] }
                    },
                    shippedOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "shipped"] }, 1, 0] }
                    },
                    deliveredOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "delivered"] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ["$orderStatus", "cancelled"] }, 1, 0] }
                    },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "paid"] },
                                "$totalAmount",
                                0
                            ]
                        }
                    },
                    totalPaidOrders: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "paid"] },
                                1,
                                0
                            ]
                        }
                    },
                    totalRefundedAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "refunded"] },
                                "$totalAmount",
                                0
                            ]
                        }
                    },
                    totalRefundedOrders: {
                        $sum: {
                            $cond: [
                                { $eq: ["$paymentStatus", "refunded"] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]),

        Seller.aggregate([
            {
                $group: {
                    _id: null,
                    totalSellerApplications: { $sum: 1 },
                    pendingSellers: {
                        $sum: { $cond: [{ $eq: ["$approvalStatus", "pending"] }, 1, 0] }
                    },
                    approvedSellers: {
                        $sum: { $cond: [{ $eq: ["$approvalStatus", "approved"] }, 1, 0] }
                    },
                    rejectedSellers: {
                        $sum: { $cond: [{ $eq: ["$approvalStatus", "rejected"] }, 1, 0] }
                    },
                    suspendedSellers: {
                        $sum: { $cond: [{ $eq: ["$approvalStatus", "suspended"] }, 1, 0] }
                    }
                }
            }
        ]),

        Inventory.aggregate([
            {
                $group: {
                    _id: null,
                    totalInventoryRecords: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    totalReservedQuantity: { $sum: "$reservedQuantity" },
                    totalAvailableQuantity: {
                        $sum: { $subtract: ["$quantity", "$reservedQuantity"] }
                    },
                    lowStockItemCount: {
                        $sum: {
                            $cond: [
                                {
                                    $lte: [
                                        { $subtract: ["$quantity", "$reservedQuantity"] },
                                        "$lowStockThreshold"
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ])
    ]);

    const u = userAgg[0] || {};
    const p = productAgg[0] || {};
    const o = orderAgg[0] || {};
    const s = sellerAgg[0] || {};
    const i = inventoryAgg[0] || {};

    return {
        users: {
            total: u.totalUsers || 0,
            customers: u.totalCustomers || 0,
            sellers: u.totalSellers || 0,
            supportAgents: u.totalSupportAgents || 0,
            deliveryPartners: u.totalDeliveryPartners || 0,
            admins: u.totalAdmins || 0,
            active: u.activeUsers || 0,
            inactive: u.inactiveUsers || 0
        },
        products: {
            total: p.totalProducts || 0,
            approved: p.approvedProducts || 0,
            pending: p.pendingProducts || 0,
            rejected: p.rejectedProducts || 0,
            inactive: p.inactiveProducts || 0,
            draft: p.draftProducts || 0
        },
        orders: {
            total: o.totalOrders || 0,
            pending: o.pendingOrders || 0,
            confirmed: o.confirmedOrders || 0,
            processing: o.processingOrders || 0,
            shipped: o.shippedOrders || 0,
            delivered: o.deliveredOrders || 0,
            cancelled: o.cancelledOrders || 0
        },
        revenue: {
            totalRevenue: Math.round((o.totalRevenue || 0) * 100) / 100,
            totalPaidOrders: o.totalPaidOrders || 0,
            totalRefundedAmount: Math.round((o.totalRefundedAmount || 0) * 100) / 100,
            totalRefundedOrders: o.totalRefundedOrders || 0
        },
        sellers: {
            totalApplications: s.totalSellerApplications || 0,
            pending: s.pendingSellers || 0,
            approved: s.approvedSellers || 0,
            rejected: s.rejectedSellers || 0,
            suspended: s.suspendedSellers || 0
        },
        inventory: {
            totalRecords: i.totalInventoryRecords || 0,
            totalQuantity: i.totalQuantity || 0,
            totalReservedQuantity: i.totalReservedQuantity || 0,
            totalAvailableQuantity: i.totalAvailableQuantity || 0,
            lowStockItemCount: i.lowStockItemCount || 0
        }
    };
};

export const getSalesReportService = async (queryParams = {}) => {
    const { startDate, endDate } = queryParams;

    const matchConditions = [
        { paymentStatus: "paid" }
    ];

    if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
            const error = new Error("Invalid startDate format. Use YYYY-MM-DD");
            error.statusCode = 400;
            throw error;
        }
        matchConditions.push({
            $or: [
                { paidAt: { $gte: start } },
                { paidAt: null, createdAt: { $gte: start } }
            ]
        });
    }

    if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
            const error = new Error("Invalid endDate format. Use YYYY-MM-DD");
            error.statusCode = 400;
            throw error;
        }
        end.setHours(23, 59, 59, 999);
        matchConditions.push({
            $or: [
                { paidAt: { $lte: end } },
                { paidAt: null, createdAt: { $lte: end } }
            ]
        });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        const error = new Error("startDate cannot be after endDate");
        error.statusCode = 400;
        throw error;
    }

    const matchStage = matchConditions.length === 1
        ? matchConditions[0]
        : { $and: matchConditions };

    const sales = await Order.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: { $ifNull: ["$paidAt", "$createdAt"] }
                    }
                },
                orders: { $sum: 1 },
                revenue: { $sum: "$totalAmount" }
            }
        },
        {
            $project: {
                _id: 0,
                date: "$_id",
                orders: 1,
                revenue: { $round: ["$revenue", 2] }
            }
        },
        { $sort: { date: 1 } }
    ]);

    return sales;
};

export const getTopProductsReportService = async (queryParams = {}) => {
    const {
        limit = 10,
        sortBy = "quantity",
        startDate,
        endDate
    } = queryParams;

    const matchConditions = [
        { paymentStatus: "paid" }
    ];

    if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
            const error = new Error("Invalid startDate format. Use YYYY-MM-DD");
            error.statusCode = 400;
            throw error;
        }
        matchConditions.push({
            $or: [
                { paidAt: { $gte: start } },
                { paidAt: null, createdAt: { $gte: start } }
            ]
        });
    }

    if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
            const error = new Error("Invalid endDate format. Use YYYY-MM-DD");
            error.statusCode = 400;
            throw error;
        }
        end.setHours(23, 59, 59, 999);
        matchConditions.push({
            $or: [
                { paidAt: { $lte: end } },
                { paidAt: null, createdAt: { $lte: end } }
            ]
        });
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        const error = new Error("startDate cannot be after endDate");
        error.statusCode = 400;
        throw error;
    }

    const matchStage = matchConditions.length === 1
        ? matchConditions[0]
        : { $and: matchConditions };

    const itemsLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const sortField = sortBy === "revenue" ? { revenue: -1 } : { quantitySold: -1 };

    const topProducts = await Order.aggregate([
        { $match: matchStage },
        { $unwind: "$sellerOrders" },
        { $unwind: "$sellerOrders.items" },
        {
            $group: {
                _id: "$sellerOrders.items.productId",
                quantitySold: { $sum: "$sellerOrders.items.quantity" },
                revenue: { $sum: "$sellerOrders.items.subtotal" }
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: {
                path: "$product",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $project: {
                _id: 0,
                productId: "$_id",
                productName: { $ifNull: ["$product.name", "Unknown Product"] },
                images: { $ifNull: ["$product.images", []] },
                quantitySold: 1,
                revenue: { $round: ["$revenue", 2] }
            }
        },
        { $sort: sortField },
        { $limit: itemsLimit }
    ]);

    return topProducts;
};