const express = require("express");
const {
    getAdminOverview,
    getAdminUsers,
    updateUserStatus
} = require("../controllers/adminController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Strict security: Every admin route requires authentication and the 'admin' role
router.use(protect, authorize("admin"));

// Admin metrics & operational summary
router.get("/overview", getAdminOverview);

// User management endpoints
router.get("/users", getAdminUsers);
router.put("/users/:id/status", updateUserStatus);

module.exports = router;
