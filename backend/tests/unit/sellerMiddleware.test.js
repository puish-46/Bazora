import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Seller from "../../models/Seller.js";
import { approvedSeller, sellerOrAdmin } from "../../middleware/sellerMiddleware.js";
import { mockRequest, mockResponse, mockNext } from "../helpers/mockReqRes.js";

describe("Priority 1 & 3: Seller Authorization Middleware", () => {
    let originalFindOne;

    beforeEach(() => {
        originalFindOne = Seller.findOne;
    });

    afterEach(() => {
        Seller.findOne = originalFindOne;
    });

    describe("approvedSeller middleware", () => {
        it("should return 404 if seller profile does not exist", async () => {
            Seller.findOne = async () => null;

            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "seller" }
            });
            const res = mockResponse();
            const next = mockNext();

            await approvedSeller(req, res, next);

            assert.strictEqual(res.statusCode, 404);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /seller profile not found/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 403 if seller account is pending approval", async () => {
            Seller.findOne = async () => ({
                _id: "507f1f77bcf86cd799439099",
                userId: "507f1f77bcf86cd799439011",
                approvalStatus: "pending"
            });

            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "seller" }
            });
            const res = mockResponse();
            const next = mockNext();

            await approvedSeller(req, res, next);

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res.jsonData?.success, false);
            assert.match(res.jsonData?.message, /not approved/i);
            assert.strictEqual(next.called, false);
        });

        it("should return 403 if seller account has been rejected", async () => {
            Seller.findOne = async () => ({
                _id: "507f1f77bcf86cd799439099",
                userId: "507f1f77bcf86cd799439011",
                approvalStatus: "rejected"
            });

            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "seller" }
            });
            const res = mockResponse();
            const next = mockNext();

            await approvedSeller(req, res, next);

            assert.strictEqual(res.statusCode, 403);
            assert.strictEqual(res.jsonData?.success, false);
            assert.strictEqual(next.called, false);
        });

        it("should attach req.seller and call next() if seller is approved", async () => {
            const mockSellerDoc = {
                _id: "507f1f77bcf86cd799439099",
                userId: "507f1f77bcf86cd799439011",
                businessName: "Bazora Best Seller",
                approvalStatus: "approved"
            };
            Seller.findOne = async () => mockSellerDoc;

            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439011", role: "seller" }
            });
            const res = mockResponse();
            const next = mockNext();

            await approvedSeller(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(next.error, null);
            assert.strictEqual(req.seller, mockSellerDoc);
        });
    });

    describe("sellerOrAdmin middleware", () => {
        it("should return 401 if req.user is missing", async () => {
            const req = mockRequest({ user: null });
            const res = mockResponse();
            const next = mockNext();

            await sellerOrAdmin(req, res, next);

            assert.strictEqual(res.statusCode, 401);
            assert.strictEqual(next.called, false);
        });

        it("should immediately allow admin role without checking seller document", async () => {
            let sellerLookupCalled = false;
            Seller.findOne = async () => {
                sellerLookupCalled = true;
                return null;
            };

            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439033", role: "admin" }
            });
            const res = mockResponse();
            const next = mockNext();

            await sellerOrAdmin(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(sellerLookupCalled, false);
        });

        it("should delegate to approvedSeller check if role is seller", async () => {
            const mockSellerDoc = {
                _id: "507f1f77bcf86cd799439099",
                approvalStatus: "approved"
            };
            Seller.findOne = async () => mockSellerDoc;

            const req = mockRequest({
                user: { userId: "507f1f77bcf86cd799439022", role: "seller" }
            });
            const res = mockResponse();
            const next = mockNext();

            await sellerOrAdmin(req, res, next);

            assert.strictEqual(next.called, true);
            assert.strictEqual(req.seller, mockSellerDoc);
        });

        it("should return 403 for unauthorized roles like customer, delivery, or support", async () => {
            for (const role of ["customer", "delivery", "support"]) {
                const req = mockRequest({
                    user: { userId: "507f1f77bcf86cd799439000", role }
                });
                const res = mockResponse();
                const next = mockNext();

                await sellerOrAdmin(req, res, next);

                assert.strictEqual(res.statusCode, 403, `Role ${role} should be rejected`);
                assert.strictEqual(next.called, false);
            }
        });
    });
});
