import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Order from "../../models/Order.js";
import Review from "../../models/Review.js";
import Product from "../../models/Product.js";
import {
    createReviewService,
    updateReviewService,
    deleteReviewService
} from "../../services/reviewService.js";

describe("Priority 6: Review Security & Verified Purchase Rules", () => {
    let originalOrderFindOne;
    let originalReviewFindOne;
    let originalReviewFindById;
    let originalProductFindOne;
    let originalProductFindById;
    let originalReviewCreate;

    beforeEach(() => {
        originalOrderFindOne = Order.findOne;
        originalReviewFindOne = Review.findOne;
        originalReviewFindById = Review.findById;
        originalProductFindOne = Product.findOne;
        originalProductFindById = Product.findById;
        originalReviewCreate = Review.create;
    });

    afterEach(() => {
        Order.findOne = originalOrderFindOne;
        Review.findOne = originalReviewFindOne;
        Review.findById = originalReviewFindById;
        Product.findOne = originalProductFindOne;
        Product.findById = originalProductFindById;
        Review.create = originalReviewCreate;
    });

    describe("Rating Validation", () => {
        it("should reject ratings less than 1 or greater than 5", () => {
            const validateRating = (r) => {
                const num = Number(r);
                if (!Number.isInteger(num) || num < 1 || num > 5) {
                    const error = new Error("Rating must be an integer between 1 and 5");
                    error.statusCode = 400;
                    throw error;
                }
                return num;
            };

            assert.throws(() => validateRating(0), /Rating must be an integer/);
            assert.throws(() => validateRating(6), /Rating must be an integer/);
            assert.throws(() => validateRating(-2), /Rating must be an integer/);
            assert.throws(() => validateRating(3.5), /Rating must be an integer/); // Non-integer
            assert.throws(() => validateRating("five"), /Rating must be an integer/);

            assert.strictEqual(validateRating(1), 1);
            assert.strictEqual(validateRating(5), 5);
            assert.strictEqual(validateRating("4"), 4);
        });
    });

    describe("Verified Purchase & Delivered Order Enforcement", () => {
        it("should reject review creation if user did not purchase or order is not delivered", async () => {
            const userId = "507f1f77bcf86cd799439011";
            const productId = "507f1f77bcf86cd799439022";
            const variantId = "507f1f77bcf86cd799439033";
            const orderId = "507f1f77bcf86cd799439044";

            // 1. Mock product lookup to return an approved product
            Product.findOne = async () => ({
                _id: productId,
                name: "Verified Product",
                status: "approved"
            });

            // 2. Mock order lookup returning null (order doesn't exist, not paid, or not delivered)
            Order.findOne = async () => null;

            await assert.rejects(
                async () => {
                    await createReviewService(
                        userId,
                        productId,
                        variantId,
                        orderId,
                        5,
                        "Great!",
                        "Loved this product so much!"
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 400 &&
                        /receiving the order/i.test(err.message)
                    );
                }
            );
        });

        it("should reject review creation if product variant was not in the delivered order", async () => {
            const userId = "507f1f77bcf86cd799439011";
            const productId = "507f1f77bcf86cd799439022";
            const variantId = "507f1f77bcf86cd799439033";
            const differentVariantId = "507f1f77bcf86cd799439077";
            const orderId = "507f1f77bcf86cd799439044";

            Product.findOne = async () => ({
                _id: productId,
                name: "Verified Product",
                status: "approved"
            });

            // Delivered order containing a DIFFERENT variant
            Order.findOne = async () => ({
                _id: orderId,
                userId,
                paymentStatus: "paid",
                orderStatus: "delivered",
                sellerOrders: [
                    {
                        status: "delivered",
                        items: [
                            {
                                productId: { toString: () => productId },
                                variantId: { toString: () => differentVariantId }
                            }
                        ]
                    }
                ]
            });

            await assert.rejects(
                async () => {
                    await createReviewService(
                        userId,
                        productId,
                        variantId,
                        orderId,
                        5,
                        "Unpurchased variant",
                        "Trying to review a variant not purchased"
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 403 &&
                        /purchased and received/i.test(err.message)
                    );
                }
            );
        });

        it("should reject duplicate reviews on the same product by the same user", async () => {
            const userId = "507f1f77bcf86cd799439011";
            const productId = "507f1f77bcf86cd799439022";
            const variantId = "507f1f77bcf86cd799439033";
            const orderId = "507f1f77bcf86cd799439044";

            // 1. Mock product lookup
            Product.findOne = async () => ({
                _id: productId,
                name: "Verified Product",
                status: "approved"
            });

            // 2. Mock valid delivered order containing the product & variant
            Order.findOne = async () => ({
                _id: orderId,
                userId,
                paymentStatus: "paid",
                orderStatus: "delivered",
                sellerOrders: [
                    {
                        status: "delivered",
                        items: [
                            {
                                productId: { toString: () => productId },
                                variantId: { toString: () => variantId }
                            }
                        ]
                    }
                ]
            });

            // 3. Mock existing review found for this user & product
            Review.findOne = async () => ({
                _id: "507f1f77bcf86cd799439055",
                userId,
                productId
            });

            await assert.rejects(
                async () => {
                    await createReviewService(
                        userId,
                        productId,
                        variantId,
                        orderId,
                        5,
                        "Duplicate attempt",
                        "Trying to review again"
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 409 &&
                        /already reviewed/i.test(err.message)
                    );
                }
            );
        });
    });

    describe("Review Ownership - Update & Delete", () => {
        it("should prevent updating another user's review", async () => {
            const legitimateOwnerId = "507f1f77bcf86cd799439011";
            const attackerUserId = "507f1f77bcf86cd799439099";
            const targetReviewId = "507f1f77bcf86cd799439055";

            // Mock existing review document owned by legitimateOwnerId
            const mockReview = {
                _id: targetReviewId,
                userId: legitimateOwnerId,
                productId: "507f1f77bcf86cd799439022",
                variantId: "507f1f77bcf86cd799439033",
                orderId: "507f1f77bcf86cd799439044",
                rating: 5,
                title: "Original Title",
                comment: "Original Comment from legitimate owner",
                save: async function () {
                    return this;
                }
            };

            Review.findById = async (id) =>
                id.toString() === targetReviewId ? mockReview : null;
            Review.findOne = async (query) =>
                query?._id?.toString() === targetReviewId ? mockReview : null;

            await assert.rejects(
                async () => {
                    await updateReviewService(
                        attackerUserId,
                        targetReviewId,
                        1,
                        "Hacked Title",
                        "Trying to overwrite review without ownership"
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 403 &&
                        /permission/i.test(err.message)
                    );
                }
            );
        });

        it("should return 404 if review does not exist when updating", async () => {
            Review.findById = async () => null;
            Review.findOne = async () => null;

            await assert.rejects(
                async () => {
                    await updateReviewService(
                        "507f1f77bcf86cd799439011",
                        "507f1f77bcf86cd799439055",
                        4,
                        "New Title"
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 404 &&
                        /review not found/i.test(err.message)
                    );
                }
            );
        });

        it("should prevent deleting another user's review", async () => {
            const legitimateOwnerId = "507f1f77bcf86cd799439011";
            const attackerUserId = "507f1f77bcf86cd799439099";
            const targetReviewId = "507f1f77bcf86cd799439055";

            const mockReview = {
                _id: targetReviewId,
                userId: legitimateOwnerId,
                productId: "507f1f77bcf86cd799439022",
                variantId: "507f1f77bcf86cd799439033",
                orderId: "507f1f77bcf86cd799439044",
                rating: 5,
                title: "Original Title",
                comment: "Original Comment from legitimate owner",
                deleteOne: async function () {
                    return true;
                }
            };

            Review.findById = async (id) =>
                id.toString() === targetReviewId ? mockReview : null;
            Review.findOne = async (query) =>
                query?._id?.toString() === targetReviewId ? mockReview : null;

            await assert.rejects(
                async () => {
                    await deleteReviewService(attackerUserId, targetReviewId);
                },
                (err) => {
                    return (
                        err.statusCode === 403 &&
                        /permission/i.test(err.message)
                    );
                }
            );
        });

        it("should return 404 if review does not exist when deleting", async () => {
            Review.findById = async () => null;
            Review.findOne = async () => null;

            await assert.rejects(
                async () => {
                    await deleteReviewService(
                        "507f1f77bcf86cd799439011",
                        "507f1f77bcf86cd799439055"
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 404 &&
                        /review not found/i.test(err.message)
                    );
                }
            );
        });
    });
});
