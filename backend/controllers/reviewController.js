import {
    createReviewService,
    getProductReviewsService,
    getMyReviewsService,
    updateReviewService,
    deleteReviewService
} from "../services/reviewService.js";


export const createReview = async (
    req,
    res,
    next
) => {
    try {
        const {
            productId,
            variantId,
            orderId,
            rating,
            title,
            comment
        } = req.body;

        if (
            !productId ||
            !variantId ||
            !orderId ||
            rating === undefined ||
            !comment
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "productId, variantId, orderId, rating and comment are required"
            });
        }

        if (
            !Number.isInteger(Number(rating)) ||
            Number(rating) < 1 ||
            Number(rating) > 5
        ) {
            return res.status(400).json({
                success: false,
                message: "Rating must be an integer between 1 and 5"
            });
        }

        const review =
            await createReviewService(
                req.user.userId,
                productId,
                variantId,
                orderId,
                Number(rating),
                title,
                comment
            );

        res.status(201).json({
            success: true,
            message: "Review created successfully",
            review
        });
    } catch (error) {
        next(error);
    }
};


export const getProductReviews = async (
    req,
    res,
    next
) => {
    try {
        const { productId } = req.params;

        const {
            page = 1,
            limit = 10
        } = req.query;

        const result =
            await getProductReviewsService(
                productId,
                page,
                limit
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};


export const getMyReviews = async (
    req,
    res,
    next
) => {
    try {
        const reviews =
            await getMyReviewsService(
                req.user.userId
            );

        res.status(200).json({
            success: true,
            reviews
        });
    } catch (error) {
        next(error);
    }
};


export const updateReview = async (
    req,
    res,
    next
) => {
    try {
        const { reviewId } = req.params;

        const {
            rating,
            title,
            comment
        } = req.body;

        if (rating !== undefined) {
            if (
                !Number.isInteger(Number(rating)) ||
                Number(rating) < 1 ||
                Number(rating) > 5
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Rating must be an integer between 1 and 5"
                });
            }
        }

        if (
            rating === undefined &&
            title === undefined &&
            comment === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "At least one field is required"
            });
        }

        const review =
            await updateReviewService(
                req.user.userId,
                reviewId,
                rating !== undefined
                    ? Number(rating)
                    : undefined,
                title,
                comment
            );

        res.status(200).json({
            success: true,
            message: "Review updated successfully",
            review
        });
    } catch (error) {
        next(error);
    }
};


export const deleteReview = async (
    req,
    res,
    next
) => {
    try {
        const { reviewId } = req.params;

        const result =
            await deleteReviewService(
                req.user.userId,
                reviewId
            );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};