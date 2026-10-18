const Issuance = require("../models/Issuance");
const Allocation = require("../models/Allocation");
const BloodUnit = require("../models/BloodUnit");
const BloodRequest = require("../models/BloodRequest");
const Traceability = require("../models/Traceability");


// Issue an allocated blood unit
const createIssuance = async (req, res) => {
    try {
        const {
            allocationId,
            receivedBy,
            remarks
        } = req.body;

        if (!allocationId || !receivedBy) {
            return res.status(400).json({
                message: "Allocation ID and receiver name are required"
            });
        }

        // Find allocation
        const allocation = await Allocation.findById(allocationId);

        if (!allocation) {
            return res.status(404).json({
                message: "Allocation not found"
            });
        }

        if (allocation.status !== "allocated") {
            return res.status(400).json({
                message: "Only an allocated unit can be issued"
            });
        }

        // Check if already issued
        const existingIssuance = await Issuance.findOne({
            allocationId,
            status: "issued"
        });

        if (existingIssuance) {
            return res.status(400).json({
                message: "This allocation has already been issued"
            });
        }

        // Find blood unit
        const bloodUnit = await BloodUnit.findById(
            allocation.unitId
        );

        if (!bloodUnit) {
            return res.status(404).json({
                message: "Blood unit not found"
            });
        }

        if (bloodUnit.inventoryStatus !== "allocated") {
            return res.status(400).json({
                message: "Blood unit is not currently allocated"
            });
        }

        // Generate issuanceId
        const count = await Issuance.countDocuments();
        const currentYear = new Date().getFullYear();
        const issuanceId = `ISSUE-${currentYear}-${String(count + 1).padStart(4, "0")}`;

        // Create issuance record
        const issuance = await Issuance.create({
            issuanceId,
            allocationId,
            issuedBy: req.user.id,
            receivedBy,
            remarks: remarks || ""
        });

        // Update blood unit
        bloodUnit.inventoryStatus = "issued";
        bloodUnit.currentLocation = "Hospital";
        await bloodUnit.save();
        const io = req.app.get("io");

        if (io) {
            io.emit("inventoryUpdated", {
                bloodGroup: bloodUnit.bloodGroup,
                unitId: bloodUnit.unitId,
                status: "issued"
            });
        }

        // Update allocation
        allocation.status = "released";
        await allocation.save();

        // Get request
        const bloodRequest = await BloodRequest.findById(
            allocation.requestId
        );

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

            const io = req.app.get("io");
            if (io) {
                io.emit("bloodRequestStatusUpdated", {
                    requestId: bloodRequest._id,
                    status: bloodRequest.status
                });
                io.emit("requestUpdated");
            }
        }

        // Create traceability record
        await Traceability.create({
            bloodUnitId: bloodUnit._id,
            action: "issued",
            performedBy: req.user.id,
            location: "Hospital",
            remarks: `Blood unit issued to ${receivedBy}`
        });

        res.status(201).json({
            message: "Blood unit issued successfully",
            issuance,
            bloodUnit,
            allocation
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to issue blood unit",
            error: error.message
        });
    }
};


// Get issuance records
const getIssuances = async (req, res) => {
    try {
        const issuances = await Issuance.find()
            .populate({
                path: "allocationId",
                populate: [
                    {
                        path: "unitId",
                        select: "unitId bloodGroup inventoryStatus"
                    },
                    {
                        path: "requestId",
                        select: "bloodGroup quantity priority status"
                    }
                ]
            })
            .populate(
                "issuedBy",
                "name email role"
            )
            .sort({
                issuedDate: -1
            });

        res.status(200).json({
            message: "Issuance records fetched successfully",
            issuances
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch issuance records",
            error: error.message
        });
    }
};

const getIssuanceById = async (req, res) => {
    try {
        const issuance = await Issuance.findById(req.params.id)
            .populate({
                path: "allocationId",
                populate: [
                    {
                        path: "unitId",
                        select: "unitId bloodGroup inventoryStatus"
                    },
                    {
                        path: "requestId",
                        select: "bloodGroup quantity priority status"
                    }
                ]
            })
            .populate(
                "issuedBy",
                "name email role"
            );

        if (!issuance) {
            return res.status(404).json({ message: "Issuance not found" });
        }

        res.status(200).json({
            message: "Issuance record fetched successfully",
            issuance
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch issuance record",
            error: error.message
        });
    }
};

module.exports = {
    createIssuance,
    getIssuances,
    getIssuanceById
};
