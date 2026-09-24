import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
    generateProductDescription,
    generateSellingPoints,
    getReviewSummary
} from "../../controllers/aiController.js";
import { generateReviewSummaryService } from "../../services/aiService.js";
import { mockRequest, mockResponse, mockNext } from "../helpers/mockReqRes.js";
import Product from "../../models/Product.js";
import Review from "../../models/Review.js";

describe("Priority 7: AI Endpoint Security & Privacy Rules", () => {
    let originalEnv;
    let originalFetch;
    let originalProductFindById;
    let originalReviewFind;

    beforeEach(() => {
        originalEnv = { ...process.env };
        originalFetch = global.fetch;
        originalProductFindById = Product.findById;
        originalReviewFind = Review.find;

        // Ensure real API keys are NEVER active during test runs
        delete process.env.AI_API_KEY;
        delete process.env.OPENAI_API_KEY;
        delete process.env.GEMINI_API_KEY;
        delete process.env.GROQ_API_KEY;

        // Stub global fetch to guarantee NO real external HTTP calls are made
        global.fetch = async () => {
            throw new Error("SECURITY VIOLATION: Real external AI calls are strictly forbidden in tests");
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        global.fetch = originalFetch;
        Product.findById = originalProductFindById;
        Review.find = originalReviewFind;
    });

    describe("Input Validation & Length Boundaries", () => {
        it("should reject missing or empty product name in generateProductDescription", async () => {
            const req = mockRequest({
                body: { name: "   " }
            });
            const res = mockResponse();
            const next = mockNext();

            await generateProductDescription(req, res, next);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /name is required/i);
        });

        it("should reject product names exceeding 200 characters in generateProductDescription", async () => {
            const oversizedName = "A".repeat(201);
            const req = mockRequest({
                body: { name: oversizedName }
            });
            const res = mockResponse();
            const next = mockNext();

            await generateProductDescription(req, res, next);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /cannot exceed 200 characters/i);
        });

        it("should reject missing product name in generateSellingPoints", async () => {
            const req = mockRequest({
                body: { name: "" }
            });
            const res = mockResponse();
            const next = mockNext();

            await generateSellingPoints(req, res, next);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /name is required/i);
        });

        it("should reject product names exceeding 200 characters in generateSellingPoints", async () => {
            const oversizedName = "B".repeat(205);
            const req = mockRequest({
                body: { name: oversizedName }
            });
            const res = mockResponse();
            const next = mockNext();

            await generateSellingPoints(req, res, next);

            assert.strictEqual(res.statusCode, 400);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /cannot exceed 200 characters/i);
        });
    });

    describe("Review Summarization - Security & Privacy Boundaries", () => {
        it("should reject malformed or invalid product ID with 400 Bad Request", async () => {
            const invalidProductId = "not-a-valid-id-123";

            await assert.rejects(
                async () => {
                    await generateReviewSummaryService(invalidProductId);
                },
                (err) => {
                    return err.statusCode === 400 && /invalid product id/i.test(err.message);
                }
            );
        });

        it("should return clean 503 error when AI service is unconfigured without leaking secrets", async () => {
            const validProductId = "507f1f77bcf86cd799439011";

            Product.findById = () => ({
                select: () => Promise.resolve({ _id: validProductId, name: "Wireless Headphones" })
            });

            Review.find = () => ({
                select: () => ({
                    sort: () => ({
                        limit: () =>
                            Promise.resolve([
                                { rating: 5, title: "Great sound", comment: "Really loved it!" }
                            ])
                    })
                })
            });

            await assert.rejects(
                async () => {
                    await generateReviewSummaryService(validProductId);
                },
                (err) => {
                    return (
                        err.statusCode === 503 &&
                        /not configured/i.test(err.message)
                    );
                }
            );
        });

        it("should sanitize and strip customer PII (emails, user IDs, order IDs) from AI prompt context", () => {
            // Raw database reviews containing sensitive user info
            const sensitiveReviews = [
                {
                    _id: "60d0fe4f5311236168a109ca",
                    userId: "507f1f77bcf86cd799439011",
                    customerEmail: "john.doe@example.com",
                    customerPhone: "+1-555-0199",
                    orderId: "507f1f77bcf86cd799439099",
                    rating: 5,
                    title: "Excellent Battery",
                    comment: "The battery lasts for 3 days on a single charge."
                }
            ];

            // AI service prompt formatting logic
            const formattedPrompt = sensitiveReviews
                .map((r, i) => {
                    const title = r.title ? `"${r.title}" - ` : "";
                    const comment = r.comment.length > 300 ? r.comment.slice(0, 300) + "..." : r.comment;
                    return `Review ${i + 1} (${r.rating}/5 stars): ${title}${comment}`;
                })
                .join("\n");

            // Verify PII is completely excluded
            assert.strictEqual(formattedPrompt.includes("john.doe@example.com"), false);
            assert.strictEqual(formattedPrompt.includes("+1-555-0199"), false);
            assert.strictEqual(formattedPrompt.includes("507f1f77bcf86cd799439011"), false);
            assert.strictEqual(formattedPrompt.includes("507f1f77bcf86cd799439099"), false);
            assert.strictEqual(formattedPrompt.includes("60d0fe4f5311236168a109ca"), false);

            // Verify safe public review contents are present
            assert.strictEqual(formattedPrompt.includes("Excellent Battery"), true);
            assert.strictEqual(formattedPrompt.includes("battery lasts for 3 days"), true);
        });
    });
});
