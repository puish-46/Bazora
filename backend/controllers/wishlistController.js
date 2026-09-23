import {
    addToWishlistService,
    getWishlistService,
    removeFromWishlistService
} from "../services/wishlistService.js";

export const addToWishlist = async (req, res, next) => {
    try {
        const wishlist = await addToWishlistService(
            req.user.userId,
            req.params.productId
        );

        res.status(200).json({
            success: true,
            message: "Product added to wishlist",
            wishlist
        });
    } catch (error) {
        next(error);
    }
};

export const getWishlist = async (req, res, next) => {
    try {
        const wishlist = await getWishlistService(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            wishlist
        });
    } catch (error) {
        next(error);
    }
};

export const removeFromWishlist = async (req, res, next) => {
    try {
        const wishlist = await removeFromWishlistService(
            req.user.userId,
            req.params.productId
        );

        res.status(200).json({
            success: true,
            message: "Product removed from wishlist",
            wishlist
        });
    } catch (error) {
        next(error);
    }
};