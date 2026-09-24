import Inventory from "../models/Inventory.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";
import { validateObjectId } from "../utils/securityUtils.js";

const verifyVariantOwnership = async (variantId, sellerId) => {
    validateObjectId(variantId, "variantId");
    const variant = await ProductVariant.findById(variantId);

    if (!variant) {
        const error = new Error("Product variant not found");
        error.statusCode = 404;
        throw error;
    }

    const product = await Product.findOne({
        _id: variant.productId,
        sellerId
    });

    if (!product) {
        const error = new Error(
            "Variant does not belong to this seller"
        );
        error.statusCode = 403;
        throw error;
    }

    return variant;
};

export const createInventoryService = async (
    variantId,
    sellerId,
    data
) => {
    await verifyVariantOwnership(variantId, sellerId);

    const existingInventory = await Inventory.findOne({
        variantId
    });

    if (existingInventory) {
        const error = new Error(
            "Inventory already exists for this variant"
        );
        error.statusCode = 409;
        throw error;
    }

    if (
        data.quantity === undefined ||
        typeof data.quantity !== "number" ||
        isNaN(data.quantity) ||
        data.quantity < 0 ||
        !Number.isInteger(data.quantity)
    ) {
        const error = new Error("quantity must be a non-negative integer");
        error.statusCode = 400;
        throw error;
    }

    if (
        data.lowStockThreshold !== undefined &&
        (typeof data.lowStockThreshold !== "number" ||
            isNaN(data.lowStockThreshold) ||
            data.lowStockThreshold < 0 ||
            !Number.isInteger(data.lowStockThreshold))
    ) {
        const error = new Error("lowStockThreshold must be a non-negative integer");
        error.statusCode = 400;
        throw error;
    }

    return await Inventory.create({
        variantId,
        quantity: data.quantity,
        lowStockThreshold: data.lowStockThreshold || 5
    });
};

export const getInventoryService = async (
    variantId,
    sellerId
) => {
    await verifyVariantOwnership(variantId, sellerId);

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

    return inventory;
};

export const updateInventoryService = async (
    variantId,
    sellerId,
    data
) => {
    await verifyVariantOwnership(variantId, sellerId);

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

    if (data.quantity !== undefined) {
        if (
            typeof data.quantity !== "number" ||
            isNaN(data.quantity) ||
            data.quantity < 0 ||
            !Number.isInteger(data.quantity)
        ) {
            const error = new Error("quantity must be a non-negative integer");
            error.statusCode = 400;
            throw error;
        }

        if (data.quantity < inventory.reservedQuantity) {
            const error = new Error(
                "Quantity cannot be less than reserved quantity"
            );
            error.statusCode = 400;
            throw error;
        }

        inventory.quantity = data.quantity;
    }

    if (data.lowStockThreshold !== undefined) {
        if (
            typeof data.lowStockThreshold !== "number" ||
            isNaN(data.lowStockThreshold) ||
            data.lowStockThreshold < 0 ||
            !Number.isInteger(data.lowStockThreshold)
        ) {
            const error = new Error("lowStockThreshold must be a non-negative integer");
            error.statusCode = 400;
            throw error;
        }

        inventory.lowStockThreshold = data.lowStockThreshold;
    }

    return await inventory.save();
};