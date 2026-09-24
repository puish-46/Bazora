import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "../../middleware/errorMiddleware.js";
import { mockRequest, mockResponse, mockNext } from "../helpers/mockReqRes.js";

describe("Priority 8: Error Handling Middleware", () => {
    let originalNodeEnv;

    beforeEach(() => {
        originalNodeEnv = process.env.NODE_ENV;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it("should transform Mongoose CastError to a 400 Bad Request with sanitized message", () => {
        const castError = new Error("Cast to ObjectId failed for value 'xyz' at path '_id'");
        castError.name = "CastError";
        castError.path = "productId";

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(castError, req, res, next);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData?.success, false);
        assert.strictEqual(res.jsonData?.message, "Invalid productId format");
    });

    it("should transform Mongoose ValidationError to a 400 Bad Request", () => {
        const validationError = new Error("Validation failed");
        validationError.name = "ValidationError";
        validationError.errors = {
            name: { message: "Product name is required" },
            basePrice: { message: "Base price must be non-negative" }
        };

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(validationError, req, res, next);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData?.success, false);
        assert.match(res.jsonData?.message, /Product name is required/);
        assert.match(res.jsonData?.message, /Base price must be non-negative/);
    });

    it("should transform MongoDB duplicate key error (code 11000) to a 409 Conflict", () => {
        const duplicateError = new Error("E11000 duplicate key error collection");
        duplicateError.code = 11000;
        duplicateError.keyValue = { email: "user@bazora.com" };

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(duplicateError, req, res, next);

        assert.strictEqual(res.statusCode, 409);
        assert.strictEqual(res.jsonData?.success, false);
        assert.strictEqual(res.jsonData?.message, "A record with this email already exists");
    });

    it("should transform JsonWebTokenError to a 401 Unauthorized", () => {
        const jwtError = new Error("invalid signature");
        jwtError.name = "JsonWebTokenError";

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(jwtError, req, res, next);

        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.jsonData?.success, false);
        assert.strictEqual(res.jsonData?.message, "Invalid or expired token");
    });

    it("should transform TokenExpiredError to a 401 Unauthorized", () => {
        const expiredError = new Error("jwt expired");
        expiredError.name = "TokenExpiredError";

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(expiredError, req, res, next);

        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.jsonData?.success, false);
        assert.strictEqual(res.jsonData?.message, "Invalid or expired token");
    });

    it("should mask 500 error messages in production to prevent information disclosure", () => {
        process.env.NODE_ENV = "production";

        const internalError = new Error("Database connection to mongodb://admin:secret@cluster0 failed");
        internalError.statusCode = 500;

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(internalError, req, res, next);

        assert.strictEqual(res.statusCode, 500);
        assert.strictEqual(res.jsonData?.success, false);
        assert.strictEqual(
            res.jsonData?.message,
            "An unexpected error occurred. Please try again later."
        );
        // Ensure no internal DB credentials or strings leaked into response
        assert.doesNotMatch(JSON.stringify(res.jsonData), /mongodb/i);
        assert.doesNotMatch(JSON.stringify(res.jsonData), /secret/i);
    });

    it("should preserve specific client error messages for 4xx status codes", () => {
        process.env.NODE_ENV = "production";

        const clientError = new Error("Coupon usage limit reached");
        clientError.statusCode = 400;

        const req = mockRequest();
        const res = mockResponse();
        const next = mockNext();

        errorHandler(clientError, req, res, next);

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData?.success, false);
        assert.strictEqual(res.jsonData?.message, "Coupon usage limit reached");
    });
});
