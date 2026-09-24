import {
    getPendingSellersService,
    approveSellerService,
    rejectSellerService,
    getPendingProductsService,
    getAllProductsAdminService,
    approveProductService,
    rejectProductService,
    getAllUsersAdminService,
    getUserByIdAdminService,
    updateUserRoleService,
    toggleUserStatusService,
    getReportsOverviewService,
    getSalesReportService,
    getTopProductsReportService
} from "../services/adminService.js";
import { getAuditLogsService } from "../services/auditLogService.js";

export const getPendingSellers = async (req, res, next) => {
    try {
        const sellers = await getPendingSellersService();

        res.status(200).json({
            success: true,
            count: sellers.length,
            sellers
        });

    } catch (error) {
        next(error);
    }
};

export const approveSeller = async (req, res, next) => {
    try {
        const seller = await approveSellerService(req.params.id, req.user?.userId);

        res.status(200).json({
            success: true,
            message: "Seller approved successfully",
            seller
        });

    } catch (error) {
        next(error);
    }
};

export const rejectSeller = async (req, res, next) => {
    try {
        const seller = await rejectSellerService(req.params.id, req.user?.userId);

        res.status(200).json({
            success: true,
            message: "Seller rejected successfully",
            seller
        });

    } catch (error) {
        next(error);
    }
};


// ==========================================
// ADMIN PRODUCT MODERATION CONTROLLERS
// ==========================================

export const getPendingProducts = async (req, res, next) => {
    try {
        const result = await getPendingProductsService(req.query);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const getAllProductsAdmin = async (req, res, next) => {
    try {
        const result = await getAllProductsAdminService(req.query);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const approveProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId || req.params.id;
        const product = await approveProductService(productId, req.user?.userId);

        res.status(200).json({
            success: true,
            message: "Product approved successfully",
            product
        });
    } catch (error) {
        next(error);
    }
};

export const rejectProduct = async (req, res, next) => {
    try {
        const productId = req.params.productId || req.params.id;
        const { reason } = req.body;
        const product = await rejectProductService(productId, reason, req.user?.userId);

        res.status(200).json({
            success: true,
            message: "Product rejected successfully",
            product
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// ADMIN USER MANAGEMENT CONTROLLERS
// ==========================================

export const getAllUsersAdmin = async (req, res, next) => {
    try {
        const result = await getAllUsersAdminService(req.query);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

export const getUserByIdAdmin = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.params.id;
        const user = await getUserByIdAdminService(userId);

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        next(error);
    }
};

export const updateUserRole = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.params.id;
        const { role } = req.body;

        const user = await updateUserRoleService(
            req.user.userId,
            userId,
            role
        );

        res.status(200).json({
            success: true,
            message: "User role updated successfully",
            user
        });
    } catch (error) {
        next(error);
    }
};

export const toggleUserStatus = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.params.id;

        const user = await toggleUserStatusService(
            req.user.userId,
            userId
        );

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
            user
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// ADMIN REPORTS & ANALYTICS CONTROLLERS
// ==========================================

export const getReportsOverview = async (req, res, next) => {
    try {
        const overview = await getReportsOverviewService(req.query);

        res.status(200).json({
            success: true,
            overview
        });
    } catch (error) {
        next(error);
    }
};

export const getSalesReport = async (req, res, next) => {
    try {
        const sales = await getSalesReportService(req.query);

        res.status(200).json({
            success: true,
            count: sales.length,
            sales
        });
    } catch (error) {
        next(error);
    }
};

export const getTopProductsReport = async (req, res, next) => {
    try {
        const products = await getTopProductsReportService(req.query);

        res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        next(error);
    }
};


// ==========================================
// ADMIN AUDIT LOGS CONTROLLER
// ==========================================

export const getAuditLogs = async (req, res, next) => {
    try {
        const result = await getAuditLogsService(req.query);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};