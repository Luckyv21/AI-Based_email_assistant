require("dotenv").config();

const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const path = require("path");
const connectDB = require("./config/db");
const { validateEnv } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const emailRoutes = require("./routes/emailRoutes");
const testRoutes = require("./routes/testRoutes");
const gmailRoutes = require("./routes/gmailRoutes");
const eventRoutes = require("./routes/eventRoutes");
const { startAutoAiWorker, stopAutoAiWorker } = require("./services/autoAiWorker");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const frontendOrigins = Array.from(new Set([process.env.FRONTEND_ORIGIN, "http://localhost:3000", "http://localhost:5173"].filter(Boolean)));

app.use(helmet());
app.use(cors({ origin: frontendOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/test", testRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/events", eventRoutes);

app.get("/api/health", (req, res) => {
    const mongoConnected = mongoose.connection.readyState === 1;

    res.status(mongoConnected ? 200 : 503).json({
        status: mongoConnected ? "ok" : "not_ready",
        server: "ok",
        mongodb: mongoConnected ? "connected" : "disconnected"
    });
});

app.get("/", (req, res) => {
    res.send("Email Major Project Backend is running!");
});

app.get("/connect-gmail", (req, res) => {
    res.sendFile(
        path.join(__dirname, "googleConnect.html")
    );
});

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
    validateEnv();
    await connectDB();
    startAutoAiWorker();

    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
        console.log(`${signal} received. Shutting down gracefully.`);
        stopAutoAiWorker();

        server.close(async (error) => {
            if (error) {
                console.error("HTTP server shutdown failed:", error.message);
                process.exitCode = 1;
            }

            await mongoose.connection.close();
            process.exit();
        });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
};

startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
});

module.exports = app;