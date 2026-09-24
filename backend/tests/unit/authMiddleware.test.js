import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { mockRequest, mockResponse, mockNext } from "../helpers/mockReqRes.js";
import {
    TEST_JWT_SECRET,
    generateTestToken,
    generateExpiredToken,
    generateInvalidToken
} from "../helpers/testTokens.js";

describe("Priority 1: Authentication & Authorization Middleware", () => {
    let originalSecret;

    beforeEach(() => {
        originalSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = TEST_JWT_SECRET;
    });

    afterEach(() => {
        process.env.JWT_SECRET = originalSecret;
    });

    describe("protect middleware - Token Authentication", () => {
        it("should return 401 if Authorization header is missing", () => {
            const req = mockRequest();
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /authentication required/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 401 if Authorization header does not use Bearer scheme", () => {
            const req = mockRequest({
                headers: { authorization: "Basic dXNlcjpwYXNz" }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /authentication required/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 401 if Bearer token is empty or whitespace", () => {
            const req = mockRequest({
                headers: { authorization: "Bearer " }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /authentication required/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 401 if Bearer token is literal string 'null' or 'undefined'", () => {
            const reqNull = mockRequest({
                headers: { authorization: "Bearer null" }
            });
            const resNull = mockResponse();
            const nextNull = mockNext();

            protect(reqNull, resNull, nextNull);
            assert.strictEqual(resNull.statusCode, 401);

            const reqUndefined = mockRequest({
                headers: { authorization: "Bearer undefined" }
            });
            const resUndefined = mockResponse();
            const nextUndefined = mockNext();

            protect(reqUndefined, resUndefined, nextUndefined);
            assert.strictEqual(resUndefined.statusCode, 401);
        });

        it("should return 500 without leaking credentials if JWT_SECRET is unset", () => {
            delete process.env.JWT_SECRET;

            const token = generateTestToken();
            const req = mockRequest({
                headers: { authorization: `Bearer ${token}` }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 500);
            assert.strictEqual(res.jsonData?.success, false);
            assert.strictEqual(next.called, false);
            // Ensure no secret or technical trace is returned
            assert.doesNotMatch(JSON.stringify(res.jsonData), /secret/i);
        });

        it("should return 401 if token is malformed or invalid", () => {
            const invalidToken = generateInvalidToken();
            const req = mockRequest({
                headers: { authorization: `Bearer ${invalidToken}` }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /invalid or expired token/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 401 if token is expired", () => {
            const expiredToken = generateExpiredToken();
            const req = mockRequest({
                headers: { authorization: `Bearer ${expiredToken}` }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /invalid or expired token/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 401 if token payload is missing userId", () => {
            const tokenWithoutUserId = generateTestToken({ role: "customer" });
            const req = mockRequest({
                headers: { authorization: `Bearer ${tokenWithoutUserId}` }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /invalid token payload/i);
            assert.strictEqual(next.called, false);
        });

        it("should populate req.user and call next() when token is valid", () => {
            const token = generateTestToken({
                userId: "507f1f77bcf86cd799439011",
                role: "seller"
            });
            const req = mockRequest({
                headers: { authorization: `Bearer ${token}` }
            });
            const res = mockResponse();
            const next = mockNext();

            protect(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(next.error, null);
            assert.strictEqual(req.user?.userId, "507f1f77bcf86cd799439011");
            assert.strictEqual(req.user?.role, "seller");
        });
    });

    describe("authorize middleware - Role-Based Access Control", () => {
        it("should return 401 if req.user is missing", () => {
            const req = mockRequest({ user: null });
            const res = mockResponse();
            const next = mockNext();

            const middleware = authorize("admin");
            middleware(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(next.called, false);
        });

        it("should return 403 when customer tries to access admin-only route", () => {
            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "customer" }
            });
            const res = mockResponse();
            const next = mockNext();

            const middleware = authorize("admin");
            middleware(req, res, next);

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res.jsonData?.success, false);
            assert.strictEqual(next.called, false);
        });

        it("should return 403 when seller tries to access admin-only route", () => {
            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439022", role: "seller" }
            });
            const res = mockResponse();
            const next = mockNext();

            const middleware = authorize("admin");
            middleware(req, res, next);

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(next.called, false);
        });

        it("should allow admin access to admin-only route", () => {
            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439033", role: "admin" }
            });
            const res = mockResponse();
            const next = mockNext();

            const middleware = authorize("admin");
            middleware(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(res.headersSent, false);
        });

        it("should enforce delivery-only route boundaries", () => {
            const customerReq = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "customer" }
            });
            const customerRes = mockResponse();
            const customerNext = mockNext();

            const deliveryMiddleware = authorize("delivery");
            deliveryMiddleware(customerReq, customerRes, customerNext);

            assert.strictEqual(customerRes.statusCode, 403);
            assert.strictEqual(customerNext.called, false);

            const deliveryReq = mockRequest({
                user: { userId: "507f1f77bcf86cd799439044", role: "delivery" }
            });
            const deliveryRes = mockResponse();
            const deliveryNext = mockNext();

            deliveryMiddleware(deliveryReq, deliveryRes, deliveryNext);
            assert.strictEqual(deliveryNext.called, true);
        });

        it("should allow multi-role authorization (e.g. seller or admin)", () => {
            const sellerOrAdminMiddleware = authorize("seller", "admin");

            const sellerReq = mockRequest({
                user: { userId: "507f1f77bcf86cd799439022", role: "seller" }
            });
            const sellerRes = mockResponse();
            const sellerNext = mockNext();
            sellerOrAdminMiddleware(sellerReq, sellerRes, sellerNext);
            assert.strictEqual(sellerNext.called, true);

            const adminReq = mockRequest({
                user: { userId: "507f1f77bcf86cd799439033", role: "admin" }
            });
            const adminRes = mockResponse();
            const adminNext = mockNext();
            sellerOrAdminMiddleware(adminReq, adminRes, adminNext);
            assert.strictEqual(adminNext.called, true);

            const customerReq = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "customer" }
            });
            const customerRes = mockResponse();
            const customerNext = mockNext();
            sellerOrAdminMiddleware(customerReq, customerRes, customerNext);
            assert.strictEqual(customerRes.statusCode, 403);
            assert.strictEqual(customerNext.called, false);
        });
    });
});
