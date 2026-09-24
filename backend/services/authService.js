import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerUserService = async (name, email, password) => {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
        const error = new Error("Name is required");
        error.statusCode = 400;
        throw error;
    }

    if (name.trim().length > 100) {
        const error = new Error("Name cannot exceed 100 characters");
        error.statusCode = 400;
        throw error;
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
        const error = new Error("A valid email address is required");
        error.statusCode = 400;
        throw error;
    }

    if (!password || typeof password !== "string" || password.length < 6) {
        const error = new Error("Password must be at least 6 characters long");
        error.statusCode = 400;
        throw error;
    }

    if (password.length > 128) {
        const error = new Error("Password cannot exceed 128 characters");
        error.statusCode = 400;
        throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        const error = new Error("User with this email already exists");
        error.statusCode = 409;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "customer"
    });

    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
    };
};

export const loginUserService = async (email, password) => {
    if (!process.env.JWT_SECRET) {
        const error = new Error("Authentication service is temporarily unavailable");
        error.statusCode = 500;
        throw error;
    }

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    if (user.isActive === false) {
        const error = new Error("Account has been deactivated. Please contact support.");
        error.statusCode = 403;
        throw error;
    }

    const isPasswordCorrect = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordCorrect) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const token = jwt.sign(
        {
            userId: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

    return {
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};