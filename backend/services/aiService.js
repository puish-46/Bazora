import mongoose from "mongoose";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Category from "../models/Category.js";
import ProductVariant from "../models/ProductVariant.js";
import Inventory from "../models/Inventory.js";
import { escapeRegex, validateObjectId, isValidObjectId } from "../utils/securityUtils.js";

// ==========================================
// AI PROVIDER COMMUNICATION HELPER
// ==========================================

const callAIProvider = async ({
    messages,
    temperature = 0.7,
    maxTokens = 1000,
    jsonMode = false
}) => {
    const apiKey =
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GROQ_API_KEY;

    if (!apiKey) {
        const error = new Error(
            "AI service is not configured. Please set AI_API_KEY in the environment."
        );
        error.statusCode = 503;
        throw error;
    }

    const baseUrl =
        process.env.AI_BASE_URL ||
        (process.env.GROQ_API_KEY
            ? "https://api.groq.com/openai/v1"
            : process.env.GEMINI_API_KEY
            ? "https://generativelanguage.googleapis.com/v1beta/openai"
            : "https://api.openai.com/v1");

    const model =
        process.env.AI_MODEL ||
        (process.env.GROQ_API_KEY
            ? "llama-3.3-70b-versatile"
            : process.env.GEMINI_API_KEY
            ? "gemini-2.0-flash"
            : "gpt-4o-mini");

    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const requestBody = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens
    };

    if (jsonMode) {
        requestBody.response_format = { type: "json_object" };
    }

    let response;
    try {
        response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });
    } catch (networkError) {
        console.error("AI Provider network error:", networkError.message);
        const error = new Error(
            "AI service is currently unreachable. Please try again later."
        );
        error.statusCode = 502;
        throw error;
    }

    if (!response.ok) {
        let errorDetails = "";
        try {
            const errorJson = await response.json();
            errorDetails = errorJson.error?.message || response.statusText;
        } catch {
            errorDetails = response.statusText;
        }

        console.error(`AI Provider error [${response.status}]:`, errorDetails);

        const error = new Error(
            "AI service encountered an error processing your request. Please try again later."
        );
        error.statusCode = response.status >= 500 ? 502 : 500;
        throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        console.error("AI Provider returned empty content:", data);
        const error = new Error(
            "AI service returned an empty response. Please try again."
        );
        error.statusCode = 502;
        throw error;
    }

    return content.trim();
};

// ==========================================
// JSON PARSING & UTILITY HELPERS
// ==========================================

export const parseJSONSafely = (text) => {
    if (!text || typeof text !== "string") return null;

    // 1. Direct parse attempt
    try {
        return JSON.parse(text.trim());
    } catch {}

    // 2. Extract from markdown code fence
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch {}
    }

    // 3. Find JSON object { ... } or array [ ... ]
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch && jsonMatch[0]) {
        try {
            return JSON.parse(jsonMatch[0].trim());
        } catch {}
    }

    return null;
};

const formatFeaturesList = (features) => {
    if (!features) return "";
    if (Array.isArray(features)) {
        return features
            .filter((f) => typeof f === "string" && f.trim().length > 0)
            .slice(0, 20)
            .map((f) => `- ${f.trim().slice(0, 200)}`)
            .join("\n");
    }
    if (typeof features === "string") {
        return features.trim().slice(0, 1000);
    }
    return "";
};

// ==========================================
// FEATURE 1: PRODUCT DESCRIPTION GENERATOR
// ==========================================

export const generateProductDescriptionService = async ({
    name,
    category,
    brand,
    keyFeatures
}) => {
    const formattedFeatures = formatFeaturesList(keyFeatures);

    const systemPrompt =
        "You are an expert e-commerce copywriter for Bazora, an online multi-vendor marketplace. " +
        "Your task is to write compelling, clear, and professional product descriptions that inform buyers and drive sales. " +
        "Rules:\n" +
        "- Write a clear, engaging, and professional e-commerce product description.\n" +
        "- Avoid unsupported claims, fake specifications, or exaggerated guarantees.\n" +
        "- Rely only on the supplied information.\n" +
        "- Keep the description well-structured, concise, and focused on benefits to the buyer.\n" +
        "- Output only the final product description in plain text or clean paragraphs. Do not add conversational filler.";

    const userPrompt =
        `Generate a professional e-commerce product description based on these details:\n` +
        `- Product Name: ${name}\n` +
        (category ? `- Category: ${category}\n` : "") +
        (brand ? `- Brand: ${brand}\n` : "") +
        (formattedFeatures ? `- Key Features:\n${formattedFeatures}\n` : "");

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const description = await callAIProvider({
        messages,
        temperature: 0.7,
        maxTokens: 800
    });

    return description;
};

// ==========================================
// FEATURE 2: KEY SELLING POINTS GENERATOR
// ==========================================

export const generateSellingPointsService = async ({
    name,
    category,
    brand,
    description,
    features
}) => {
    const formattedFeatures = formatFeaturesList(features);

    const systemPrompt =
        "You are an e-commerce marketing specialist for Bazora. " +
        "Your task is to extract or generate 3 to 6 concise, high-impact key selling points for a product. " +
        "Rules:\n" +
        "- Use only the supplied product information.\n" +
        "- Generate concise points (1 short sentence or phrase per point).\n" +
        "- Avoid inventing specifications or making misleading/unsupported claims.\n" +
        "- Output must be a valid JSON object with a single key 'sellingPoints' containing an array of strings.";

    const userPrompt =
        `Generate 3 to 6 concise key selling points for this product:\n` +
        `- Product Name: ${name}\n` +
        (category ? `- Category: ${category}\n` : "") +
        (brand ? `- Brand: ${brand}\n` : "") +
        (description ? `- Description: ${description.slice(0, 1000)}\n` : "") +
        (formattedFeatures ? `- Features:\n${formattedFeatures}\n` : "") +
        `\nRespond ONLY with a JSON object in this format:\n` +
        `{"sellingPoints": ["Point 1", "Point 2", "Point 3"]}`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const rawOutput = await callAIProvider({
        messages,
        temperature: 0.6,
        maxTokens: 500,
        jsonMode: true
    });

    let sellingPoints = [];
    const parsed = parseJSONSafely(rawOutput);

    if (parsed) {
        if (Array.isArray(parsed)) {
            sellingPoints = parsed;
        } else if (Array.isArray(parsed.sellingPoints)) {
            sellingPoints = parsed.sellingPoints;
        } else if (Array.isArray(parsed.points)) {
            sellingPoints = parsed.points;
        }
    }

    // Fallback if structured parsing returned empty
    if (!sellingPoints || sellingPoints.length === 0) {
        const lines = rawOutput.split("\n");
        for (const line of lines) {
            const cleaned = line.replace(/^[\s*\-•\d.]+\s*/, "").trim();
            if (
                cleaned.length > 5 &&
                !cleaned.startsWith("{") &&
                !cleaned.startsWith("}") &&
                !cleaned.startsWith("[") &&
                !cleaned.startsWith("]")
            ) {
                sellingPoints.push(cleaned);
            }
        }
    }

    sellingPoints = sellingPoints
        .filter((p) => typeof p === "string" && p.trim().length > 0)
        .map((p) => p.trim())
        .slice(0, 8);

    if (sellingPoints.length === 0) {
        sellingPoints = [`High quality ${name}`];
    }

    return sellingPoints;
};

// ==========================================
// FEATURE 3: REVIEW SUMMARIZATION
// ==========================================

export const generateReviewSummaryService = async (productId) => {
    if (!isValidObjectId(productId)) {
        const error = new Error("Invalid product ID");
        error.statusCode = 400;
        throw error;
    }

    const product = await Product.findById(productId).select("name");
    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    // Retrieve approved customer reviews (anonymized: only rating, title, and comment)
    const reviews = await Review.find({
        productId,
        isApproved: true
    })
        .select("rating title comment -_id")
        .sort({ createdAt: -1 })
        .limit(50);

    if (reviews.length === 0) {
        return {
            reviewCount: 0,
            averageRating: null,
            summary: "There are not enough reviews to generate a summary.",
            positivePoints: [],
            negativePoints: []
        };
    }

    const avgRating = Number(
        (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    );

    const apiKey =
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GROQ_API_KEY;

    // FIX 6: Deterministic factual response if no AI provider is configured
    if (!apiKey) {
        return {
            reviewCount: reviews.length,
            averageRating: avgRating,
            summary: `Based on ${reviews.length} approved review${reviews.length === 1 ? "" : "s"}, this product has an average rating of ${avgRating}/5. AI review summarization is currently unavailable.`,
            positivePoints: [],
            negativePoints: []
        };
    }

    const reviewTexts = reviews
        .map((r, i) => {
            const title = r.title ? `"${r.title}" - ` : "";
            const comment =
                r.comment && r.comment.length > 300
                    ? r.comment.slice(0, 300) + "..."
                    : r.comment || "";
            return `Review ${i + 1} (${r.rating}/5 stars): ${title}${comment}`;
        })
        .join("\n");

    const systemPrompt =
        "You are an impartial e-commerce customer review analyst for Bazora. " +
        "Your task is to summarize customer reviews objectively and concisely. " +
        "Rules:\n" +
        "- Summarize only the supplied customer reviews.\n" +
        "- Distinguish common positive highlights from common criticisms or complaints.\n" +
        "- Highlight the overall customer sentiment.\n" +
        "- Do not invent opinions or assume facts not stated in the reviews.\n" +
        "- Do not identify individual customers or make legal or medical claims.\n" +
        "- Output must be a valid JSON object matching the requested schema.";

    const userPrompt =
        `Summarize the following ${reviews.length} customer reviews for the product "${product.name}":\n\n` +
        `${reviewTexts}\n\n` +
        `Format your response as a valid JSON object with the following structure:\n` +
        `{\n` +
        `  "summary": "A concise paragraph summarizing overall customer sentiment and key takeaways.",\n` +
        `  "positivePoints": ["Common positive aspect 1", "Common positive aspect 2"],\n` +
        `  "negativePoints": ["Common complaint/issue 1", "Common complaint/issue 2"]\n` +
        `}`;

    let rawOutput;
    try {
        rawOutput = await callAIProvider({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.5,
            maxTokens: 800,
            jsonMode: true
        });
    } catch (aiError) {
        console.warn("AI review summarizer error, using deterministic fallback:", aiError.message);
        return {
            reviewCount: reviews.length,
            averageRating: avgRating,
            summary: `Based on ${reviews.length} approved review${reviews.length === 1 ? "" : "s"}, this product has an average rating of ${avgRating}/5. AI review summarization is currently unavailable.`,
            positivePoints: [],
            negativePoints: []
        };
    }

    let summary = "";
    let positivePoints = [];
    let negativePoints = [];

    const parsed = parseJSONSafely(rawOutput);

    if (parsed && typeof parsed === "object") {
        if (typeof parsed.summary === "string") {
            summary = parsed.summary.trim();
        }
        if (Array.isArray(parsed.positivePoints)) {
            positivePoints = parsed.positivePoints
                .filter((p) => typeof p === "string" && p.trim().length > 0)
                .map((p) => p.trim());
        }
        if (Array.isArray(parsed.negativePoints)) {
            negativePoints = parsed.negativePoints
                .filter((p) => typeof p === "string" && p.trim().length > 0)
                .map((p) => p.trim());
        }
    }

    if (!summary) {
        // Fallback: clean raw text of code fences
        summary = rawOutput.replace(/```(?:json)?[\s\S]*?```/g, "").trim();
        if (!summary) {
            summary = `Based on ${reviews.length} customer reviews, customer feedback is generally balanced across key product aspects.`;
        }
    }

    return {
        reviewCount: reviews.length,
        averageRating: avgRating,
        summary,
        positivePoints,
        negativePoints
    };
};

// ==========================================
// FEATURE 4: PRODUCT SUMMARY GENERATOR
// ==========================================

export const generateProductSummaryService = async (productId) => {
    if (!isValidObjectId(productId)) {
        const error = new Error("Invalid product ID");
        error.statusCode = 400;
        throw error;
    }

    const product = await Product.findById(productId)
        .populate("categoryId", "name")
        .populate("storeId", "storeName");

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    // Retrieve approved customer reviews (anonymized: rating, title, comment)
    const reviews = await Review.find({
        productId,
        isApproved: true
    })
        .select("rating title comment -_id")
        .sort({ createdAt: -1 })
        .limit(20);

    const apiKey =
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GROQ_API_KEY;

    if (apiKey) {
        try {
            const reviewTexts = reviews.length > 0
                ? reviews
                    .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars): ${r.title ? `"${r.title}" ` : ""}${r.comment.slice(0, 200)}`)
                    .join("\n")
                : "No customer reviews submitted yet.";

            const systemPrompt =
                "You are an impartial e-commerce product analyst for Bazora marketplace. " +
                "Generate a concise, objective AI summary for a real product based strictly on its description, category, and real customer reviews.\n" +
                "Rules:\n" +
                "- Do not fabricate specifications, prices, or fake reviews.\n" +
                "- Distinguish what the product is good for, its key highlights, and any potential buyer concerns.\n" +
                "- If there are no reviews or insufficient data for concerns, explicitly state that.\n" +
                "- Output must be a valid JSON object matching the requested schema.";

            const userPrompt =
                `Analyze this real product from the Bazora catalog:\n` +
                `- Product Name: ${product.name}\n` +
                `- Category: ${product.categoryId?.name || "General"}\n` +
                (product.brand ? `- Brand: ${product.brand}\n` : "") +
                `- Base Price: ${product.basePrice}\n` +
                `- Description: ${product.description ? product.description.slice(0, 1500) : "No description provided."}\n\n` +
                `Customer Reviews (${reviews.length} reviews):\n${reviewTexts}\n\n` +
                `Format your response as a valid JSON object:\n` +
                `{\n` +
                `  "summary": "Concise 1-2 sentence overview for potential buyers.",\n` +
                `  "goodFor": ["Ideal use case 1", "Ideal use case 2"],\n` +
                `  "highlights": ["Key highlight or benefit 1", "Key highlight 2"],\n` +
                `  "concerns": ["Potential customer concern or caveat 1"]\n` +
                `}`;

            const rawOutput = await callAIProvider({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.4,
                maxTokens: 600,
                jsonMode: true
            });

            const parsed = parseJSONSafely(rawOutput);
            if (parsed && typeof parsed === "object") {
                const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
                const goodFor = Array.isArray(parsed.goodFor)
                    ? parsed.goodFor.map((g) => String(g).trim()).filter(Boolean).slice(0, 5)
                    : [];
                const highlights = Array.isArray(parsed.highlights)
                    ? parsed.highlights.map((h) => String(h).trim()).filter(Boolean).slice(0, 5)
                    : [];
                const concerns = Array.isArray(parsed.concerns)
                    ? parsed.concerns.map((c) => String(c).trim()).filter(Boolean).slice(0, 4)
                    : [];

                if (summary || goodFor.length > 0 || highlights.length > 0) {
                    return {
                        productId,
                        productName: product.name,
                        summary: summary || `Factual AI overview of ${product.name}.`,
                        goodFor: goodFor.length > 0 ? goodFor : ["Everyday use", product.categoryId?.name || "General"],
                        highlights: highlights.length > 0 ? highlights : [`Offered by ${product.storeId?.storeName || "Bazora Vendor"}`],
                        concerns: concerns.length > 0 ? concerns : (reviews.length === 0 ? ["Not enough customer reviews to identify common concerns."] : [])
                    };
                }
            }
        } catch (aiErr) {
            console.warn("AI Product Summary provider warning, falling back to catalog data:", aiErr.message);
        }
    }

    // Factual catalog fallback
    const goodFor = [
        product.categoryId?.name ? `${product.categoryId.name} requirements` : "Everyday use",
        product.brand ? `${product.brand} product line` : "General marketplace buyers"
    ];

    const highlights = [
        `Verified merchant store: ${product.storeId?.storeName || "Bazora Vendor"}`,
        `Catalog category: ${product.categoryId?.name || "General"}`
    ];
    if (product.discountPercentage > 0) {
        highlights.push(`Active promotional discount: ${product.discountPercentage}% off`);
    }

    const concerns = reviews.length === 0
        ? ["Not enough customer reviews yet to identify potential concerns."]
        : [`Based on ${reviews.length} customer review(s). Check review section for verified buyer feedback.`];

    return {
        productId,
        productName: product.name,
        summary: product.description
            ? (product.description.length > 180 ? product.description.slice(0, 180) + "..." : product.description)
            : `${product.name} is available in ${product.categoryId?.name || "the Bazora catalog"}.`,
        goodFor,
        highlights,
        concerns
    };
};

// ==========================================
// FEATURE 5: BAZORA AI SHOPPING ASSISTANT
// ==========================================

/**
 * Sanitizes and validates conversation history for the AI assistant.
 * - Restricts to max 6 most recent messages.
 * - Accepts only valid 'user' and 'assistant' roles.
 * - Truncates each entry to max 500 characters to prevent prompt bloat.
 * - Discards malformed entries.
 */
const sanitizeConversationHistory = (history) => {
    if (!Array.isArray(history)) return [];

    const validEntries = [];
    for (const entry of history) {
        if (!entry || typeof entry !== "object") continue;
        const role = typeof entry.role === "string" ? entry.role.trim().toLowerCase() : "";
        if (role !== "user" && role !== "assistant") continue;

        let content = "";
        if (typeof entry.content === "string") {
            content = entry.content.trim();
        } else if (typeof entry.text === "string") {
            content = entry.text.trim();
        }
        if (!content) continue;

        const truncatedContent = content.length > 500 ? content.slice(0, 500) : content;
        validEntries.push({
            role,
            content: truncatedContent
        });
    }

    return validEntries.slice(-6);
};

/**
 * Validates and sanitizes AI or regex extracted shopping intent filters.
 * Prevents invalid MongoDB queries or unbounded values.
 */
const validateAndSanitizeIntent = (intent) => {
    const sanitized = {
        keywords: [],
        categoryName: "",
        brand: "",
        minPrice: null,
        maxPrice: null,
        minRating: null,
        sortBy: "relevance"
    };

    if (!intent || typeof intent !== "object") return sanitized;

    // Keywords validation
    if (Array.isArray(intent.keywords)) {
        sanitized.keywords = intent.keywords
            .filter((k) => typeof k === "string")
            .map((k) => k.trim())
            .filter(Boolean)
            .slice(0, 10);
    }

    // Category name validation
    if (typeof intent.categoryName === "string" && intent.categoryName.trim()) {
        sanitized.categoryName = intent.categoryName.trim().slice(0, 100);
    }

    // Brand validation
    if (typeof intent.brand === "string" && intent.brand.trim()) {
        sanitized.brand = intent.brand.trim().slice(0, 100);
    }

    // minPrice: finite, >= 0
    if (typeof intent.minPrice === "number" && Number.isFinite(intent.minPrice) && intent.minPrice >= 0) {
        sanitized.minPrice = Math.round(intent.minPrice * 100) / 100;
    }

    // maxPrice: finite, >= 0
    if (typeof intent.maxPrice === "number" && Number.isFinite(intent.maxPrice) && intent.maxPrice >= 0) {
        sanitized.maxPrice = Math.round(intent.maxPrice * 100) / 100;
    }

    // Handle minPrice > maxPrice safely
    if (sanitized.minPrice !== null && sanitized.maxPrice !== null && sanitized.minPrice > sanitized.maxPrice) {
        const temp = sanitized.minPrice;
        sanitized.minPrice = sanitized.maxPrice;
        sanitized.maxPrice = temp;
    }

    // minRating: finite, clamp between 0 and 5
    if (typeof intent.minRating === "number" && Number.isFinite(intent.minRating)) {
        sanitized.minRating = Math.max(0, Math.min(5, Math.round(intent.minRating * 10) / 10));
    }

    // sortBy: allow only known values
    const validSortMap = new Map([
        ["relevance", "relevance"],
        ["price_asc", "price_asc"],
        ["priceasc", "price_asc"],
        ["price_desc", "price_desc"],
        ["pricedesc", "price_desc"],
        ["rating", "rating"],
        ["highest_rated", "rating"],
        ["newest", "newest"]
    ]);
    if (typeof intent.sortBy === "string") {
        const normalized = intent.sortBy.trim().toLowerCase().replace(/[\s-]/g, "_");
        sanitized.sortBy = validSortMap.get(normalized) || "relevance";
    }

    return sanitized;
};

// Rule-based regex parser to ensure robust baseline intent
const extractRegexIntent = (text) => {
    const lower = text.toLowerCase();
    let maxPrice = null;
    let minPrice = null;

    // Price extraction
    const underMatch = lower.match(/(?:under|below|less than|within|budget of|<)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
    if (underMatch) maxPrice = Number(underMatch[1]);

    const aboveMatch = lower.match(/(?:above|over|more than|at least|>)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
    if (aboveMatch) minPrice = Number(aboveMatch[1]);

    const betweenMatch = lower.match(/(?:between)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:and|to|-)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
    if (betweenMatch) {
        minPrice = Number(betweenMatch[1]);
        maxPrice = Number(betweenMatch[2]);
    }

    // Standalone price with currency symbol if maxPrice not found
    if (!maxPrice) {
        const symMatch = lower.match(/(?:₹|\$|rs\.?)\s*(\d+(?:\.\d+)?)/i);
        if (symMatch) maxPrice = Number(symMatch[1]);
    }

    // Rating
    let minRating = null;
    const explicitRatingMatch = lower.match(/(?:rated\s*)?(\d(?:\.\d)?)\s*(?:star|\+|\/5|and above|or more)/i);
    if (explicitRatingMatch) {
        minRating = Number(explicitRatingMatch[1]);
    } else if (/highly rated|top rated|best rated|good rating|4\s*star|5\s*star/i.test(lower)) {
        minRating = 4;
    }

    // Sort
    let sortBy = "relevance";
    if (/best rating|highest rated|top rated/i.test(lower)) sortBy = "rating";
    else if (/cheap|lowest price|budget/i.test(lower)) sortBy = "price_asc";
    else if (/expensive|premium|luxury/i.test(lower)) sortBy = "price_desc";
    else if (/new|latest/i.test(lower)) sortBy = "newest";

    // Stop words stripping for keywords
    const stopWords = new Set([
        "i", "need", "want", "show", "me", "find", "looking", "for", "a", "an", "the",
        "under", "below", "above", "with", "good", "best", "give", "please", "can", "you",
        "products", "product", "items", "item", "in", "at", "to", "of", "and", "or", "is",
        "are", "my", "recommend", "which", "what", "one", "ones", "these", "those", "them"
    ]);

    const cleanWords = lower
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w) && isNaN(Number(w)));

    return {
        keywords: cleanWords.slice(0, 6),
        categoryName: "",
        brand: "",
        minPrice,
        maxPrice,
        minRating,
        sortBy
    };
};

export const chatAssistantService = async ({ message, conversationHistory = [] }) => {
    // 1. Input sanitization & boundary validation
    if (!message || typeof message !== "string" || message.trim().length === 0) {
        const error = new Error("Message is required");
        error.statusCode = 400;
        throw error;
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 1000) {
        const error = new Error("Message cannot exceed 1000 characters");
        error.statusCode = 400;
        throw error;
    }

    // FIX 1: Sanitize and validate conversation history
    const sanitizedHistory = sanitizeConversationHistory(conversationHistory);

    const apiKey =
        process.env.AI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GROQ_API_KEY;

    // 2. Intent extraction (rule-based baseline + AI extraction when available)
    let regexIntent = extractRegexIntent(trimmedMessage);

    // If current query has no keywords and recent conversation history exists,
    // inspect previous user turns in conversation history to inherit search context
    if (regexIntent.keywords.length === 0 && sanitizedHistory.length > 0) {
        const prevUserMessages = sanitizedHistory.filter((m) => m.role === "user");
        for (let i = prevUserMessages.length - 1; i >= 0; i--) {
            const prevIntent = extractRegexIntent(prevUserMessages[i].content);
            if (prevIntent.keywords.length > 0) {
                regexIntent.keywords = prevIntent.keywords;
                if (!regexIntent.categoryName && prevIntent.categoryName) {
                    regexIntent.categoryName = prevIntent.categoryName;
                }
                if (!regexIntent.brand && prevIntent.brand) {
                    regexIntent.brand = prevIntent.brand;
                }
                if (regexIntent.maxPrice === null && prevIntent.maxPrice !== null) {
                    regexIntent.maxPrice = prevIntent.maxPrice;
                }
                if (regexIntent.minPrice === null && prevIntent.minPrice !== null) {
                    regexIntent.minPrice = prevIntent.minPrice;
                }
                break;
            }
        }
    }

    // FIX 5: Validate baseline intent
    let extractedIntent = validateAndSanitizeIntent(regexIntent);

    // If AI provider is available, use LLM to extract nuanced intent with conversation context
    if (apiKey) {
        try {
            const intentSystemPrompt =
                "Extract e-commerce shopping intent from the customer's query. " +
                "You may refer to the recent conversation history to resolve follow-up context or references (e.g. 'which one has best rating?' referring to earlier headphones). " +
                "The current user message is the authoritative query. " +
                "Output a JSON object with keys:\n" +
                "- keywords: array of strings (product types, features, e.g. ['headphones', 'wireless'])\n" +
                "- categoryName: string (e.g. 'Electronics') or empty string\n" +
                "- brand: string or empty string\n" +
                "- maxPrice: number or null\n" +
                "- minPrice: number or null\n" +
                "- minRating: number (0-5) or null\n" +
                "- sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'";

            const intentMessages = [
                { role: "system", content: intentSystemPrompt },
                ...sanitizedHistory,
                { role: "user", content: `Customer Query: "${trimmedMessage}"` }
            ];

            const intentOutput = await callAIProvider({
                messages: intentMessages,
                temperature: 0.1,
                maxTokens: 250,
                jsonMode: true
            });

            const parsedIntent = parseJSONSafely(intentOutput);
            if (parsedIntent && typeof parsedIntent === "object") {
                const validatedAIIntent = validateAndSanitizeIntent(parsedIntent);
                extractedIntent = {
                    keywords: validatedAIIntent.keywords.length > 0 ? validatedAIIntent.keywords : extractedIntent.keywords,
                    categoryName: validatedAIIntent.categoryName || extractedIntent.categoryName,
                    brand: validatedAIIntent.brand || extractedIntent.brand,
                    minPrice: validatedAIIntent.minPrice !== null ? validatedAIIntent.minPrice : extractedIntent.minPrice,
                    maxPrice: validatedAIIntent.maxPrice !== null ? validatedAIIntent.maxPrice : extractedIntent.maxPrice,
                    minRating: validatedAIIntent.minRating !== null ? validatedAIIntent.minRating : extractedIntent.minRating,
                    sortBy: validatedAIIntent.sortBy || extractedIntent.sortBy
                };
                // Re-validate to ensure bounds and swap safety
                extractedIntent = validateAndSanitizeIntent(extractedIntent);
            }
        } catch (err) {
            console.warn("AI intent extraction skipped, using regex/history fallback:", err.message);
        }
    }

    // 3. Search real MongoDB database
    // Resolve Category if categoryName or keywords match active categories
    let matchedCategoryId = null;
    if (extractedIntent.categoryName) {
        const cat = await Category.findOne({
            name: { $regex: escapeRegex(extractedIntent.categoryName), $options: "i" },
            isActive: true
        });
        if (cat) matchedCategoryId = cat._id;
    }

    // Build base MongoDB product filter with hard constraints
    const mongoFilter = {
        status: "approved"
    };

    if (matchedCategoryId) {
        mongoFilter.categoryId = matchedCategoryId;
    }

    if (extractedIntent.brand) {
        mongoFilter.brand = {
            $regex: escapeRegex(extractedIntent.brand),
            $options: "i"
        };
    }

    if (extractedIntent.minPrice !== null || extractedIntent.maxPrice !== null) {
        mongoFilter.basePrice = {};
        if (extractedIntent.minPrice !== null) {
            mongoFilter.basePrice.$gte = extractedIntent.minPrice;
        }
        if (extractedIntent.maxPrice !== null) {
            mongoFilter.basePrice.$lte = extractedIntent.maxPrice;
        }
    }

    // Build keyword conditions
    let keywordConditions = [];
    if (extractedIntent.keywords && extractedIntent.keywords.length > 0) {
        keywordConditions = extractedIntent.keywords.map((kw) => {
            const regex = { $regex: escapeRegex(kw), $options: "i" };
            return {
                $or: [{ name: regex }, { description: regex }, { brand: regex }]
            };
        });
    }

    // Sort setup
    let sortOptions = { createdAt: -1 };
    if (extractedIntent.sortBy === "price_asc") sortOptions = { basePrice: 1 };
    if (extractedIntent.sortBy === "price_desc") sortOptions = { basePrice: -1 };

    // Initial search: strict keyword matching ($and) + all hard constraints
    const strictFilter = { ...mongoFilter };
    if (keywordConditions.length > 0) {
        strictFilter.$and = keywordConditions;
    }

    let candidateProducts = await Product.find(strictFilter)
        .populate("categoryId", "name")
        .populate("storeId", "storeName")
        .sort(sortOptions)
        .limit(15);

    // FIX 4: If 0 matches and multiple keywords, ONLY relax keyword strategy ($and -> $or).
    // NEVER remove category, brand, or price constraints!
    if (candidateProducts.length === 0 && keywordConditions.length > 1) {
        const broadFilter = { ...mongoFilter };
        broadFilter.$or = keywordConditions.flatMap((k) => k.$or);

        candidateProducts = await Product.find(broadFilter)
            .populate("categoryId", "name")
            .populate("storeId", "storeName")
            .sort(sortOptions)
            .limit(10);
    }

    // If still 0 matches, return factual response stating no products match hard constraints
    if (candidateProducts.length === 0) {
        let constraintNotes = [];
        if (extractedIntent.categoryName) constraintNotes.push(`category "${extractedIntent.categoryName}"`);
        if (extractedIntent.brand) constraintNotes.push(`brand "${extractedIntent.brand}"`);
        if (extractedIntent.minPrice !== null && extractedIntent.maxPrice !== null) {
            constraintNotes.push(`price between $${extractedIntent.minPrice} and $${extractedIntent.maxPrice}`);
        } else if (extractedIntent.maxPrice !== null) {
            constraintNotes.push(`budget under $${extractedIntent.maxPrice}`);
        } else if (extractedIntent.minPrice !== null) {
            constraintNotes.push(`price above $${extractedIntent.minPrice}`);
        }

        const criteriaText = constraintNotes.length > 0 ? ` (${constraintNotes.join(", ")})` : "";
        return {
            success: true,
            reply: `I searched our catalog for "${trimmedMessage}"${criteriaText}, but no approved products currently match all of those criteria. Try broadening your keywords or adjusting your price limits!`,
            products: [],
            queryIntent: extractedIntent
        };
    }

    // 4. Fetch real ratings & inventory for candidate products from MongoDB
    const candidateIds = candidateProducts.map((p) => p._id);

    const [reviewStats, variants] = await Promise.all([
        Review.aggregate([
            { $match: { productId: { $in: candidateIds }, isApproved: true } },
            {
                $group: {
                    _id: "$productId",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 }
                }
            }
        ]),
        ProductVariant.find({ productId: { $in: candidateIds }, isActive: true }).select("_id productId")
    ]);

    // FIX 2: Store factual ratings. If not in reviewStats, it has NO reviews (avgRating: null, count: 0)
    const ratingMap = new Map();
    reviewStats.forEach((stat) => {
        ratingMap.set(String(stat._id), {
            avgRating: Math.round(stat.avgRating * 10) / 10,
            count: stat.count
        });
    });

    const variantIds = variants.map((v) => v._id);
    const inventories = await Inventory.find({ variantId: { $in: variantIds } });

    const variantStockMap = new Map();
    inventories.forEach((inv) => {
        const available = Math.max(0, (inv.quantity || 0) - (inv.reservedQuantity || 0));
        variantStockMap.set(String(inv.variantId), available);
    });

    // FIX 7: Stock calculation matching actual data model
    const productStockMap = new Map();
    candidateProducts.forEach((p) => {
        const pIdStr = String(p._id);
        const prodVariants = variants.filter((v) => String(v.productId) === pIdStr);

        if (prodVariants.length === 0) {
            // Product has no variants in catalog and Product schema has no product-level stock
            productStockMap.set(pIdStr, {
                inStock: null,
                statusText: "Availability not specified"
            });
        } else {
            let hasInventoryTracked = false;
            let totalAvailableQty = 0;

            for (const v of prodVariants) {
                const vIdStr = String(v._id);
                if (variantStockMap.has(vIdStr)) {
                    hasInventoryTracked = true;
                    totalAvailableQty += variantStockMap.get(vIdStr);
                }
            }

            if (!hasInventoryTracked) {
                productStockMap.set(pIdStr, {
                    inStock: null,
                    statusText: "Availability not specified"
                });
            } else if (totalAvailableQty > 0) {
                productStockMap.set(pIdStr, {
                    inStock: true,
                    statusText: totalAvailableQty <= 5 ? `Low Stock (${totalAvailableQty} left)` : "In Stock"
                });
            } else {
                productStockMap.set(pIdStr, {
                    inStock: false,
                    statusText: "Out of Stock"
                });
            }
        }
    });

    // FIX 3: Filter by minRating if requested — NEVER silently ignore or relax
    let filteredCandidates = candidateProducts;
    if (extractedIntent.minRating !== null) {
        const minR = extractedIntent.minRating;
        filteredCandidates = candidateProducts.filter((p) => {
            const r = ratingMap.get(String(p._id));
            return r && r.avgRating !== null && r.avgRating >= minR;
        });

        if (filteredCandidates.length === 0) {
            return {
                success: true,
                reply: `I found products matching your query in the catalog, but none currently meet your minimum rating requirement of ${minR}★. You can try lowering the rating filter or browsing all related items.`,
                products: [],
                queryIntent: extractedIntent
            };
        }
    }

    // Sort by rating if explicitly requested
    if (extractedIntent.sortBy === "rating") {
        filteredCandidates.sort((a, b) => {
            const rA = ratingMap.get(String(a._id))?.avgRating ?? -1;
            const rB = ratingMap.get(String(b._id))?.avgRating ?? -1;
            return rB - rA;
        });
    }

    // Limit to top 8 candidates for LLM ranking
    const topCandidates = filteredCandidates.slice(0, 8);

    // 5. Reasoning, Ranking & Structured Recommendation
    let aiReply = "";
    let recommendations = [];

    if (apiKey) {
        try {
            const candidatesForLLM = topCandidates.map((p) => {
                // FIX 2: Never fake a 4.5 rating
                const r = ratingMap.get(String(p._id)) || { avgRating: null, count: 0 };
                const stock = productStockMap.get(String(p._id)) || { inStock: null, statusText: "Availability not specified" };
                const discount = p.discountPercentage || 0;
                const finalPrice = discount > 0 ? p.basePrice * (1 - discount / 100) : p.basePrice;
                const ratingDisplay = r.count > 0 && r.avgRating !== null
                    ? `${r.avgRating} / 5 (${r.count} review${r.count === 1 ? "" : "s"})`
                    : "No ratings yet (0 reviews)";

                return {
                    id: String(p._id),
                    name: p.name,
                    category: p.categoryId?.name || "General",
                    brand: p.brand || "",
                    price: finalPrice,
                    basePrice: p.basePrice,
                    rating: r.avgRating,
                    ratingDisplay,
                    reviewsCount: r.count,
                    stockStatus: stock.statusText,
                    description: p.description ? p.description.slice(0, 200) : ""
                };
            });

            const rankingSystemPrompt =
                "You are the Bazora AI Shopping Assistant for Bazora Marketplace.\n" +
                "Your goal is to recommend real products from the catalog to the customer based on their question.\n" +
                "Rules:\n" +
                "- The current user message is the authoritative query.\n" +
                "- Use recent conversation history only to understand conversational context or follow-up references.\n" +
                "- Do NOT trust or use old product information from past messages. ONLY recommend product IDs from the provided Candidate Products list.\n" +
                "- Select between 1 and 5 best matching products from the Candidate Products list.\n" +
                "- NEVER invent, hallucinate, or alter product IDs, prices, stock, or ratings.\n" +
                "- If a product has 'No ratings yet', do NOT claim it is highly rated.\n" +
                "- For each chosen product, provide a concise, factual reason (1-2 sentences) explaining why it matches the customer's request (e.g. fits budget, ratings, category, features).\n" +
                "- Output valid JSON with this exact structure:\n" +
                "{\n" +
                '  "reply": "Friendly conversational answer introducing the recommendations and answering any question.",\n' +
                '  "recommendations": [\n' +
                '    { "productId": "exact_id_from_candidates", "reason": "Factual reason why recommended" }\n' +
                "  ]\n" +
                "}";

            const rankingUserPrompt =
                `Current Customer Query: "${trimmedMessage}"\n\n` +
                `Candidate Products from Bazora Catalog:\n${JSON.stringify(candidatesForLLM, null, 2)}\n\n` +
                `Provide your structured response JSON:`;

            const rankingMessages = [
                { role: "system", content: rankingSystemPrompt },
                ...sanitizedHistory,
                { role: "user", content: rankingUserPrompt }
            ];

            const rankingOutput = await callAIProvider({
                messages: rankingMessages,
                temperature: 0.4,
                maxTokens: 800,
                jsonMode: true
            });

            const parsedRanking = parseJSONSafely(rankingOutput);
            if (parsedRanking && typeof parsedRanking === "object") {
                if (typeof parsedRanking.reply === "string") {
                    aiReply = parsedRanking.reply.trim();
                }
                if (Array.isArray(parsedRanking.recommendations)) {
                    recommendations = parsedRanking.recommendations;
                }
            }
        } catch (rankErr) {
            console.warn("AI ranking provider error, falling back to direct catalog presentation:", rankErr.message);
        }
    }

    // 6. Security verification & Data Assembly (FIX 8: Grounded in MongoDB data)
    // Validate that every recommended productId actually exists in our real candidate list
    const validCandidateMap = new Map(topCandidates.map((p) => [String(p._id), p]));
    const finalProducts = [];
    const usedProductIds = new Set();

    // Process LLM recommendations if valid
    for (const rec of recommendations) {
        const idStr = String(rec?.productId || "").trim();
        if (validCandidateMap.has(idStr) && !usedProductIds.has(idStr)) {
            usedProductIds.add(idStr);
            const p = validCandidateMap.get(idStr);
            const r = ratingMap.get(idStr) || { avgRating: null, count: 0 };
            const stock = productStockMap.get(idStr) || { inStock: null, statusText: "Availability not specified" };
            const discount = p.discountPercentage || 0;
            const finalPrice = discount > 0 ? p.basePrice * (1 - discount / 100) : p.basePrice;

            finalProducts.push({
                productId: p._id,
                name: p.name,
                slug: p.slug,
                price: finalPrice,
                basePrice: p.basePrice,
                discountPercentage: discount,
                rating: r.avgRating,
                reviewCount: r.count,
                image: p.images?.[0] || null,
                category: p.categoryId?.name || "General",
                brand: p.brand || null,
                storeName: p.storeId?.storeName || "Bazora Vendor",
                inStock: stock.inStock,
                stockStatus: stock.statusText,
                reason: typeof rec.reason === "string" && rec.reason.trim()
                    ? rec.reason.trim()
                    : `Recommended from catalog based on your shopping criteria.`
            });
        }
    }

    // If LLM returned fewer than 1 valid product or was unconfigured, backfill from topCandidates
    if (finalProducts.length === 0) {
        topCandidates.slice(0, 4).forEach((p) => {
            const idStr = String(p._id);
            const r = ratingMap.get(idStr) || { avgRating: null, count: 0 };
            const stock = productStockMap.get(idStr) || { inStock: null, statusText: "Availability not specified" };
            const discount = p.discountPercentage || 0;
            const finalPrice = discount > 0 ? p.basePrice * (1 - discount / 100) : p.basePrice;

            let reason = `Matches your request in ${p.categoryId?.name || "our catalog"}`;
            if (extractedIntent.maxPrice !== null) {
                reason += ` within your $${extractedIntent.maxPrice} budget`;
            }
            if (r.avgRating !== null && r.avgRating >= 4) {
                reason += ` with strong ${r.avgRating}★ customer feedback`;
            }
            reason += ".";

            finalProducts.push({
                productId: p._id,
                name: p.name,
                slug: p.slug,
                price: finalPrice,
                basePrice: p.basePrice,
                discountPercentage: discount,
                rating: r.avgRating,
                reviewCount: r.count,
                image: p.images?.[0] || null,
                category: p.categoryId?.name || "General",
                brand: p.brand || null,
                storeName: p.storeId?.storeName || "Bazora Vendor",
                inStock: stock.inStock,
                stockStatus: stock.statusText,
                reason
            });
        });
    }

    if (!aiReply) {
        aiReply = `I found ${finalProducts.length} real product${finalProducts.length > 1 ? "s" : ""} in the Bazora catalog matching your shopping request:`;
    }

    return {
        success: true,
        reply: aiReply,
        products: finalProducts,
        queryIntent: extractedIntent
    };
};
