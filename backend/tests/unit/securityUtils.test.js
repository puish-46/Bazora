import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    isValidObjectId,
    validateObjectId,
    escapeRegex,
    isValidPositiveNumber
} from "../../utils/securityUtils.js";

describe("Priority 2: Input Validation & Security Utilities", () => {
    describe("isValidObjectId", () => {
        it("should return true for valid 24-character hexadecimal ObjectId strings", () => {
            const validIds = [
                "507f1f77bcf86cd799439011",
                "000000000000000000000000",
                "ffffffffffffffffffffffff",
                "60d0fe4f5311236168a109ca"
            ];
            for (const id of validIds) {
                assert.strictEqual(isValidObjectId(id), true, `Expected ${id} to be valid`);
            }
        });

        it("should return false for null, undefined, empty string, or non-string values", () => {
            assert.strictEqual(isValidObjectId(null), false);
            assert.strictEqual(isValidObjectId(undefined), false);
            assert.strictEqual(isValidObjectId(""), false);
            assert.strictEqual(isValidObjectId(12345), false);
            assert.strictEqual(isValidObjectId({}), false);
            assert.strictEqual(isValidObjectId([]), false);
        });

        it("should return false for strings with invalid lengths or non-hex characters", () => {
            assert.strictEqual(isValidObjectId("123"), false); // too short
            assert.strictEqual(isValidObjectId("507f1f77bcf86cd79943901"), false); // 23 chars
            assert.strictEqual(isValidObjectId("507f1f77bcf86cd7994390112"), false); // 25 chars
            assert.strictEqual(isValidObjectId("507f1f77bcf86cd79943901z"), false); // 'z' is non-hex
            assert.strictEqual(isValidObjectId("507f1f77bcf86cd79943901G"), false); // 'G' is non-hex
        });

        it("should reject NoSQL injection attempts and malformed inputs", () => {
            const maliciousPayloads = [
                '{"$gt": ""}',
                "507f1f77bcf86cd799439011' OR '1'='1",
                "admin",
                "undefined",
                "null",
                "../../etc/passwd"
            ];
            for (const payload of maliciousPayloads) {
                assert.strictEqual(isValidObjectId(payload), false);
            }
        });
    });

    describe("validateObjectId", () => {
        it("should not throw an error when provided a valid ObjectId", () => {
            assert.doesNotThrow(() => {
                validateObjectId("507f1f77bcf86cd799439011", "productId");
            });
        });

        it("should throw a 400 Bad Request error with field name when provided invalid ObjectId", () => {
            assert.throws(
                () => {
                    validateObjectId("invalid-id-123", "orderId");
                },
                (err) => {
                    return (
                        err instanceof Error &&
                        err.statusCode === 400 &&
                        err.message.includes("orderId") &&
                        err.message.includes("format")
                    );
                }
            );
        });
    });

    describe("escapeRegex", () => {
        it("should escape all regex metacharacters", () => {
            const input = "iPhone 15 (Pro) + Max? [256GB] *Special* ^Top$ | Deal \\ Hot";
            const escaped = escapeRegex(input);

            // Escaped string should safely compile into RegExp without syntax errors
            assert.doesNotThrow(() => new RegExp(escaped, "i"));

            // Must match the exact literal string
            const regex = new RegExp(escaped, "i");
            assert.strictEqual(regex.test(input), true);
            assert.strictEqual(regex.test("iPhone 15 Pro Max"), false);
        });

        it("should return empty string for non-string inputs", () => {
            assert.strictEqual(escapeRegex(null), "");
            assert.strictEqual(escapeRegex(undefined), "");
            assert.strictEqual(escapeRegex(123), "");
            assert.strictEqual(escapeRegex({}), "");
        });

        it("should prevent regex injection / ReDoS payloads from breaking queries", () => {
            const redosAttack = "(a+)+$";
            const escaped = escapeRegex(redosAttack);
            assert.strictEqual(escaped, "\\(a\\+\\)\\+\\$");
        });
    });

    describe("isValidPositiveNumber", () => {
        it("should return true for valid positive numbers", () => {
            assert.strictEqual(isValidPositiveNumber(100), true);
            assert.strictEqual(isValidPositiveNumber(0.99), true);
            assert.strictEqual(isValidPositiveNumber("49.99"), true);
        });

        it("should handle zero according to allowZero argument", () => {
            assert.strictEqual(isValidPositiveNumber(0, true), true);
            assert.strictEqual(isValidPositiveNumber(0, false), false);
        });

        it("should return false for negative numbers", () => {
            assert.strictEqual(isValidPositiveNumber(-1), false);
            assert.strictEqual(isValidPositiveNumber(-0.01), false);
            assert.strictEqual(isValidPositiveNumber("-50"), false);
        });

        it("should return false for NaN, Infinity, null, and undefined", () => {
            assert.strictEqual(isValidPositiveNumber(NaN), false);
            assert.strictEqual(isValidPositiveNumber(Infinity), false);
            assert.strictEqual(isValidPositiveNumber(-Infinity), false);
            assert.strictEqual(isValidPositiveNumber(null), false);
            assert.strictEqual(isValidPositiveNumber(undefined), false);
            assert.strictEqual(isValidPositiveNumber("abc"), false);
        });
    });
});
