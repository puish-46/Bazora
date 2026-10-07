import {
    createInventoryService,
    getInventoryService,
    updateInventoryService,
    getMyInventoryService
} from "../services/inventoryService.js";

export const createInventory = async (req, res, next) => {
    try {
        const { variantId } = req.params;
        const { quantity, lowStockThreshold } = req.body;

        if (quantity === undefined) {
            return res.status(400).json({
                success: false,
                message: "Quantity is required"
            });
        }

        const inventory = await createInventoryService(
            variantId,
            req.seller._id,
            {
                quantity,
                lowStockThreshold
            }
        );

        res.status(201).json({
            success: true,
            message: "Inventory created successfully",
            inventory
        });
    } catch (error) {
        next(error);
    }
};

export const getInventory = async (req, res, next) => {
    try {
        const inventory = await getInventoryService(
            req.params.variantId,
            req.seller._id
        );

        res.status(200).json({
            success: true,
            inventory
        });
    } catch (error) {
        next(error);
    }
};

export const updateInventory = async (req, res, next) => {
    try {
        const inventory = await updateInventoryService(
            req.params.variantId,
            req.seller._id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: "Inventory updated successfully",
            inventory
        });
    } catch (error) {
        next(error);
    }
};

export const getMyInventory = async (req, res, next) => {
    try {
        const items = await getMyInventoryService(req.seller._id);

        res.status(200).json({
            success: true,
            count: items.length,
            items,
            inventory: items
        });
    } catch (error) {
        next(error);
    }
};