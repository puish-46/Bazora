import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// Security-hardened CORS configuration
const allowedOriginsRaw = process.env.CLIENT_URL || process.env.FRONTEND_URL;
const allowedOrigins = allowedOriginsRaw
    ? allowedOriginsRaw
          .split(",")
          .map((url) => url.trim().replace(/\/+$/, ""))
          .filter(Boolean)
    : null;

app.use(
    cors({
        origin: allowedOrigins && allowedOrigins.length > 0
            ? (origin, callback) => {
                  // Allow requests with no origin (e.g. curl, health checks, server-to-server)
                  if (!origin) return callback(null, true);
                  const normalizedOrigin = origin.replace(/\/+$/, "");
                  if (allowedOrigins.includes(normalizedOrigin)) {
                      return callback(null, true);
                  }
                  return callback(
                      new Error(`CORS error: Origin ${origin} is not allowed by Access-Control-Allow-Origin.`)
                  );
              }
            : true,
        credentials: true
    })
);

// Body parser limits to prevent denial-of-service via massive payloads
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// API routes
app.use("/api", routes);

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "Bazora backend is running 🚀"
    });
});

// Global error handler
app.use(errorHandler);

export default app;