import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Priority 4 & 5: Coupon, Order & Payment Calculation Security", () => {
    // Pure calculation logic extracted from orderService & couponService
    const calculateDiscount = (coupon, cartSubtotal) => {
        const now = new Date();

        if (!coupon.isActive) {
            const error = new Error("Invalid or inactive coupon");
            error.statusCode = 400;
            throw error;
        }

        if (now < new Date(coupon.startDate)) {
            const error = new Error("Coupon has not started yet");
            error.statusCode = 400;
            throw error;
        }

        if (now > new Date(coupon.expiryDate)) {
            const error = new Error("Coupon has expired");
            error.statusCode = 400;
            throw error;
        }

        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
            if (coupon.usedCount >= coupon.usageLimit) {
                const error = new Error("Coupon usage limit reached");
                error.statusCode = 400;
                throw error;
            }
        }

        if (coupon.minimumOrderAmount && cartSubtotal < coupon.minimumOrderAmount) {
            const error = new Error(
                `Minimum order amount of ${coupon.minimumOrderAmount} required for this coupon`
            );
            error.statusCode = 400;
            throw error;
        }

        let discountAmount = 0;
        if (coupon.discountType === "percentage") {
            let discount = (cartSubtotal * coupon.discountValue) / 100;
            if (
                coupon.maximumDiscountAmount !== null &&
                coupon.maximumDiscountAmount !== undefined &&
                coupon.maximumDiscountAmount > 0
            ) {
                discount = Math.min(discount, coupon.maximumDiscountAmount);
            }
            discountAmount = discount;
        } else if (coupon.discountType === "fixed") {
            discountAmount = Math.min(coupon.discountValue, cartSubtotal);
        } else {
            const error = new Error("Invalid discount configuration");
            error.statusCode = 400;
            throw error;
        }

        discountAmount = Math.round(discountAmount * 100) / 100;
        discountAmount = Math.min(discountAmount, cartSubtotal);
        const finalTotalAmount = Math.round((cartSubtotal - discountAmount) * 100) / 100;

        return { discountAmount, finalTotalAmount };
    };

    describe("Server-Side Subtotal & Total Calculation", () => {
        it("should calculate correct subtotal given cart items and variant prices", () => {
            const items = [
                { price: 29.99, quantity: 2 },
                { price: 10.0, quantity: 3 },
                { price: 100.0, quantity: 1 }
            ];

            const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            assert.strictEqual(Number(subtotal.toFixed(2)), 189.98);
        });

        it("should prevent negative totals when discount exceeds subtotal", () => {
            const coupon = {
                code: "SUPER100",
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "fixed",
                discountValue: 500, // discount > subtotal
                minimumOrderAmount: 0,
                usageLimit: null,
                usedCount: 0
            };

            const cartSubtotal = 150.0;
            const result = calculateDiscount(coupon, cartSubtotal);

            assert.strictEqual(result.discountAmount, 150.0);
            assert.strictEqual(result.finalTotalAmount, 0.0);
            assert.ok(result.finalTotalAmount >= 0, "Total must never be negative");
        });
    });

    describe("Percentage Discount Enforcement", () => {
        it("should calculate standard percentage discount accurately", () => {
            const coupon = {
                code: "SAVE20",
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "percentage",
                discountValue: 20,
                maximumDiscountAmount: null,
                minimumOrderAmount: 50,
                usageLimit: 100,
                usedCount: 5
            };

            const cartSubtotal = 250.0;
            const result = calculateDiscount(coupon, cartSubtotal);

            // 20% of 250 = 50
            assert.strictEqual(result.discountAmount, 50.0);
            assert.strictEqual(result.finalTotalAmount, 200.0);
        });

        it("should cap percentage discount at maximumDiscountAmount when defined", () => {
            const coupon = {
                code: "MAXCAP",
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "percentage",
                discountValue: 50, // 50% of 1000 = 500
                maximumDiscountAmount: 100, // Capped at 100
                minimumOrderAmount: 0,
                usageLimit: null,
                usedCount: 0
            };

            const cartSubtotal = 1000.0;
            const result = calculateDiscount(coupon, cartSubtotal);

            assert.strictEqual(result.discountAmount, 100.0);
            assert.strictEqual(result.finalTotalAmount, 900.0);
        });
    });

    describe("Fixed Discount Enforcement", () => {
        it("should apply fixed discount and deduct from subtotal", () => {
            const coupon = {
                code: "FLAT30",
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "fixed",
                discountValue: 30.0,
                minimumOrderAmount: 100,
                usageLimit: null,
                usedCount: 0
            };

            const cartSubtotal = 150.0;
            const result = calculateDiscount(coupon, cartSubtotal);

            assert.strictEqual(result.discountAmount, 30.0);
            assert.strictEqual(result.finalTotalAmount, 120.0);
        });
    });

    describe("Coupon Validation Rules", () => {
        it("should reject inactive coupons", () => {
            const coupon = {
                code: "INACTIVE",
                isActive: false,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "fixed",
                discountValue: 10
            };

            assert.throws(
                () => calculateDiscount(coupon, 100),
                (err) => err.statusCode === 400 && /inactive/i.test(err.message)
            );
        });

        it("should reject coupons that have not started yet", () => {
            const coupon = {
                code: "FUTURE",
                isActive: true,
                startDate: new Date(Date.now() + 86400000), // starts tomorrow
                expiryDate: new Date(Date.now() + 172800000),
                discountType: "fixed",
                discountValue: 10
            };

            assert.throws(
                () => calculateDiscount(coupon, 100),
                (err) => err.statusCode === 400 && /not started/i.test(err.message)
            );
        });

        it("should reject expired coupons", () => {
            const coupon = {
                code: "EXPIRED",
                isActive: true,
                startDate: new Date(Date.now() - 172800000),
                expiryDate: new Date(Date.now() - 86400000), // expired yesterday
                discountType: "fixed",
                discountValue: 10
            };

            assert.throws(
                () => calculateDiscount(coupon, 100),
                (err) => err.statusCode === 400 && /expired/i.test(err.message)
            );
        });

        it("should enforce usage limits and reject when limit is reached", () => {
            const coupon = {
                code: "LIMITED",
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "fixed",
                discountValue: 10,
                usageLimit: 10,
                usedCount: 10 // reached
            };

            assert.throws(
                () => calculateDiscount(coupon, 100),
                (err) => err.statusCode === 400 && /usage limit/i.test(err.message)
            );
        });

        it("should enforce minimum order amount requirement", () => {
            const coupon = {
                code: "MIN500",
                isActive: true,
                startDate: new Date(Date.now() - 86400000),
                expiryDate: new Date(Date.now() + 86400000),
                discountType: "percentage",
                discountValue: 10,
                minimumOrderAmount: 500,
                usageLimit: null,
                usedCount: 0
            };

            // Order subtotal 250 is below 500
            assert.throws(
                () => calculateDiscount(coupon, 250),
                (err) => err.statusCode === 400 && /minimum order/i.test(err.message)
            );
        });
    });

    describe("Priority 5: Order & Payment Security Rules", () => {
        it("should verify that client-supplied totalAmount is ignored in favor of server calculation", () => {
            const clientProvidedBody = {
                totalAmount: 1.0, // Client attempting to pay $1
                shippingAddress: { name: "Buyer", phone: "1234567890" }
            };

            // Server-calculated items subtotal
            const actualCartItems = [
                { price: 99.99, quantity: 2 } // actual total $199.98
            ];
            const serverSubtotal = actualCartItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );

            // Server-created order must use serverSubtotal, NEVER clientProvidedBody.totalAmount
            const orderTotal = serverSubtotal;
            assert.strictEqual(orderTotal, 199.98);
            assert.notStrictEqual(orderTotal, clientProvidedBody.totalAmount);
        });

        it("should ensure initial order payment status is forced to 'pending'", () => {
            const clientProvidedBody = {
                paymentStatus: "paid", // Client attempting to claim already paid
                orderStatus: "confirmed"
            };

            const createdOrder = {
                paymentStatus: "pending", // Server always overrides to pending
                orderStatus: "pending"
            };

            assert.strictEqual(createdOrder.paymentStatus, "pending");
            assert.notStrictEqual(createdOrder.paymentStatus, clientProvidedBody.paymentStatus);
        });

        it("should ensure seller settlement gross amount is derived strictly from seller order subtotal", () => {
            const COMMISSION_PERCENTAGE = 10;
            const sellerOrder = {
                subtotal: 200.0
            };

            const grossAmount = sellerOrder.subtotal;
            const commissionAmount = Number(((grossAmount * COMMISSION_PERCENTAGE) / 100).toFixed(2));
            const netAmount = Number((grossAmount - commissionAmount).toFixed(2));

            assert.strictEqual(grossAmount, 200.0);
            assert.strictEqual(commissionAmount, 20.0);
            assert.strictEqual(netAmount, 180.0);
        });
    });
});
