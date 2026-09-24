import mongoose from "mongoose";

/**
 * Escapes regex special characters in user input to prevent ReDoS
 * and unexpected pattern matching in MongoDB regex queries.
 */
export const escapeRegex = (string) => {
    if (typeof string !== "string") return "";
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Validates whether a given value is a valid MongoDB ObjectId.
 */
export const isValidObjectId = (id) => {
    if (!id) return false;
    return (
        mongoose.Types.ObjectId.isValid(id) &&
        String(new mongoose.Types.ObjectId(id)) === String(id)
    );
};

/**
 * Throws a 400 Bad Request error if the provided ID is not a valid ObjectId.
 */
export const validateObjectId = (id, fieldName = "ID") => {
    if (!isValidObjectId(id)) {
        const error = new Error(`Invalid ${fieldName} format`);
        error.statusCode = 400;
        throw error;
    }
};

/**
 * Validates that a numeric value is non-negative and finite.
 */
export const isValidPositiveNumber = (val, allowZero = true) => {
    if (val === undefined || val === null) return false;
    const num = Number(val);
    if (isNaN(num) || !isFinite(num)) return false;
    return allowZero ? num >= 0 : num > 0;
};
