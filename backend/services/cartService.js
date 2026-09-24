import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import Inventory from "../models/Inventory.js";
import { validateObjectId } from "../utils/securityUtils.js";

const getCartWithDetails = async (userId) => {
    const cart = await Cart.findOne({ userId })
        .populate({
            path: "items.productId",
            select: "name slug images basePrice discountPercentage status"
        })
        .populate({
            path: "items.variantId",
            select: "sku attributes price isActive"
        });

    return cart;
};

export const addToCartService = async (
    userId,
    productId,
    variantId,
    quantity
) => {
    validateObjectId(productId, "productId");
    validateObjectId(variantId, "variantId");

    if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error("Quantity must be a positive integer");
        error.statusCode = 400;
        throw error;
    }

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

    const variant = await ProductVariant.findOne({
        _id: variantId,
        productId,
        isActive: true
    });

    if (!variant) {
        const error = new Error(
            "Product variant not found or unavailable"
        );
        error.statusCode = 404;
        throw error;
    }

    const inventory = await Inventory.findOne({
        variantId
    });

    if (!inventory) {
        const error = new Error(
            "Inventory not found for this variant"
        );
        error.statusCode = 404;
        throw error;
    }

    const availableQuantity =
        inventory.quantity - inventory.reservedQuantity;

    if (quantity > availableQuantity) {
        const error = new Error(
            `Only ${availableQuantity} items are available`
        );
        error.statusCode = 400;
        throw error;
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
        cart = await Cart.create({
            userId,
            items: [
                {
                    productId,
                    variantId,
                    quantity
                }
            ]
        });

        return await getCartWithDetails(userId);
    }

    const existingItem = cart.items.find(
        (item) =>
            item.variantId.toString() === variantId
    );

    if (existingItem) {
        const newQuantity =
            existingItem.quantity + quantity;

        if (newQuantity > availableQuantity) {
            const error = new Error(
                `Only ${availableQuantity} items are available`
            );
            error.statusCode = 400;
            throw error;
        }

        existingItem.quantity = newQuantity;
    } else {
        cart.items.push({
            productId,
            variantId,
            quantity
        });
    }

    await cart.save();

    return await getCartWithDetails(userId);
};

export const getCartService = async (userId) => {
    const cart = await getCartWithDetails(userId);

    if (!cart) {
        return {
            items: []
        };
    }

    return cart;
};

export const updateCartItemService = async (
    userId,
    itemId,
    quantity
) => {
    validateObjectId(itemId, "itemId");

    if (!Number.isInteger(quantity) || quantity < 1) {
        const error = new Error("Quantity must be a positive integer");
        error.statusCode = 400;
        throw error;
    }

    const cart = await Cart.findOne({ userId });

    if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
    }

    const item = cart.items.id(itemId);

    if (!item) {
        const error = new Error("Cart item not found");
        error.statusCode = 404;
        throw error;
    }

    const inventory = await Inventory.findOne({
        variantId: item.variantId
    });

    if (!inventory) {
        const error = new Error(
            "Inventory not found for this variant"
        );
        error.statusCode = 404;
        throw error;
    }

    const availableQuantity =
        inventory.quantity - inventory.reservedQuantity;

    if (quantity > availableQuantity) {
        const error = new Error(
            `Only ${availableQuantity} items are available`
        );
        error.statusCode = 400;
        throw error;
    }

    item.quantity = quantity;

    await cart.save();

    return await getCartWithDetails(userId);
};

export const removeCartItemService = async (
    userId,
    itemId
) => {
    validateObjectId(itemId, "itemId");
    const cart = await Cart.findOne({ userId });

    if (!cart) {
        const error = new Error("Cart not found");
        error.statusCode = 404;
        throw error;
    }

    const item = cart.items.id(itemId);

    if (!item) {
        const error = new Error("Cart item not found");
        error.statusCode = 404;
        throw error;
    }

    item.deleteOne();

    await cart.save();

    return await getCartWithDetails(userId);
};