import express from "express";
import authRoutes from "./authRoutes.js";
import sellerRoutes from "./sellerRoutes.js";
import adminRoutes from "./adminRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import productRoutes from "./productRoutes.js";
import variantRoutes from "./variantRoutes.js";
import inventoryRoutes from "./inventoryRoutes.js";
import wishlistRoutes from "./wishlistRoutes.js";
import cartRoutes from "./cartRoutes.js";
import orderRoutes from "./orderRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import returnRoutes from "./returnRoutes.js";
import deliveryRoutes from "./deliveryRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import supportRoutes from "./supportRoutes.js";
import settlementRoutes from "./settlementRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import couponRoutes from "./couponRoutes.js";

const router = express.Router();

router.get("/health", (req, res) => {
    res.json({
        success: true,
        message: "Bazora API is healthy 🚀"
    });
});

router.use("/auth", authRoutes);
router.use("/sellers", sellerRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/wishlist", wishlistRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/returns", returnRoutes);
router.use("/deliveries", deliveryRoutes);
router.use("/reviews", reviewRoutes);
router.use("/support", supportRoutes);
router.use("/settlements", settlementRoutes);
router.use("/notifications", notificationRoutes);
router.use("/coupons", couponRoutes);
router.use("/", variantRoutes);
router.use("/", inventoryRoutes);

export default router;