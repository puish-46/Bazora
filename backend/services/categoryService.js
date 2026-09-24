import Category from "../models/Category.js";
import { validateObjectId } from "../utils/securityUtils.js";

export const createCategoryService = async (data) => {
    const { name, slug, description } = data;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
        const error = new Error("Category name is required");
        error.statusCode = 400;
        throw error;
    }

    if (name.trim().length > 100) {
        const error = new Error("Category name cannot exceed 100 characters");
        error.statusCode = 400;
        throw error;
    }

    if (!slug || typeof slug !== "string" || slug.trim().length === 0) {
        const error = new Error("Category slug is required");
        error.statusCode = 400;
        throw error;
    }

    if (slug.trim().length > 100) {
        const error = new Error("Category slug cannot exceed 100 characters");
        error.statusCode = 400;
        throw error;
    }

    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();

    const existingCategory = await Category.findOne({
        $or: [{ name: trimmedName }, { slug: trimmedSlug }]
    });

    if (existingCategory) {
        const error = new Error("Category already exists");
        error.statusCode = 409;
        throw error;
    }

    return await Category.create({
        name: trimmedName,
        slug: trimmedSlug,
        description: typeof description === "string" ? description.trim().slice(0, 1000) : ""
    });
};

export const getCategoriesService = async () => {
    return await Category.find({
        isActive: true
    }).sort({ name: 1 });
};

export const updateCategoryService = async (categoryId, data) => {
    validateObjectId(categoryId, "categoryId");

    const category = await Category.findById(categoryId);

    if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
    }

    if (data.name !== undefined) {
        if (typeof data.name !== "string" || data.name.trim().length === 0) {
            const error = new Error("Category name cannot be empty");
            error.statusCode = 400;
            throw error;
        }
        if (data.name.trim().length > 100) {
            const error = new Error("Category name cannot exceed 100 characters");
            error.statusCode = 400;
            throw error;
        }
        category.name = data.name.trim();
    }

    if (data.slug !== undefined) {
        if (typeof data.slug !== "string" || data.slug.trim().length === 0) {
            const error = new Error("Category slug cannot be empty");
            error.statusCode = 400;
            throw error;
        }
        if (data.slug.trim().length > 100) {
            const error = new Error("Category slug cannot exceed 100 characters");
            error.statusCode = 400;
            throw error;
        }
        category.slug = data.slug.trim().toLowerCase();
    }

    if (data.description !== undefined) {
        category.description = typeof data.description === "string" ? data.description.trim().slice(0, 1000) : "";
    }

    if (data.isActive !== undefined) {
        category.isActive = Boolean(data.isActive);
    }

    return await category.save();
};