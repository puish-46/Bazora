export const errorHandler = (err, req, res, next) => {
    // Detailed server-side logging (without leaking credentials)
    console.error(`[Error] ${err.name || "Error"}: ${err.message}`);

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Mongoose bad ObjectId / CastError
    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path || "identifier"} format`;
    }

    // Mongoose schema validation error
    if (err.name === "ValidationError" && err.errors) {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((val) => val.message)
            .join(", ");
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
        statusCode = 409;
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
        message = `A record with this ${field} already exists`;
    }

    // JWT verification errors
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Invalid or expired token";
    }

    // In production, mask unhandled internal server errors
    if (statusCode >= 500 && process.env.NODE_ENV === "production") {
        message = "An unexpected error occurred. Please try again later.";
    }

    res.status(statusCode).json({
        success: false,
        message
    });
};