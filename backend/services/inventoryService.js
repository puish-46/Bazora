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

export const getMyInventoryService = async (sellerId) => {
    validateObjectId(sellerId, "sellerId");

    // 1. Fetch all products owned by this seller
    const products = await Product.find({ sellerId })
        .select("_id name images status basePrice")
        .lean();

    if (!products.length) {
        return [];
    }

    const productMap = new Map();
    const productIds = [];
    for (const p of products) {
        productMap.set(p._id.toString(), p);
        productIds.push(p._id);
    }

    // 2. Fetch all variants belonging to these products in bulk
    const variants = await ProductVariant.find({
        productId: { $in: productIds }
    })
        .sort({ createdAt: -1 })
        .lean();

    if (!variants.length) {
        return [];
    }

    const variantIds = variants.map((v) => v._id);

    // 3. Fetch all inventory records for these variants in bulk
    const inventories = await Inventory.find({
        variantId: { $in: variantIds }
    }).lean();

    const inventoryMap = new Map();
    for (const inv of inventories) {
        inventoryMap.set(inv.variantId.toString(), inv);
    }

    // 4. Combine into standardized inventory rows
    return variants.map((v) => {
        const product = productMap.get(v.productId.toString());
        const inv = inventoryMap.get(v._id.toString());

        const hasInv = Boolean(inv);
        const quantity = hasInv ? inv.quantity : null;
        const reservedQuantity = hasInv ? (inv.reservedQuantity || 0) : 0;
        const lowStockThreshold = hasInv ? (inv.lowStockThreshold || 5) : 5;
        const availableQuantity = hasInv
            ? Math.max(0, inv.quantity - (inv.reservedQuantity || 0))
            : 0;

        let attributesObj = {};
        if (v.attributes) {
            if (v.attributes instanceof Map) {
                attributesObj = Object.fromEntries(v.attributes);
            } else if (typeof v.attributes === "object") {
                attributesObj = v.attributes;
            }
        }

        return {
            productId: product?._id || v.productId,
            productName: product?.name || "Product",
            productImage: product?.images?.[0] || null,
            productStatus: product?.status || "draft",
            variantId: v._id,
            sku: v.sku,
            attributes: attributesObj,
            price: v.price,
            isActive: v.isActive,
            inventoryId: inv?._id || null,
            quantity,
            reservedQuantity,
            lowStockThreshold,
            availableQuantity,
            stock: availableQuantity
        };
    });
};