import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Category from "../models/Category.js";

export const createProductService = async (sellerId, data) => {
    const {
        storeId,
        categoryId,
        name,
        slug,
        description,
        brand,
        images,
        basePrice,
        discountPercentage
    } = data;

    // 1. Verify that the store belongs to this seller
    const store = await Store.findOne({
        _id: storeId,
        sellerId
    });

    if (!store) {
        const error = new Error(
            "Store not found or does not belong to this seller"
        );
        error.statusCode = 403;
        throw error;
    }

    // 2. Verify category exists and is active
    const category = await Category.findOne({
        _id: categoryId,
        isActive: true
    });

    if (!category) {
        const error = new Error("Category not found or inactive");
        error.statusCode = 400;
        throw error;
    }

    // 3. Check duplicate slug
    const existingProduct = await Product.findOne({ slug });

    if (existingProduct) {
        const error = new Error("Product with this slug already exists");
        error.statusCode = 409;
        throw error;
    }

    // 4. Create product
    return await Product.create({
        sellerId,
        storeId,
        categoryId,
        name,
        slug,
        description,
        brand,
        images,
        basePrice,
        discountPercentage,
        status: "draft"
    });
};


export const getMyProductsService = async (sellerId) => {
    return await Product.find({
        sellerId
    })
        .populate("storeId", "storeName")
        .populate("categoryId", "name")
        .sort({ createdAt: -1 });
};


export const getProductByIdService = async (productId) => {
    const product = await Product.findById(productId)
        .populate("storeId", "storeName")
        .populate("categoryId", "name");

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    return product;
};


export const updateProductService = async (
    sellerId,
    productId,
    data
) => {
    const product = await Product.findOne({
        _id: productId,
        sellerId
    });

    if (!product) {
        const error = new Error(
            "Product not found or does not belong to this seller"
        );
        error.statusCode = 404;
        throw error;
    }

    const allowedFields = [
        "name",
        "slug",
        "description",
        "brand",
        "images",
        "basePrice",
        "discountPercentage"
    ];

    for (const field of allowedFields) {
        if (data[field] !== undefined) {
            product[field] = data[field];
        }
    }

    return await product.save();
};


export const deleteProductService = async (
    sellerId,
    productId
) => {
    const product = await Product.findOne({
        _id: productId,
        sellerId
    });

    if (!product) {
        const error = new Error(
            "Product not found or does not belong to this seller"
        );
        error.statusCode = 404;
        throw error;
    }

    await Product.deleteOne({
        _id: productId
    });

    return product;
};


export const searchProductsService = async (queryParams) => {
    const {
        search,
        category,
        brand,
        minPrice,
        maxPrice,
        sort,
        page = 1,
        limit = 12
    } = queryParams;

    const filter = {
        status: "approved"
    };

    // Search by product name, description or brand
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } }
        ];
    }

    // Category filter
    if (category) {
        filter.categoryId = category;
    }

    // Brand filter
    if (brand) {
        filter.brand = {
            $regex: brand,
            $options: "i"
        };
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
        filter.basePrice = {};

        if (minPrice !== undefined) {
            filter.basePrice.$gte = Number(minPrice);
        }

        if (maxPrice !== undefined) {
            filter.basePrice.$lte = Number(maxPrice);
        }
    }

    // Pagination
    const currentPage = Math.max(Number(page), 1);
    const itemsPerPage = Math.min(Math.max(Number(limit), 1), 50);

    const skip = (currentPage - 1) * itemsPerPage;

    // Sorting
    let sortOption = {
        createdAt: -1
    };

    if (sort === "price_asc") {
        sortOption = { basePrice: 1 };
    }

    if (sort === "price_desc") {
        sortOption = { basePrice: -1 };
    }

    if (sort === "newest") {
        sortOption = { createdAt: -1 };
    }

    if (sort === "oldest") {
        sortOption = { createdAt: 1 };
    }

    const [products, totalProducts] = await Promise.all([
        Product.find(filter)
            .populate("storeId", "storeName")
            .populate("categoryId", "name")
            .sort(sortOption)
            .skip(skip)
            .limit(itemsPerPage),

        Product.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(
        totalProducts / itemsPerPage
    );

    return {
        products,
        pagination: {
            currentPage,
            itemsPerPage,
            totalProducts,
            totalPages,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        }
    };
};