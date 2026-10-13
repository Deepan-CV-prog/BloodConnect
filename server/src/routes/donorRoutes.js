const express = require("express");
const {
    createDonor,
    getDonorProfile,
    updateDonorProfile,
    updateEligibility,
    getAllDonors,
    registerDonorByStaff
} = require("../controllers/donorController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
    "/",
    protect,
    authorize("donor"),
    createDonor
);
router.get(
    "/profile",
    protect,
    authorize("donor"),
    getDonorProfile
);
router.put(
    "/profile",
    protect,
    authorize("donor"),
    updateDonorProfile
);
router.put(
    "/:id/eligibility",
    protect,
    authorize("staff","admin"),
    updateEligibility
);
router.get(
    "/",
    protect,
    authorize("staff", "admin"),
    getAllDonors
);
router.post(
    "/register-by-staff",
    protect,
    authorize("staff", "admin"),
    registerDonorByStaff
);

module.exports = router;
