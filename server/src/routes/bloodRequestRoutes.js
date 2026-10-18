const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
    createBloodRequest,
    getMyBloodRequests,
    getAllBloodRequests,
    getBloodRequestById,
    updateBloodRequestStatus
} = require("../controllers/bloodRequestController");


// Hospital creates a blood request
router.post(
    "/",
    protect,
    authorize("hospital"),
    createBloodRequest
);


// Hospital views its own requests
router.get(
    "/my-requests",
    protect,
    authorize("hospital"),
    getMyBloodRequests
);


// Staff/Admin views all requests
router.get(
    "/",
    protect,
    authorize("staff", "admin"),
    getAllBloodRequests
);

// Get single blood request by ID
router.get(
    "/:id",
    protect,
    authorize("hospital", "staff", "admin"),
    getBloodRequestById
);


// Staff updates request status
router.put(
    "/:id/status",
    protect,
    authorize("staff"),
    updateBloodRequestStatus
);


module.exports = router;