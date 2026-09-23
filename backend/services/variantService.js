import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";

const verifyProductOwnership = async (productId, sellerId) => {
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

    const existingVariant = await ProductVariant.findOne({
        sku
    });

    if (existingVariant) {
        const error = new Error("Variant with this SKU already exists");
        error.statusCode = 409;
        throw error;
    }

    return await ProductVariant.create({
        productId,
        sku,
        attributes,
        price,
        images
    });
};


export const getProductVariantsService = async (
    productId,
    sellerId
) => {
    await verifyProductOwnership(productId, sellerId);

    return await ProductVariant.find({
        productId,
        isActive: true
    }).sort({ createdAt: -1 });
};


export const updateVariantService = async (
    productId,
    variantId,
    sellerId,
    data
) => {
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
