const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
    createHospital,
    getHospitalProfile,
    updateHospitalProfile
} = require("../controllers/hospitalController");


// Create hospital profile
router.post(
    "/",
    protect,
    authorize("hospital"),
    createHospital
);


// Get hospital profile
router.get(
    "/profile",
    protect,
    authorize("hospital"),
    getHospitalProfile
);


// Update hospital profile
router.put(
    "/profile",
    protect,
    authorize("hospital"),
    updateHospitalProfile
);


module.exports = router;