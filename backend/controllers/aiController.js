import {
    generateProductDescriptionService,
    generateSellingPointsService,
    generateReviewSummaryService,
    generateProductSummaryService,
    chatAssistantService
} from "../services/aiService.js";

// ==========================================
// GENERATE PRODUCT DESCRIPTION
// ==========================================

export const generateProductDescription = async (req, res, next) => {
    try {
        const { name, category, brand, keyFeatures } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });
        }

        if (name.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Product name cannot exceed 200 characters"
            });
        }

        const description = await generateProductDescriptionService({
            name: name.trim(),
            category: typeof category === "string" ? category.trim().slice(0, 100) : "",
            brand: typeof brand === "string" ? brand.trim().slice(0, 100) : "",
            keyFeatures
        });

        res.status(200).json({
            success: true,
            description
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// GENERATE KEY SELLING POINTS
// ==========================================

export const generateSellingPoints = async (req, res, next) => {
    try {
        const { name, category, brand, description, features, keyFeatures } = req.body;

        if (!name || typeof name !== "string" || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });
        }

        if (name.trim().length > 200) {
            return res.status(400).json({
                success: false,
                message: "Product name cannot exceed 200 characters"
            });
        }

        const sellingPoints = await generateSellingPointsService({
            name: name.trim(),
            category: typeof category === "string" ? category.trim().slice(0, 100) : "",
            brand: typeof brand === "string" ? brand.trim().slice(0, 100) : "",
            description: typeof description === "string" ? description.trim().slice(0, 2000) : "",
            features: features || keyFeatures
        });

        res.status(200).json({
            success: true,
            sellingPoints
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET REVIEW SUMMARY
// ==========================================

export const getReviewSummary = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const result = await generateReviewSummaryService(productId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// GET PRODUCT SUMMARY
// ==========================================

export const getProductSummary = async (req, res, next) => {
    try {
        const { productId } = req.params;

        const result = await generateProductSummaryService(productId);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

// ==========================================
// BAZORA AI SHOPPING ASSISTANT
// ==========================================

export const chatAssistant = async (req, res, next) => {
    try {
        const { message, history, conversationHistory } = req.body;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "A shopping question or search query is required"
            });
        }

        if (message.trim().length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Message cannot exceed 1000 characters"
            });
        }

        const rawHistory = Array.isArray(history)
            ? history
            : (Array.isArray(conversationHistory) ? conversationHistory : []);

        const result = await chatAssistantService({
            message: message.trim(),
            conversationHistory: rawHistory
        });

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
