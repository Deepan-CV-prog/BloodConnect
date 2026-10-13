const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
    createTraceability,
    getBloodUnitHistory
} = require("../controllers/traceabilityController");


// Create a traceability record
router.post(
    "/",
    protect,
    authorize("staff", "admin"),
    createTraceability
);


// Get blood unit history
router.get(
    "/blood-unit/:bloodUnitId",
    protect,
    authorize("staff", "admin"),
    getBloodUnitHistory
);


module.exports = router;