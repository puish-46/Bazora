import Category from "../models/Category.js";

export const createCategoryService = async (data) => {
    const { name, slug, description } = data;

    const existingCategory = await Category.findOne({
        $or: [{ name }, { slug }]
    });

    if (existingCategory) {
        const error = new Error("Category already exists");
        error.statusCode = 409;
        throw error;
    }

    return await Category.create({
        name,
        slug,
        description
    });
};

export const getCategoriesService = async () => {
    return await Category.find({
        isActive: true
    }).sort({ name: 1 });
};

export const updateCategoryService = async (categoryId, data) => {
    const category = await Category.findById(categoryId);

    if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
    }

    if (data.name !== undefined) category.name = data.name;
    if (data.slug !== undefined) category.slug = data.slug;
    if (data.description !== undefined) {
        category.description = data.description;
    }
    if (data.isActive !== undefined) {
        category.isActive = data.isActive;
    }

    return await category.save();
};