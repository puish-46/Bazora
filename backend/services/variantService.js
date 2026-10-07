import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";
import Inventory from "../models/Inventory.js";
import Seller from "../models/Seller.js";
import { validateObjectId } from "../utils/securityUtils.js";

const verifyProductOwnership = async (productId, sellerId) => {
    validateObjectId(productId, "productId");
    const product = await Product.findOne({
        _id: productId,
        sellerId
    });

    if (!product) {
        const error = new Error(
            "Product not found or does not belong to this seller"
        );
        error.statusCode = 403;
        throw error;
    }

    return product;
};

export const createVariantService = async (
    productId,
    sellerId,
    data
) => {
    await verifyProductOwnership(productId, sellerId);

    const {
        sku,
        attributes,
        price,
        images
    } = data;

    if (price === undefined || typeof price !== "number" || isNaN(price) || price < 0) {
        const error = new Error("price must be a valid non-negative number");
        error.statusCode = 400;
        throw error;
    }

    const existingVariant = await ProductVariant.findOne({
        sku
    });

    if (existingVariant) {
        const error = new Error("Variant with this SKU already exists");
        error.statusCode = 409;
        throw error;
    }

    const variant = await ProductVariant.create({
        productId,
        sku,
        attributes,
        price,
        images
    });

    // Automatically ensure an Inventory document exists for the newly created variant
    let initialQuantity = 0;
    if (data.quantity !== undefined && data.quantity !== null && data.quantity !== "") {
        const parsedQuantity = typeof data.quantity === "number" ? data.quantity : Number(data.quantity);
        if (Number.isInteger(parsedQuantity) && parsedQuantity >= 0) {
            initialQuantity = parsedQuantity;
        } else {
            const error = new Error("quantity must be a non-negative integer");
            error.statusCode = 400;
            throw error;
        }
    }

    let initialThreshold = 5;
    if (data.lowStockThreshold !== undefined && data.lowStockThreshold !== null && data.lowStockThreshold !== "") {
        const parsedThreshold = typeof data.lowStockThreshold === "number" ? data.lowStockThreshold : Number(data.lowStockThreshold);
        if (Number.isInteger(parsedThreshold) && parsedThreshold >= 0) {
            initialThreshold = parsedThreshold;
        }
    }

    const existingInventory = await Inventory.findOne({
        variantId: variant._id
    });

    if (!existingInventory) {
        await Inventory.create({
            variantId: variant._id,
            quantity: initialQuantity,
            reservedQuantity: 0,
            lowStockThreshold: initialThreshold
        });
    }

    return variant;
};


export const getProductVariantsService = async (
    productId,
    sellerId = null,
    user = null
) => {
    validateObjectId(productId, "productId");

    const product = await Product.findById(productId);

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    let canAccess = false;

    // 1. If product is approved, public customers & guests can retrieve active variants
    if (product.status === "approved") {
        canAccess = true;
    } else if (user?.role === "admin") {
        // 2. If product is not approved, allow access only to admin or the owning seller
        canAccess = true;
    } else if (sellerId && product.sellerId.toString() === sellerId.toString()) {
        canAccess = true;
    } else if (user?.userId) {
        const seller = await Seller.findOne({
            userId: user.userId,
            approvalStatus: "approved"
        });
        if (seller && product.sellerId.toString() === seller._id.toString()) {
            canAccess = true;
        }
    }

    if (!canAccess) {
        const error = new Error("Product not found or unavailable");
        error.statusCode = 404;
        throw error;
    }

    const variants = await ProductVariant.find({
        productId,
        isActive: true
    }).sort({ createdAt: -1 }).lean();

    if (!variants.length) {
        return [];
    }

    const variantIds = variants.map((v) => v._id);
    const inventories = await Inventory.find({
        variantId: { $in: variantIds }
    }).lean();

    const inventoryMap = new Map();
    for (const inv of inventories) {
        const available = Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0));
        inventoryMap.set(inv.variantId.toString(), available);
    }

    return variants.map((v) => {
        const stock = inventoryMap.get(v._id.toString()) ?? 0;
        return {
            ...v,
            stock,
            availableQuantity: stock,
            isOutOfStock: stock <= 0
        };
    });
};


export const updateVariantService = async (
    productId,
    variantId,
    sellerId,
    data
) => {
    validateObjectId(variantId, "variantId");
    await verifyProductOwnership(productId, sellerId);

    if (
        data.price !== undefined &&
        (typeof data.price !== "number" || isNaN(data.price) || data.price < 0)
    ) {
        const error = new Error("price must be a valid non-negative number");
        error.statusCode = 400;
        throw error;
    }

    const variant = await ProductVariant.findOne({
        _id: variantId,
        productId
    });

    if (!variant) {
        const error = new Error("Variant not found");
        error.statusCode = 404;
        throw error;
    }

    const allowedFields = [
        "sku",
        "attributes",
        "price",
        "images",
        "isActive"
    ];

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            variant[field] = data[field];
        }
    }

    return await variant.save();
};


export const deleteVariantService = async (
    productId,
    variantId,
    sellerId
) => {
    validateObjectId(variantId, "variantId");
    await verifyProductOwnership(productId, sellerId);

    const variant = await ProductVariant.findOne({
        _id: variantId,
        productId
    });

    if (!variant) {
        const error = new Error("Variant not found");
        error.statusCode = 404;
        throw error;
    }

    await ProductVariant.deleteOne({
        _id: variantId
    });

    return variant;
};
