import express from "express";

import {
    getPendingSellers,
    approveSeller,
    rejectSeller
} from "../controllers/adminController.js";

import {
    protect,
    authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
    "/sellers/pending",
    protect,
    authorize("admin"),
    getPendingSellers
);

router.patch(
    "/sellers/:id/approve",
    protect,
    authorize("admin"),
    approveSeller
);

router.patch(
    "/sellers/:id/reject",
    protect,
    authorize("admin"),
    rejectSeller
);

export default router;