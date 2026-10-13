const Traceability = require("../models/Traceability");
const BloodUnit = require("../models/BloodUnit");

// Create a traceability record
const createTraceability = async (req, res) => {
    try {
        const {
            bloodUnitId,
            action,
            location,
            remarks
        } = req.body;

        if (!bloodUnitId || !action) {
            return res.status(400).json({
                message: "Blood unit ID and action are required"
            });
        }

        const bloodUnit = await BloodUnit.findById(bloodUnitId);

        if (!bloodUnit) {
            return res.status(404).json({
                message: "Blood unit not found"
            });
        }

        const traceability = await Traceability.create({
            bloodUnitId,
            action,
            performedBy: req.user.id,
            location: location || "Blood Bank",
            remarks: remarks || ""
        });

        res.status(201).json({
            message: "Traceability record created successfully",
            traceability
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create traceability record",
            error: error.message
        });
    }
};


// Get traceability history of a blood unit
const getBloodUnitHistory = async (req, res) => {
    try {
        const { bloodUnitId } = req.params;

        const bloodUnit = await BloodUnit.findOne({ unitId: bloodUnitId });

        if (!bloodUnit) {
            return res.status(404).json({
                message: "Blood unit not found"
            });
        }

        const history = await Traceability.find({
            bloodUnitId: bloodUnit._id
        })
            .populate("performedBy", "name email role")
            .sort({ performedAt: 1 });

        res.status(200).json({
            message: "Blood unit history fetched successfully",
            bloodUnit: {
                id: bloodUnit._id,
                unitId: bloodUnit.unitId,
                bloodGroup: bloodUnit.bloodGroup,
                testingStatus: bloodUnit.testingStatus,
                inventoryStatus: bloodUnit.inventoryStatus
            },
            history
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch blood unit history",
            error: error.message
        });
    }
};


module.exports = {
    createTraceability,
    getBloodUnitHistory
};