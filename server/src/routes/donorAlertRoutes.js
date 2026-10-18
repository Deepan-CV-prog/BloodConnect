const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const {
    findMatchingDonors,
    sendEmergencyAlerts,
    getRequestAlerts,
    getMyAlerts,
    respondToAlert
} = require("../controllers/donorAlertController");

// Staff & Admin endpoints
router.get(
    "/match/:requestId",
    protect,
    authorize("staff", "admin"),
    findMatchingDonors
);

router.post(
    "/send",
    protect,
    authorize("staff", "admin"),
    sendEmergencyAlerts
);

router.get(
    "/request/:requestId",
    protect,
    authorize("staff", "admin"),
    getRequestAlerts
);

// Donor endpoints
router.get(
    "/my-alerts",
    protect,
    authorize("donor"),
    getMyAlerts
);

router.put(
    "/:alertId/respond",
    protect,
    authorize("donor"),
    respondToAlert
);

module.exports = router;
