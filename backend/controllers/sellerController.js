import Seller from "../models/Seller.js";
import Store from "../models/Store.js";

export const applyAsSeller = async (req, res, next) => {
    try {
        const { businessName, businessEmail, phone } = req.body;

        if (!businessName || !businessEmail || !phone) {
            return res.status(400).json({
                success: false,
                message: "Business name, business email and phone are required"
            });
        }

        if (typeof businessName !== "string" || businessName.trim().length < 2 || businessName.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Business name must be between 2 and 100 characters"
            });
        }

        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof businessEmail !== "string" || !EMAIL_REGEX.test(businessEmail.trim())) {
            return res.status(400).json({
                success: false,
                message: "A valid business email is required"
            });
        }

        if (typeof phone !== "string" || phone.trim().length < 6 || phone.trim().length > 25) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be between 6 and 25 characters"
            });
        }

        const existingSeller = await Seller.findOne({
            userId: req.user.userId
        });

        if (existingSeller) {
            return res.status(409).json({
                success: false,
                message: "Seller application already exists"
            });
        }

        const seller = await Seller.create({
            userId: req.user.userId,
            businessName: businessName.trim(),
            businessEmail: businessEmail.trim().toLowerCase(),
            phone: phone.trim()
        });

        res.status(201).json({
            success: true,
            message: "Seller application submitted successfully",
            seller
        });

    } catch (error) {
        next(error);
    }
};


//store 
export const createStore = async (req, res, next) => {
    try {
        const { storeName, description, logo, banner } = req.body;

        if (!storeName || typeof storeName !== "string" || storeName.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Store name is required"
            });
        }

        if (storeName.trim().length > 100) {
            return res.status(400).json({
                success: false,
                message: "Store name cannot exceed 100 characters"
            });
        }

        const existingStore = await Store.findOne({
            sellerId: req.seller._id
        });

        if (existingStore) {
            return res.status(409).json({
                success: false,
                message: "Store already exists for this seller"
            });
        }

        const store = await Store.create({
            sellerId: req.seller._id,
            storeName: storeName.trim(),
            description: typeof description === "string" ? description.trim().slice(0, 1000) : "",
            logo: typeof logo === "string" ? logo.trim().slice(0, 1000) : "",
            banner: typeof banner === "string" ? banner.trim().slice(0, 1000) : ""
        });

        res.status(201).json({
            success: true,
            message: "Store created successfully",
            store
        });

    } catch (error) {
        next(error);
    }
};



export const getMyStore = async (req, res, next) => {
    try {
        const store = await Store.findOne({
            sellerId: req.seller._id
        });

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Store not found"
            });
        }

        res.status(200).json({
            success: true,
            store
        });

    } catch (error) {
        next(error);
    }
};



export const updateMyStore = async (req, res, next) => {
    try {
        const { storeName, description, logo, banner, isActive } = req.body;

        const store = await Store.findOne({
            sellerId: req.seller._id
        });

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Store not found"
            });
        }

        if (storeName !== undefined) {
            if (typeof storeName !== "string" || storeName.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Store name cannot be empty"
                });
            }
            if (storeName.trim().length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Store name cannot exceed 100 characters"
                });
            }
            store.storeName = storeName.trim();
        }

        if (description !== undefined) {
            store.description = typeof description === "string" ? description.trim().slice(0, 1000) : "";
        }

        if (logo !== undefined) {
            store.logo = typeof logo === "string" ? logo.trim().slice(0, 1000) : "";
        }

        if (banner !== undefined) {
            store.banner = typeof banner === "string" ? banner.trim().slice(0, 1000) : "";
        }

        if (isActive !== undefined) {
            store.isActive = Boolean(isActive);
        }

        await store.save();

        res.status(200).json({
            success: true,
            message: "Store updated successfully",
            store
        });

    } catch (error) {
        next(error);
    }
};