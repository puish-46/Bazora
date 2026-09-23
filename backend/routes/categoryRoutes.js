import express from "express";

import {
    createCategory,
    getCategories,
    updateCategory
} from "../controllers/categoryController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.get("/", getCategories);

// Admin only
router.post(
    "/",
    protect,
    authorize("admin"),
    createCategory
);

router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateCategory
);

export default router;