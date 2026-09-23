import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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