const BloodRequest = require("../models/BloodRequest");
const Hospital = require("../models/Hospital");
const Allocation = require("../models/Allocation");


// Create a blood request
const createBloodRequest = async (req, res) => {
    try {
        const {
            bloodGroup,
            quantity,
            priority,
            requiredDate,
            remarks
        } = req.body;

        if (!bloodGroup || !quantity || !requiredDate) {
            return res.status(400).json({
                message: "Blood group, quantity and required date are required"
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be at least 1"
            });
        }

        const hospital = await Hospital.findOne({
            userId: req.user.id
        });

        if (!hospital) {
            return res.status(404).json({
                message: "Hospital profile not found"
            });
        }

        const count = await BloodRequest.countDocuments();
        const currentYear = new Date().getFullYear();
        const requestId = `REQ-${currentYear}-${String(count + 1).padStart(4, "0")}`;

        const bloodRequest = await BloodRequest.create({
            requestId,
            hospitalId: hospital._id,
            bloodGroup,
            quantity,
            priority: priority || "normal",
            requiredDate,
            remarks: remarks || ""
        });

        res.status(201).json({
            message: "Blood request created successfully",
            bloodRequest
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create blood request",
            error: error.message
        });
    }
};


// Get hospital's blood requests
const getMyBloodRequests = async (req, res) => {
    try {
        const hospital = await Hospital.findOne({
            userId: req.user.id
        });

        if (!hospital) {
            return res.status(404).json({
                message: "Hospital profile not found"
            });
        }

        const requests = await BloodRequest.find({
            hospitalId: hospital._id
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            message: "Blood requests fetched successfully",
            requests
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch blood requests",
            error: error.message
        });
    }
};


// Get all blood requests for staff/admin
const getAllBloodRequests = async (req, res) => {
    try {
        const requestsRaw = await BloodRequest.find()
            .populate(
                "hospitalId",
                "name contactPerson phone email location"
            )
            .sort({
                createdAt: -1
            });

        // Ensure emergency priority requests are ranked first, followed by newest
        const requests = requestsRaw.sort((a, b) => {
            const pA = a.priority === "emergency" ? 0 : 1;
            const pB = b.priority === "emergency" ? 0 : 1;
            if (pA !== pB) return pA - pB;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        res.status(200).json({
            message: "All blood requests fetched successfully",
            requests
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch blood requests",
            error: error.message
        });
    }
};


// Update request status
const updateBloodRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "approved",
            "rejected",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid request status"
            });
        }

        const bloodRequest = await BloodRequest.findById(
            req.params.id
        );

        if (!bloodRequest) {
            return res.status(404).json({
                message: "Blood request not found"
            });
        }

        // Prevent reverting status if units have already been allocated or released
        const activeAllocs = await Allocation.countDocuments({
            requestId: bloodRequest._id,
            status: { $in: ["allocated", "released"] }
        });

        if (activeAllocs > 0 && ["pending", "rejected", "cancelled"].includes(status)) {
            return res.status(400).json({
                message: `Cannot revert request to '${status}': ${activeAllocs} unit(s) are already allocated or released.`
            });
        }

        bloodRequest.status = status;
        await bloodRequest.save();

        const io = req.app.get("io");
        if (io) {
            io.emit("bloodRequestStatusUpdated", {
                requestId: bloodRequest._id,
                status: bloodRequest.status
            });
            io.emit("requestUpdated");
        }

        const followUpMessage = status === "approved"
            ? "Blood request approved. Next step: allocate inventory units."
            : `Blood request status updated to ${status}.`;

        res.status(200).json({
            message: followUpMessage,
            bloodRequest
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update blood request status",
            error: error.message
        });
    }
};


// Get single blood request by ID
const getBloodRequestById = async (req, res) => {
    try {
        const bloodRequest = await BloodRequest.findById(req.params.id)
            .populate("hospitalId", "name contactPerson phone email location");

        if (!bloodRequest) {
            return res.status(404).json({
                message: "Blood request not found"
            });
        }

        // If hospital is viewing, ensure they own it
        if (req.user.role === "hospital") {
            const hospital = await Hospital.findOne({ userId: req.user.id });
            if (!hospital || bloodRequest.hospitalId._id.toString() !== hospital._id.toString()) {
                return res.status(403).json({
                    message: "Not authorized to view this request"
                });
            }
        }

        res.status(200).json({
            message: "Blood request fetched successfully",
            bloodRequest
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch blood request",
            error: error.message
        });
    }
};

module.exports = {
    createBloodRequest,
    getMyBloodRequests,
    getAllBloodRequests,
    getBloodRequestById,
    updateBloodRequestStatus
};
