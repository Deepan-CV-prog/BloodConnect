const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const donorRoutes = require("./routes/donorRoutes");
const donationRoutes = require("./routes/donationRoutes");
const bloodUnitRoutes = require("./routes/bloodUnitRoutes");
const traceabilityRoutes = require("./routes/traceabilityRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const bloodRequestRoutes = require("./routes/bloodRequestRoutes");
const allocationRoutes = require("./routes/allocationRoutes");
const issuanceRoutes = require("./routes/issuanceRoutes");
const donationAppointmentRoutes = require("./routes/donationAppointmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
require("dotenv").config();

// Attempt to configure DNS servers for environments with SRV resolution limitations
try {
    const dns = require("node:dns");
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (dnsErr) {
    console.warn("Notice: Custom DNS servers could not be set, falling back to system DNS:", dnsErr.message);
}

const app = express();
const server = http.createServer(app);

// Configure dynamic CORS origin supporting CLIENT_URL from environment
const clientUrls = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((url) => url.trim().replace(/\/$/, ""))
    : [];

const defaultDevOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
];

const allowedOrigins = [...defaultDevOrigins, ...clientUrls];

const isOriginAllowed = (origin) => {
    // Allow non-browser requests (mobile, curl, health checks, server-to-server)
    if (!origin) return true;
    const normalized = origin.replace(/\/$/, "");
    if (allowedOrigins.includes("*") || allowedOrigins.includes(normalized)) {
        return true;
    }
    // If no CLIENT_URL is defined, permit during development/initial setup
    if (!process.env.CLIENT_URL) {
        return true;
    }
    return false;
};

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin)) {
                callback(null, true);
            } else {
                callback(null, false);
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});
app.set("io", io);

app.use(cors({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true
}));

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/blood-units", bloodUnitRoutes);
app.use("/api/traceability", traceabilityRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/blood-requests", bloodRequestRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/issuances", issuanceRoutes);
app.use("/api/donation-appointments", donationAppointmentRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint for cloud monitoring & Render health checks
app.get("/api/health", (req, res) => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting"
    };

    res.status(dbState === 1 ? 200 : 503).json({
        status: dbState === 1 ? "healthy" : "degraded",
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: dbStatusMap[dbState] || "unknown",
        environment: process.env.NODE_ENV || "development"
    });
});

app.get("/", (req, res) => {
    res.json({
        name: "BloodConnect API",
        message: "Blood Bank API is running",
        version: "1.0.0",
        health: "/api/health"
    });
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Connect to MongoDB
if (!process.env.MONGO_URI) {
    console.error("CRITICAL: MONGO_URI environment variable is not defined. Please configure MONGO_URI in your environment or .env file.");
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        const sanitizedMsg = (error.message || "").replace(
            /(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)@/g,
            "$1***@"
        );
        console.error("MongoDB connection failed:", sanitizedMsg);
    });

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
