import {
    addToCartService,
    getCartService,
    updateCartItemService,
    removeCartItemService
} from "../services/cartService.js";

export const addToCart = async (req, res, next) => {
    try {
        const {
            productId,
            variantId,
            quantity
        } = req.body;

        if (!productId || !variantId || !quantity) {
            return res.status(400).json({
                success: false,
                message:
                    "Product ID, variant ID and quantity are required"
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1"
            });
        }

        const cart = await addToCartService(
            req.user.userId,
            productId,
            variantId,
            quantity
        );

        res.status(200).json({
            success: true,
            message: "Product added to cart",
            cart
        });
    } catch (error) {
        next(error);
    }
};

export const getCart = async (req, res, next) => {
    try {
        const cart = await getCartService(
            req.user.userId
        );

        res.status(200).json({
            success: true,
            cart
        });
    } catch (error) {
        next(error);
    }
};

export const updateCartItem = async (req, res, next) => {
    try {
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be at least 1"
            });
        }

        const cart = await updateCartItemService(
            req.user.userId,
            req.params.itemId,
            quantity
        );

        res.status(200).json({
            success: true,
            message: "Cart item updated",
            cart
        });
    } catch (error) {
        next(error);
    }
};

export const removeCartItem = async (req, res, next) => {
    try {
        const cart = await removeCartItemService(
            req.user.userId,
            req.params.itemId
        );

        res.status(200).json({
            success: true,
            message: "Cart item removed",
            cart
        });
    } catch (error) {
        next(error);
    }
};