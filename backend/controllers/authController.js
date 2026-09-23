import { registerUserService , loginUserService } from "../services/authService.js";

export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        const user = await registerUserService(
            name,
            email,
            password
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            user
        });

    } catch (error) {
        next(error);
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await loginUserService(
            email,
            password
        );

        res.status(200).json({
            success: true,
            message: "Login successful",
            ...result
        });

    } catch (error) {
        next(error);
    }
};