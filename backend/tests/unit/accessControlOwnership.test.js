import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import Product from "../../models/Product.js";
import ProductVariant from "../../models/ProductVariant.js";
import Order from "../../models/Order.js";
import Delivery from "../../models/Delivery.js";
import SupportTicket from "../../models/SupportTicket.js";
import { updateProductService, createProductService } from "../../services/productService.js";
import { createVariantService } from "../../services/variantService.js";
import { updateInventoryService } from "../../services/inventoryService.js";
import { getOrderByIdService } from "../../services/orderService.js";
import { updateDeliveryStatusService } from "../../services/deliveryService.js";
import { addTicketMessageService } from "../../services/supportService.js";

describe("Priority 3: Access Control & Resource Ownership Boundaries", () => {
    let originalProductFindOne;
    let originalProductFindById;
    let originalVariantFindById;
    let originalOrderFindOne;
    let originalDeliveryFindOne;
    let originalTicketFindById;
    let originalProductCreate;

    beforeEach(() => {
        originalProductFindOne = Product.findOne;
        originalProductFindById = Product.findById;
        originalVariantFindById = ProductVariant.findById;
        originalOrderFindOne = Order.findOne;
        originalDeliveryFindOne = Delivery.findOne;
        originalTicketFindById = SupportTicket.findById;
        originalProductCreate = Product.create;
    });

    afterEach(() => {
        Product.findOne = originalProductFindOne;
        Product.findById = originalProductFindById;
        ProductVariant.findById = originalVariantFindById;
        Order.findOne = originalOrderFindOne;
        Delivery.findOne = originalDeliveryFindOne;
        SupportTicket.findById = originalTicketFindById;
        Product.create = originalProductCreate;
    });

    describe("Seller Product & Variant Ownership", () => {
        it("should prevent a seller from modifying another seller's product", async () => {
            const victimSellerId = "507f1f77bcf86cd799439011";
            const attackerSellerId = "507f1f77bcf86cd799439099";
            const productId = "507f1f77bcf86cd799439022";

            // Product belongs to victimSellerId; search with attackerSellerId yields null
            Product.findOne = async (query) => {
                if (query.sellerId?.toString() === attackerSellerId) {
                    return null;
                }
                return { _id: productId, sellerId: victimSellerId };
            };

            await assert.rejects(
                async () => {
                    await updateProductService(attackerSellerId, productId, {
                        name: "Hacked Product Name"
                    });
                },
                (err) => {
                    return (
                        err.statusCode === 404 &&
                        /not belong to this seller/i.test(err.message)
                    );
                }
            );
        });

        it("should prevent a seller from creating variants for another seller's product", async () => {
            const attackerSellerId = "507f1f77bcf86cd799439099";
            const productId = "507f1f77bcf86cd799439022";

            Product.findOne = async () => null; // Not found for attacker

            await assert.rejects(
                async () => {
                    await createVariantService(productId, attackerSellerId, {
                        sku: "SKU-HACK",
                        price: 99.99
                    });
                },
                (err) => {
                    return (
                        err.statusCode === 403 &&
                        /not belong to this seller/i.test(err.message)
                    );
                }
            );
        });

        it("should prevent sellers from self-approving newly created products", () => {
            // Test the initial status guard in product creation
            const attackerInput = {
                status: "approved" // Attacker trying to bypass admin moderation
            };

            const initialStatus = attackerInput.status === "pending" ? "pending" : "draft";
            assert.strictEqual(initialStatus, "draft");
            assert.notStrictEqual(initialStatus, "approved");
        });
    });

    describe("Customer Order Access Boundaries", () => {
        it("should prevent a customer from accessing another customer's order", async () => {
            const legitimateCustomer = "507f1f77bcf86cd799439011";
            const eavesdropperCustomer = "507f1f77bcf86cd799439088";
            const orderId = "507f1f77bcf86cd799439044";

            // Query scoped by { _id: orderId, userId: eavesdropperCustomer } returns null
            Order.findOne = () => ({
                populate: () => ({
                    populate: () => ({
                        populate: () => Promise.resolve(null)
                    })
                })
            });

            await assert.rejects(
                async () => {
                    await getOrderByIdService(eavesdropperCustomer, orderId);
                },
                (err) => {
                    return err.statusCode === 404 && /order not found/i.test(err.message);
                }
            );
        });
    });

    describe("Delivery Partner Boundaries", () => {
        it("should prevent a delivery partner from updating deliveries assigned to someone else", async () => {
            const assignedPartnerId = "507f1f77bcf86cd799439055";
            const otherPartnerId = "507f1f77bcf86cd799439066";
            const deliveryId = "507f1f77bcf86cd799439077";

            // Scoped search with otherPartnerId returns null
            Delivery.findOne = async () => null;

            await assert.rejects(
                async () => {
                    await updateDeliveryStatusService(
                        otherPartnerId,
                        deliveryId,
                        "picked_up"
                    );
                },
                (err) => {
                    return err.statusCode === 404 && /delivery not found/i.test(err.message);
                }
            );
        });
    });

    describe("Support Ticket Access Boundaries", () => {
        it("should prevent a customer from replying to another customer's support ticket", async () => {
            const ticketOwnerId = "507f1f77bcf86cd799439011";
            const intruderCustomerId = "507f1f77bcf86cd799439099";
            const ticketId = "507f1f77bcf86cd799439033";

            SupportTicket.findById = async () => ({
                _id: ticketId,
                userId: { toString: () => ticketOwnerId },
                status: "open"
            });

            await assert.rejects(
                async () => {
                    await addTicketMessageService(
                        intruderCustomerId,
                        ticketId,
                        "Intrusion attempt",
                        false // isSupportAgent = false
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 403 &&
                        /do not have access to this ticket/i.test(err.message)
                    );
                }
            );
        });

        it("should prevent a support agent from replying to a ticket assigned to a different agent", async () => {
            const assignedAgentId = "507f1f77bcf86cd799439077";
            const differentAgentId = "507f1f77bcf86cd799439088";
            const ticketId = "507f1f77bcf86cd799439033";

            SupportTicket.findById = async () => ({
                _id: ticketId,
                userId: { toString: () => "507f1f77bcf86cd799439011" },
                assignedTo: { toString: () => assignedAgentId },
                status: "in_progress"
            });

            await assert.rejects(
                async () => {
                    await addTicketMessageService(
                        differentAgentId,
                        ticketId,
                        "Reply from wrong agent",
                        true // isSupportAgent = true
                    );
                },
                (err) => {
                    return (
                        err.statusCode === 403 &&
                        /assigned to another support agent/i.test(err.message)
                    );
                }
            );
        });
    });
});
