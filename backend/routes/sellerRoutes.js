import express from "express";
import { applyAsSeller , createStore , getMyStore , updateMyStore } from "../controllers/sellerController.js";
import { protect } from "../middleware/authMiddleware.js";
import { approvedSeller } from "../middleware/sellerMiddleware.js";

const router = express.Router();

router.post("/apply", protect, applyAsSeller);
router.post("/store", protect, approvedSeller, createStore);
router.get("/store", protect, approvedSeller, getMyStore);
router.put("/store", protect, approvedSeller, updateMyStore);

export default router;