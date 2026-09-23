import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

export const addToWishlistService = async (userId, productId) => {
    const product = await Product.findOne({
        _id: productId,
        status: "approved"
    });

    if (!product) {
        const error = new Error(
            "Product not found or unavailable"
        );
        error.statusCode = 404;
        throw error;
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        wishlist = await Wishlist.create({
            userId,
            products: [productId]
        });
    } else {
        if (wishlist.products.includes(productId)) {
            const error = new Error(
                "Product is already in your wishlist"
            );
            error.statusCode = 409;
            throw error;
        }

        wishlist.products.push(productId);
        await wishlist.save();
    }

    return await wishlist.populate({
        path: "products",
        populate: [
            { path: "categoryId", select: "name" },
            { path: "storeId", select: "storeName" }
        ]
    });
};

export const getWishlistService = async (userId) => {
    const wishlist = await Wishlist.findOne({ userId })
        .populate({
            path: "products",
            populate: [
                { path: "categoryId", select: "name" },
                { path: "storeId", select: "storeName" }
            ]
        });

    if (!wishlist) {
        return {
            products: []
        };
    }

    return wishlist;
};

export const removeFromWishlistService = async (
    userId,
    productId
) => {
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        const error = new Error("Wishlist not found");
        error.statusCode = 404;
        throw error;
    }

    const productExists = wishlist.products.some(
        (id) => id.toString() === productId
    );

    if (!productExists) {
        const error = new Error(
            "Product is not in your wishlist"
        );
        error.statusCode = 404;
        throw error;
    }

    wishlist.products.pull(productId);

    await wishlist.save();

    return await wishlist.populate({
        path: "products",
        populate: [
            { path: "categoryId", select: "name" },
            { path: "storeId", select: "storeName" }
        ]
    });
};