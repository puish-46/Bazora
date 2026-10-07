import { useState, useEffect, useRef } from "react";
import { api, formatApiError } from "../services/api.js";
import { useNavigation } from "../context/NavigationContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const SUGGESTED_PROMPTS = [
  "I need wireless headphones under 3000",
  "Show me good gaming products under 5000",
  "I need a gift for my brother",
  "Which smartwatch is best for fitness?",
  "Show me highly rated headphones",
  "I want a laptop accessory for college",
];

const formatPrice = (price) => {
  const num = Number(price || 0);
  return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getStockClass = (inStock, stockStatus) => {
  if (inStock === false) return "out-of-stock";
  if (inStock === true) {
    return typeof stockStatus === "string" && stockStatus.toLowerCase().includes("low")
      ? "low-stock"
      : "in-stock";
  }
  return "unknown-stock";
};

export default function AiAssistant() {
  const { navigate } = useNavigation();
  const { user, isAuthenticated } = useAuth();

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your Bazora AI Shopping Assistant. I search our real multi-vendor catalog in real-time to find products that match your budget, specifications, and customer ratings. What are you looking for today?",
      products: [],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query) return;

    if (query.length > 1000) {
      setError("Please keep your request under 1000 characters.");
      return;
    }

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setError(null);
    setInputMessage("");

    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Build conversation history for context (last 4 user/assistant turns)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }));

      const res = await api.post("/ai/assistant", {
        message: query,
        history,
      });

      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage = {
        id: assistantMessageId,
        sender: "assistant",
        text: res.reply || "Here are matching recommendations from our catalog:",
        products: Array.isArray(res.products) ? res.products : [],
        queryIntent: res.queryIntent || null,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("AI Assistant request error:", err);
      const errorMsg = formatApiError(err, "Failed to connect to the Bazora AI service. Please try again.");
      setError(errorMsg);

      const errorMessageObj = {
        id: `assistant-err-${Date.now()}`,
        sender: "assistant",
        isError: true,
        text: `I encountered an issue retrieving recommendations: ${errorMsg}`,
        products: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessageObj]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const handleChipClick = (prompt) => {
    handleSendMessage(prompt);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "assistant",
        text: "Conversation cleared. How can I assist you with your shopping today?",
        products: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setError(null);
  };

  return (
    <div className="ai-assistant-page">
      {/* Visual Graph Backdrop */}
      <div className="ai-page-graph-backdrop" aria-hidden="true">
        <svg className="ai-graph-svg" viewBox="0 0 1000 300" fill="none">
          <path
            d="M80,80 L240,140 L450,70 L650,170 L850,90 L950,160"
            stroke="#0f172a"
            strokeOpacity="0.04"
            strokeWidth="1"
          />
          <path
            d="M240,140 L360,230 L650,170 L750,250"
            stroke="#6366f1"
            strokeOpacity="0.05"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <circle cx="80" cy="80" r="3.5" fill="#6366f1" fillOpacity="0.3" />
          <circle cx="240" cy="140" r="4" fill="#0f172a" fillOpacity="0.15" />
          <circle cx="450" cy="70" r="3" fill="#6366f1" fillOpacity="0.4" />
          <circle cx="650" cy="170" r="4.5" fill="#0f172a" fillOpacity="0.18" />
          <circle cx="850" cy="90" r="3" fill="#6366f1" fillOpacity="0.3" />
          <circle cx="360" cy="230" r="3" fill="#6366f1" fillOpacity="0.25" />
          <text x="88" y="75" fill="#94a3b8" fontSize="9" fontFamily="monospace">ai:intent-engine</text>
          <text x="458" y="65" fill="#94a3b8" fontSize="9" fontFamily="monospace">catalog:synced</text>
          <text x="858" y="85" fill="#94a3b8" fontSize="9" fontFamily="monospace">rank:verified</text>
        </svg>
      </div>

      <div className="ai-assistant-container">
        {/* Header Section */}
        <header className="ai-assistant-header">
          <div className="ai-header-meta">
            <div className="ai-pill-badge">
              <span className="graph-node-pip"></span>
              <span className="ai-pill-text">// BAZORA INTELLIGENCE // SHOPPING ASSISTANT</span>
            </div>
            {messages.length > 1 && (
              <button
                type="button"
                className="btn-clear-chat"
                onClick={handleClearChat}
                title="Clear current conversation"
              >
                Clear History
              </button>
            )}
          </div>

          <h1 className="ai-page-title">
            Intelligent Product Discovery
          </h1>
          <p className="ai-page-subtitle">
            Ask natural-language shopping requests to search, filter, and compare real items from the Bazora catalog. Real products, real inventory, zero hallucinated data.
          </p>

          {/* Suggested Prompts Bar */}
          <div className="ai-suggested-prompts-section">
            <span className="ai-suggested-label">Try asking:</span>
            <div className="ai-prompt-chips-wrap">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-prompt-chip"
                  onClick={() => handleChipClick(prompt)}
                  disabled={loading}
                >
                  <span className="chip-sparkle">✨</span>
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Chat Timeline Card */}
        <div className="ai-chat-window">
          <div className="ai-messages-scroll" role="log" aria-live="polite">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`ai-message-row ${msg.sender === "user" ? "user-row" : "assistant-row"}`}
              >
                {msg.sender === "assistant" && (
                  <div className="ai-avatar-assistant" title="Bazora AI">
                    <span className="assistant-avatar-icon">✨</span>
                    <span className="graph-node-pip" title="Verified Assistant"></span>
                  </div>
                )}

                <div className={`ai-message-bubble ${msg.sender === "user" ? "bubble-user" : "bubble-assistant"} ${msg.isError ? "bubble-error" : ""}`}>
                  <div className="ai-bubble-header">
                    <span className="ai-sender-name">
                      {msg.sender === "user" ? (user?.name || "You") : "Bazora AI Assistant"}
                    </span>
                    <span className="ai-timestamp">{msg.timestamp}</span>
                  </div>

                  <p className="ai-message-text">{msg.text}</p>

                  {/* Render Structured Real Product Recommendations */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="ai-recommendations-section">
                      <div className="ai-rec-section-header">
                        <span className="rec-badge-count">{msg.products.length} Products Found</span>
                        <span className="rec-catalog-verified">✓ Verified Catalog Records</span>
                      </div>

                      <div className="ai-products-grid">
                        {msg.products.map((item) => {
                          const originalPrice = Number(item.basePrice || item.price || 0);
                          const discount = item.discountPercentage || 0;
                          const finalPrice = Number(item.price || originalPrice);

                          return (
                            <div
                              key={item.productId}
                              className="ai-product-card"
                              onClick={() => navigate(`/products/${item.productId}`)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  navigate(`/products/${item.productId}`);
                                }
                              }}
                            >
                              <div className="ai-product-img-wrap">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="ai-product-img"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="ai-product-placeholder-img">
                                    <span>🛍️</span>
                                  </div>
                                )}

                                {discount > 0 && (
                                  <span className="ai-card-discount-tag">-{discount}%</span>
                                )}

                                {item.stockStatus && (
                                  <span
                                    className={`ai-card-stock-pill ${getStockClass(
                                      item.inStock,
                                      item.stockStatus
                                    )}`}
                                  >
                                    {item.stockStatus}
                                  </span>
                                )}
                              </div>

                              <div className="ai-product-card-body">
                                <div className="ai-card-meta-row">
                                  {item.category && (
                                    <span className="ai-card-category-pill">{item.category}</span>
                                  )}
                                  {item.brand && (
                                    <span className="ai-card-brand-tag">{item.brand}</span>
                                  )}
                                </div>

                                <h3 className="ai-card-product-title" title={item.name}>
                                  {item.name}
                                </h3>

                                {typeof item.rating === "number" &&
                                item.rating !== null &&
                                (item.reviewCount || 0) > 0 ? (
                                  <div className="ai-card-rating-row">
                                    <span className="ai-card-rating-star">★</span>
                                    <span className="ai-card-rating-val">{item.rating}</span>
                                    <span className="ai-card-review-count">
                                      ({item.reviewCount} review{item.reviewCount === 1 ? "" : "s"})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="ai-card-rating-row ai-card-unrated-row">
                                    <span className="ai-card-no-rating">No reviews yet</span>
                                  </div>
                                )}

                                {/* AI Recommendation Reason Callout */}
                                {item.reason && (
                                  <div className="ai-card-reason-callout">
                                    <span className="reason-sparkle">💡</span>
                                    <p className="reason-text">{item.reason}</p>
                                  </div>
                                )}

                                <div className="ai-card-footer-row">
                                  <div className="ai-card-price-stack">
                                    <span className="ai-card-price">
                                      {formatPrice(finalPrice)}
                                    </span>
                                    {discount > 0 && (
                                      <span className="ai-card-orig-price">
                                        {formatPrice(originalPrice)}
                                      </span>
                                    )}
                                  </div>

                                  <span className="ai-btn-view-details">
                                    Details →
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {msg.sender === "user" && (
                  <div className="ai-avatar-user" title={user?.name || "User"}>
                    <span>👤</span>
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="ai-message-row assistant-row">
                <div className="ai-avatar-assistant">
                  <span className="assistant-avatar-icon">✨</span>
                  <span className="graph-node-pip active-pulse"></span>
                </div>
                <div className="ai-message-bubble bubble-assistant bubble-loading">
                  <div className="ai-bubble-header">
                    <span className="ai-sender-name">Bazora AI Assistant</span>
                    <span className="ai-timestamp">Searching...</span>
                  </div>
                  <div className="ai-loading-content">
                    <div className="ai-typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="ai-loading-label">
                      Filtering catalog and ranking recommendations...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Error Banner */}
          {error && (
            <div className="ai-chat-error-banner" role="alert">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
              <button
                type="button"
                className="btn-dismiss-error"
                onClick={() => setError(null)}
              >
                ✕
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <form className="ai-chat-input-form" onSubmit={handleSubmit}>
            <div className="ai-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="ai-chat-input"
                placeholder="Ask Bazora AI (e.g. 'Show me wireless headphones under 3000' or 'Best gaming mouse')..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={loading}
                maxLength={1000}
                aria-label="Shopping request"
              />
              <span className="ai-char-counter">
                {inputMessage.length}/1000
              </span>
            </div>

            <button
              type="submit"
              className="ai-send-btn"
              disabled={loading || !inputMessage.trim()}
              title="Send request"
            >
              {loading ? (
                <span className="ai-btn-spinner"></span>
              ) : (
                <>
                  <span className="send-btn-icon">✨</span>
                  <span className="send-btn-label">Ask AI</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Transparency / Real Data Footer Note */}
        <div className="ai-transparency-note">
          <span className="graph-node-pip"></span>
          <span>
            Bazora AI synthesizes live product catalog entries, customer ratings, and verified merchant stock. Products are directly linked to real database documents.
          </span>
        </div>
      </div>
    </div>
  );
}
