import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token || token.trim() === "" || token === "null" || token === "undefined") {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("CRITICAL: JWT_SECRET environment variable is missing.");
            return res.status(500).json({
                success: false,
                message: "Authentication service temporarily unavailable"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload"
            });
        }

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action"
            });
        }

        next();
    };
};