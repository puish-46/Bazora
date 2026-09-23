import {
    createProductService,
    getMyProductsService,
    getProductByIdService,
    updateProductService,
    deleteProductService,
    searchProductsService
} from "../services/productService.js";


export const createProduct = async (req, res, next) => {
    try {
        const product = await createProductService(
            req.seller._id,
            req.body
        );

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (error) {
        next(error);
    }
};


export const getMyProducts = async (req, res, next) => {
    try {
        const products = await getMyProductsService(
            req.seller._id
        );

        res.status(200).json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        next(error);
    }
};


export const getProductById = async (req, res, next) => {
    try {
        const product = await getProductByIdService(
            req.params.id
        );

        res.status(200).json({
            success: true,
            product
        });

    } catch (error) {
        next(error);
    }
};


export const updateProduct = async (req, res, next) => {
    try {
        const product = await updateProductService(
            req.seller._id,
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {
        next(error);
    }
};


export const deleteProduct = async (req, res, next) => {
    try {
        const product = await deleteProductService(
            req.seller._id,
            req.params.id
        );

        res.status(200).json({
            success: true,
            message: "Product deleted successfully",
            product
        });

    } catch (error) {
        next(error);
    }
};


export const searchProducts = async (req, res, next) => {
    try {
        const result = await searchProductsService(
            req.query
        );

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        next(error);
    }
};