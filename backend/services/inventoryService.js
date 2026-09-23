import Inventory from "../models/Inventory.js";
import ProductVariant from "../models/ProductVariant.js";
import Product from "../models/Product.js";

const verifyVariantOwnership = async (variantId, sellerId) => {
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

    return await Inventory.create({
        variantId,
        quantity: data.quantity,
        lowStockThreshold: data.lowStockThreshold
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
        inventory.lowStockThreshold = data.lowStockThreshold;
    }

    return await inventory.save();
};