const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
    createIssuance,
    getIssuances,
    getIssuanceById
} = require("../controllers/issuanceController");


// Staff issues an allocated blood unit
router.post(
    "/",
    protect,
    authorize("staff"),
    createIssuance
);


// Staff/Admin views issuance records
router.get(
    "/",
    protect,
    authorize("staff", "admin"),
    getIssuances
);

// Staff/Admin views a specific issuance record
router.get(
    "/:id",
    protect,
    authorize("staff", "admin"),
    getIssuanceById
);

module.exports = router;