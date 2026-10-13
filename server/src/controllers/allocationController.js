const Allocation = require("../models/Allocation");
const BloodRequest = require("../models/BloodRequest");
const BloodUnit = require("../models/BloodUnit");
const Traceability = require("../models/Traceability");


// Allocate a blood unit to a request
const createAllocation = async (req, res) => {
    try {
        const { requestId, unitId, remarks } = req.body;

        if (!requestId || !unitId) {
            return res.status(400).json({
                message: "Request ID and blood unit ID are required"
            });
        }

        // Check blood request
        const bloodRequest = await BloodRequest.findById(requestId);

        if (!bloodRequest) {
            return res.status(404).json({
                message: "Blood request not found"
            });
        }

        if (bloodRequest.status !== "approved" && bloodRequest.status !== "partially_allocated") {
            return res.status(400).json({
                message: "Blood request must be approved or partially allocated before allocation"
            });
        }

        // Prevent over-allocation
        const existingAssignmentsCount = await Allocation.countDocuments({
            requestId,
            status: { $in: ["allocated", "released"] }
        });

        if (existingAssignmentsCount >= bloodRequest.quantity) {
            return res.status(400).json({
                message: "Requested quantity has already been fully allocated or issued"
            });
        }

        // Check blood unit
        const bloodUnit = await BloodUnit.findById(unitId);

        if (!bloodUnit) {
            return res.status(404).json({
                message: "Blood unit not found"
            });
        }

        // Check blood group
        if (bloodUnit.bloodGroup !== bloodRequest.bloodGroup) {
            return res.status(400).json({
                message: "Blood group does not match the request"
            });
        }

        // Check availability
        if (
            bloodUnit.testingStatus !== "approved" ||
            bloodUnit.inventoryStatus !== "available"
        ) {
            return res.status(400).json({
                message: "Blood unit is not available for allocation"
            });
        }

        // Prevent double allocation
        const existingAllocation = await Allocation.findOne({
            unitId,
            status: "allocated"
        });

        if (existingAllocation) {
            return res.status(400).json({
                message: "Blood unit is already allocated"
            });
        }

        // Generate allocationId
        const count = await Allocation.countDocuments();
        const currentYear = new Date().getFullYear();
        const allocationId = `ALLOC-${currentYear}-${String(count + 1).padStart(4, "0")}`;

        // Create allocation
        const allocation = await Allocation.create({
            allocationId,
            requestId,
            unitId,
            allocatedBy: req.user.id,
            remarks: remarks || ""
        });

        // Update blood unit
        bloodUnit.inventoryStatus = "allocated";
        await bloodUnit.save();
        const io = req.app.get("io");

        if (io) {
            io.emit("inventoryUpdated", {
                bloodGroup: bloodUnit.bloodGroup,
                unitId: bloodUnit.unitId,
                status: "allocated"
            });
        }

        // Create traceability record
        await Traceability.create({
            bloodUnitId: bloodUnit._id,
            action: "allocated",
            performedBy: req.user.id,
            location: bloodUnit.currentLocation,
            remarks: `Allocated to blood request ${bloodRequest.requestId || requestId}`
        });

        // Update request status correctly
        const allocatedCount = await Allocation.countDocuments({
            requestId,
            status: "allocated"
        });
        const allAssigned = await Allocation.countDocuments({
            requestId,
            status: { $in: ["allocated", "released"] }
        });

        const releasedCount = await Allocation.countDocuments({
            requestId,
            status: "released"
        });

        if (releasedCount >= bloodRequest.quantity) {
            bloodRequest.status = "completed";
        } else if (allocatedCount >= bloodRequest.quantity) {
            bloodRequest.status = "allocated";
        } else if (allAssigned > 0) {
            bloodRequest.status = "partially_allocated";
        } else {
            bloodRequest.status = "approved";
        }

        await bloodRequest.save();

        res.status(201).json({
            message: "Blood unit allocated successfully",
            allocation,
            bloodUnit,
            requestStatus: bloodRequest.status
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to allocate blood unit",
            error: error.message
        });
    }
};

const getAllAllocations = async (req, res) => {
    try {
        const allocations = await Allocation.find()
            .populate("requestId", "requestId bloodGroup quantity priority status")
            .populate("unitId", "unitId bloodGroup collectionDate expiryDate inventoryStatus")
            .populate("allocatedBy", "name email role")
            .sort({ allocatedDate: -1 });

        res.status(200).json({
            message: "All allocations fetched successfully",
            allocations
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch allocations",
            error: error.message
        });
    }
};

const getAllocationById = async (req, res) => {
    try {
        const allocation = await Allocation.findById(req.params.id)
            .populate("requestId", "requestId bloodGroup quantity priority status")
            .populate("unitId", "unitId bloodGroup collectionDate expiryDate inventoryStatus")
            .populate("allocatedBy", "name email role");

        if (!allocation) {
            return res.status(404).json({ message: "Allocation not found" });
        }

        res.status(200).json({
            message: "Allocation fetched successfully",
            allocation
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch allocation",
            error: error.message
        });
    }
};

const cancelAllocation = async (req, res) => {
    try {
        const allocation = await Allocation.findById(req.params.id);

        if (!allocation) {
            return res.status(404).json({ message: "Allocation not found" });
        }

        if (allocation.status === "cancelled") {
            return res.status(400).json({ message: "Allocation is already cancelled" });
        }

        if (allocation.status === "released") {
            return res.status(400).json({ message: "Cannot cancel an issued/released allocation" });
        }

        allocation.status = "cancelled";
        await allocation.save();

        // Update blood unit back to available
        const bloodUnit = await BloodUnit.findById(allocation.unitId);
        if (bloodUnit) {
            bloodUnit.inventoryStatus = "available";
            await bloodUnit.save();

            const io = req.app.get("io");
            if (io) {
                io.emit("inventoryUpdated", {
                    bloodGroup: bloodUnit.bloodGroup,
                    unitId: bloodUnit.unitId,
                    status: "available"
                });
            }

            // Create traceability record
            await Traceability.create({
                bloodUnitId: bloodUnit._id,
                action: "stored",
                performedBy: req.user.id,
                location: bloodUnit.currentLocation,
                remarks: `Allocation ${allocation.allocationId || allocation._id} was cancelled`
            });
        }

        // Update blood request status logic
        const bloodRequest = await BloodRequest.findById(allocation.requestId);
        if (bloodRequest) {
            const allocatedCount = await Allocation.countDocuments({
                requestId: bloodRequest._id,
                status: "allocated"
            });
            const allAssigned = await Allocation.countDocuments({
                requestId: bloodRequest._id,
                status: { $in: ["allocated", "released"] }
            });
            const releasedCount = await Allocation.countDocuments({
                requestId: bloodRequest._id,
                status: "released"
            });

            if (releasedCount >= bloodRequest.quantity) {
                bloodRequest.status = "completed";
            } else if (allocatedCount >= bloodRequest.quantity) {
                bloodRequest.status = "allocated";
            } else if (allAssigned > 0) {
                bloodRequest.status = "partially_allocated";
            } else {
                bloodRequest.status = "approved";
            }
            await bloodRequest.save();
        }

        res.status(200).json({
            message: "Allocation cancelled successfully",
            allocation
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to cancel allocation",
            error: error.message
        });
    }
};

// Get allocations for a blood request
const getRequestAllocations = async (req, res) => {
    try {
        const allocations = await Allocation.find({
            requestId: req.params.requestId
        })
            .populate(
                "unitId",
                "unitId bloodGroup collectionDate expiryDate inventoryStatus"
            )
            .populate(
                "allocatedBy",
                "name email role"
            )
            .sort({ allocatedDate: 1 });

        res.status(200).json({
            message: "Allocations fetched successfully",
            allocations
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch allocations",
            error: error.message
        });
    }
};


module.exports = {
    createAllocation,
    getAllAllocations,
    getAllocationById,
    cancelAllocation,
    getRequestAllocations
};
