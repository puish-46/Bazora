import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { validateObjectId } from "../utils/securityUtils.js";


const verifyDeliveredPurchase = async (
    userId,
    orderId,
    productId,
    variantId
) => {
    const order = await Order.findOne({
        _id: orderId,
        userId,
        orderStatus: "delivered",
        paymentStatus: "paid"
    });

    if (!order) {
        const error = new Error(
            "You can review a product only after receiving the order"
        );
        error.statusCode = 400;
        throw error;
    }

    let purchased = false;

    for (const sellerOrder of order.sellerOrders) {
        if (sellerOrder.status !== "delivered") {
            continue;
        }

        const item = sellerOrder.items.find(
            (item) =>
                item.productId.toString() === productId.toString() &&
                item.variantId.toString() === variantId.toString()
        );

        if (item) {
            purchased = true;
            break;
        }
    }

    if (!purchased) {
        const error = new Error(
            "You can only review products you purchased and received"
        );
        error.statusCode = 403;
        throw error;
    }
};


export const createReviewService = async (
    userId,
    productId,
    variantId,
    orderId,
    rating,
    title,
    comment
) => {
    validateObjectId(productId, "productId");
    validateObjectId(variantId, "variantId");
    validateObjectId(orderId, "orderId");

    const product = await Product.findOne({
        _id: productId,
        status: "approved"
    });

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    await verifyDeliveredPurchase(
        userId,
        orderId,
        productId,
        variantId
    );

    const existingReview = await Review.findOne({
        userId,
        productId
    });

    if (existingReview) {
        const error = new Error(
            "You have already reviewed this product"
        );
        error.statusCode = 409;
        throw error;
    }

    try {
        return await Review.create({
            productId,
            variantId,
            userId,
            orderId,
            rating,
            title,
            comment
        });
    } catch (error) {
        if (error.code === 11000) {
            const duplicateError = new Error(
                "You have already reviewed this product"
            );

            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw error;
    }
};


export const getProductReviewsService = async (
    productId,
    page = 1,
    limit = 10
) => {
    validateObjectId(productId, "productId");
    const product = await Product.findOne({
        _id: productId,
        status: "approved"
    });

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    const currentPage = Math.max(Number(page), 1);
    const itemsPerPage = Math.min(
        Math.max(Number(limit), 1),
        50
    );

    const skip =
        (currentPage - 1) * itemsPerPage;

    const filter = {
        productId,
        isApproved: true
    };

    const [reviews, totalReviews] = await Promise.all([
        Review.find(filter)
            .populate("userId", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage),

        Review.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(
        totalReviews / itemsPerPage
    );

    return {
        reviews,
        pagination: {
            currentPage,
            itemsPerPage,
            totalReviews,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        }
    };
};


export const getMyReviewsService = async (
    userId
) => {
    return await Review.find({
        userId
    })
        .populate(
            "productId",
            "name slug images"
        )
        .populate(
            "variantId",
            "sku attributes"
        )
        .sort({ createdAt: -1 });
};


export const updateReviewService = async (
    userId,
    reviewId,
    rating,
    title,
    comment
) => {
    validateObjectId(reviewId, "reviewId");
    const review = await Review.findById(reviewId);

    if (!review) {
        const error = new Error("Review not found");
        error.statusCode = 404;
        throw error;
    }

    if (review.userId.toString() !== userId.toString()) {
        const error = new Error("You do not have permission to edit this review");
        error.statusCode = 403;
        throw error;
    }

    if (rating !== undefined) {
        review.rating = rating;
    }

    if (title !== undefined) {
        review.title = title;
    }

    if (comment !== undefined) {
        review.comment = comment;
    }

    return await review.save();
};


export const deleteReviewService = async (
    userId,
    reviewId
) => {
    validateObjectId(reviewId, "reviewId");
    const review = await Review.findById(reviewId);

    if (!review) {
        const error = new Error("Review not found");
        error.statusCode = 404;
        throw error;
    }

    if (review.userId.toString() !== userId.toString()) {
        const error = new Error("You do not have permission to delete this review");
        error.statusCode = 403;
        throw error;
    }

    await review.deleteOne();

    return {
        message: "Review deleted successfully"
    };
};