const express = require("express");
const {
    createDonation,
    updateDonationStatus,
    getAllDonations,
    getMyDonations
} = require("../controllers/donationController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
    "/my-donations",
    protect,
    authorize("donor"),
    getMyDonations
);

router.post(
    "/",
    protect,
    authorize("staff", "admin"),
    createDonation
);
router.put(
    "/:id/status",
    protect,
    authorize("staff", "admin"),
    updateDonationStatus
);
router.get(
    "/",
    protect,
    authorize("staff", "admin"),
    getAllDonations
);

module.exports = router;