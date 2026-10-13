const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
    createAllocation,
    getAllAllocations,
    getAllocationById,
    cancelAllocation,
    getRequestAllocations
} = require("../controllers/allocationController");

// Get all allocations
router.get(
    "/",
    protect,
    authorize("staff", "admin"),
    getAllAllocations
);

// Get single allocation
router.get(
    "/:id",
    protect,
    authorize("staff", "admin"),
    getAllocationById
);

// Cancel allocation
router.put(
    "/:id/cancel",
    protect,
    authorize("staff", "admin"),
    cancelAllocation
);


// Staff/Admin allocates a blood unit
router.post(
    "/",
    protect,
    authorize("staff", "admin"),
    createAllocation
);


// Staff/Admin views allocations for a request
router.get(
    "/request/:requestId",
    protect,
    authorize("hospital", "staff", "admin"),
    getRequestAllocations
);


module.exports = router;
