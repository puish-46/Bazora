import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Category from "../models/Category.js";
import { escapeRegex, validateObjectId, isValidObjectId } from "../utils/securityUtils.js";

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

    validateObjectId(storeId, "storeId");
    validateObjectId(categoryId, "categoryId");

    if (basePrice === undefined || typeof basePrice !== "number" || isNaN(basePrice) || basePrice < 0) {
        const error = new Error("basePrice must be a valid non-negative number");
        error.statusCode = 400;
        throw error;
    }

    if (
        discountPercentage !== undefined &&
        (typeof discountPercentage !== "number" ||
            isNaN(discountPercentage) ||
            discountPercentage < 0 ||
            discountPercentage > 100)
    ) {
        const error = new Error("discountPercentage must be a number between 0 and 100");
        error.statusCode = 400;
        throw error;
    }

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

    // 4. Create product (sellers can only initiate as draft or pending)
    const initialStatus = data.status === "pending" ? "pending" : "draft";

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
        discountPercentage: discountPercentage || 0,
        status: initialStatus
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
    validateObjectId(productId, "productId");

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
    validateObjectId(productId, "productId");

    if (
        data.basePrice !== undefined &&
        (typeof data.basePrice !== "number" || isNaN(data.basePrice) || data.basePrice < 0)
    ) {
        const error = new Error("basePrice must be a valid non-negative number");
        error.statusCode = 400;
        throw error;
    }

    if (
        data.discountPercentage !== undefined &&
        (typeof data.discountPercentage !== "number" ||
            isNaN(data.discountPercentage) ||
            data.discountPercentage < 0 ||
            data.discountPercentage > 100)
    ) {
        const error = new Error("discountPercentage must be a number between 0 and 100");
        error.statusCode = 400;
        throw error;
    }

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

    if (data.status !== undefined && ["draft", "pending", "inactive"].includes(data.status)) {
        product.status = data.status;
    }

    return await product.save();
};


export const deleteProductService = async (
    sellerId,
    productId
) => {
    validateObjectId(productId, "productId");

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

    // Search by product name, description or brand (safe regex)
    if (search && typeof search === "string" && search.trim() !== "") {
        const safeSearch = escapeRegex(search.trim());
        filter.$or = [
            { name: { $regex: safeSearch, $options: "i" } },
            { description: { $regex: safeSearch, $options: "i" } },
            { brand: { $regex: safeSearch, $options: "i" } }
        ];
    }

    // Category filter with ObjectId validation
    if (category && typeof category === "string" && isValidObjectId(category.trim())) {
        filter.categoryId = category.trim();
    }

    // Brand filter (safe regex)
    if (brand && typeof brand === "string" && brand.trim() !== "") {
        filter.brand = {
            $regex: escapeRegex(brand.trim()),
            $options: "i"
        };
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
        filter.basePrice = {};

        if (minPrice !== undefined && !isNaN(Number(minPrice)) && Number(minPrice) >= 0) {
            filter.basePrice.$gte = Number(minPrice);
        }

        if (maxPrice !== undefined && !isNaN(Number(maxPrice)) && Number(maxPrice) >= 0) {
            filter.basePrice.$lte = Number(maxPrice);
        }

        if (Object.keys(filter.basePrice).length === 0) {
            delete filter.basePrice;
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