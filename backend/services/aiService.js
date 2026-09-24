import mongoose from "mongoose";
import Product from "../models/Product.js";
import Review from "../models/Review.js";

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
    if (!mongoose.Types.ObjectId.isValid(productId)) {
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
            summary: "There are not enough reviews to generate a summary."
        };
    }

    const reviewTexts = reviews
        .map((r, i) => {
            const title = r.title ? `"${r.title}" - ` : "";
            const comment =
                r.comment.length > 300
                    ? r.comment.slice(0, 300) + "..."
                    : r.comment;
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

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    const rawOutput = await callAIProvider({
        messages,
        temperature: 0.5,
        maxTokens: 800,
        jsonMode: true
    });

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
        summary,
        positivePoints,
        negativePoints
    };
};
