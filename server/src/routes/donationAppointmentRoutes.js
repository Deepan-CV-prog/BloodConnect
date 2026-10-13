const express = require("express");
const {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    updateAppointmentStatus
} = require("../controllers/donationAppointmentController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Donor endpoints
router.post(
    "/",
    protect,
    authorize("donor"),
    createAppointment
);

router.get(
    "/my-appointments",
    protect,
    authorize("donor"),
    getMyAppointments
);

// Staff endpoints
router.get(
    "/",
    protect,
    authorize("staff", "admin"),
    getAllAppointments
);

router.put(
    "/:id/status",
    protect,
    authorize("staff", "admin"),
    updateAppointmentStatus
);

module.exports = router;
