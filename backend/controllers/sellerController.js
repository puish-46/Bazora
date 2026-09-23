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
            businessName,
            businessEmail,
            phone
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

        if (!storeName) {
            return res.status(400).json({
                success: false,
                message: "Store name is required"
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
            storeName,
            description,
            logo,
            banner
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

        if (storeName !== undefined) store.storeName = storeName;
        if (description !== undefined) store.description = description;
        if (logo !== undefined) store.logo = logo;
        if (banner !== undefined) store.banner = banner;
        if (isActive !== undefined) store.isActive = isActive;

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