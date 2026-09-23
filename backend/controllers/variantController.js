import {
    createVariantService,
    getProductVariantsService,
    updateVariantService,
    deleteVariantService
} from "../services/variantService.js";


export const createVariant = async (req, res, next) => {
    try {
        const variant = await createVariantService(
            req.params.productId,
            req.seller._id,
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Variant created successfully",
            variant
        });

    } catch (error) {
        next(error);
    }
};


export const getProductVariants = async (req, res, next) => {
    try {
        const variants = await getProductVariantsService(
            req.params.productId,
            req.seller._id
        );

        res.status(200).json({
            success: true,
            count: variants.length,
            variants
        });

    } catch (error) {
        next(error);
    }
};


export const updateVariant = async (req, res, next) => {
    try {
        const variant = await updateVariantService(
            req.params.productId,
            req.params.variantId,
            req.seller._id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Variant updated successfully",
            variant
        });

    } catch (error) {
        next(error);
    }
};


export const deleteVariant = async (req, res, next) => {
    try {
        const variant = await deleteVariantService(
            req.params.productId,
            req.params.variantId,
            req.seller._id
        );

        res.status(200).json({
            success: true,
            message: "Variant deleted successfully",
            variant
        });

    } catch (error) {
        next(error);
    }
};