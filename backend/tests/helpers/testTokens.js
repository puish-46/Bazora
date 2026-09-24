import jwt from "jsonwebtoken";

export const TEST_JWT_SECRET = "test-only-jwt-secret-do-not-use-in-production-12345";

export const generateTestToken = (
    payload = { userId: "507f1f77bcf86cd799439011", role: "customer" },
    secret = TEST_JWT_SECRET,
    options = { expiresIn: "1h" }
) => {
    return jwt.sign(payload, secret, options);
};

export const generateExpiredToken = (
    payload = { userId: "507f1f77bcf86cd799439011", role: "customer" },
    secret = TEST_JWT_SECRET
) => {
    return jwt.sign(payload, secret, { expiresIn: "-1s" });
};

export const generateInvalidToken = () => {
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidSignature";
};
