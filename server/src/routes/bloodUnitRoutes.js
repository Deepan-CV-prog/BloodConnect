const express = require("express");
const {
    createBloodUnit,
    updateTestingStatus,
    getInventory,
    getAvailableBloodUnits,
    getAllBloodUnits
} = require("../controllers/bloodUnitController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/",
    protect,
    authorize("staff"),
    createBloodUnit
);
router.put(
    "/:id/testing",
    protect,
    authorize("staff"),
    updateTestingStatus
);
router.get("/inventory", protect, authorize("staff", "admin"), getInventory);
router.get("/all", protect, authorize("staff", "admin"), getAllBloodUnits);
router.get("/", protect, authorize("staff", "admin"), getAvailableBloodUnits);

module.exports = router;