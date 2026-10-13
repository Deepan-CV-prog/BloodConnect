const BloodUnit = require("../models/BloodUnit");
const Donation = require("../models/Donation");
const Traceability = require("../models/Traceability");

const createBloodUnit = async (req, res) => {
    try {
        const { donationId, expiryDate, currentLocation, remarks } = req.body;

        if (!donationId || !expiryDate) {
            return res.status(400).json({
                message: "Donation ID and expiry date are required"
            });
        }

        // Find donation
        const donation = await Donation.findById(donationId);

        if (!donation) {
            return res.status(404).json({
                message: "Donation not found"
            });
        }

        // Blood unit can only be created after collection
        if (donation.status !== "collected") {
            return res.status(400).json({
                message: "Blood unit can only be created for a collected donation"
            });
        }

        // Prevent duplicate blood unit
        const existingUnit = await BloodUnit.findOne({
            donationId
        });

        if (existingUnit) {
            return res.status(400).json({
                message: "Blood unit already exists for this donation"
            });
        }

        // Generate unique unit ID
        const count = await BloodUnit.countDocuments();

        const unitId = `BU-${new Date().getFullYear()}-${String(
            count + 1
        ).padStart(4, "0")}`;

        const bloodUnit = await BloodUnit.create({
            unitId,
            donationId,
            bloodGroup: donation.bloodGroup,
            collectionDate: donation.donationDate,
            expiryDate,
            testingStatus: "pending",
            inventoryStatus: "not_released",
            currentLocation: currentLocation || "Blood Bank",
            remarks: remarks || ""
        });

        const existingTraceability = await Traceability.findOne({
            bloodUnitId: bloodUnit._id,
            action: "collected"
        });

        if (!existingTraceability) {
            await Traceability.create({
                bloodUnitId: bloodUnit._id,
                action: "collected",
                performedBy: req.user.id,
                location: currentLocation || "Blood Bank",
                remarks: "Blood unit collected and registered"
            });
        }

        res.status(201).json({
            message: "Blood unit created successfully",
            bloodUnit
        });

    } catch (error) {
        console.error("Create blood unit error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const updateTestingStatus = async (req, res) => {
    try {
        const { testingStatus } = req.body;

        if (!["pending", "approved", "rejected"].includes(testingStatus)) {
            return res.status(400).json({
                message: "Invalid testing status"
            });
        }

        const bloodUnit = await BloodUnit.findById(req.params.id);

        if (!bloodUnit) {
            return res.status(404).json({
                message: "Blood unit not found"
            });
        }

        bloodUnit.testingStatus = testingStatus;

        if (testingStatus === "approved") {
            bloodUnit.inventoryStatus = "available";
        } else if (testingStatus === "rejected") {
            bloodUnit.inventoryStatus = "discarded";
        } else {
            bloodUnit.inventoryStatus = "not_released";
        }

        await bloodUnit.save();

        // Automatically create traceability record
        let action = "testing_started";

        if (testingStatus === "approved") {
            action = "testing_approved";
        } else if (testingStatus === "rejected") {
            action = "testing_rejected";
        }

        await Traceability.create({
            bloodUnitId: bloodUnit._id,
            action,
            performedBy: req.user.id,
            location: bloodUnit.currentLocation,
            remarks: `Testing status changed to ${testingStatus}`
        });

        res.status(200).json({
            message: "Blood unit testing status updated successfully",
            bloodUnit
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update testing status",
            error: error.message
        });
    }
};
const getInventory = async (req, res) => {
    try {
        const inventory = await BloodUnit.aggregate([
            {
                $match: {
                    testingStatus: "approved",
                    inventoryStatus: "available"
                }
            },
            {
                $group: {
                    _id: "$bloodGroup",
                    count: { $sum: 1 }
                }
            }
        ]);

        const bloodGroups = [
            "A+", "A-",
            "B+", "B-",
            "AB+", "AB-",
            "O+", "O-"
        ];

        const result = {};

        bloodGroups.forEach((group) => {
            result[group] = 0;
        });

        inventory.forEach((item) => {
            result[item._id] = item.count;
        });

        res.status(200).json({
            message: "Blood inventory fetched successfully",
            inventory: result
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch blood inventory",
            error: error.message
        });
    }
};
const getAvailableBloodUnits = async (req, res) => {
    try {
        const query = {
            testingStatus: "approved",
            inventoryStatus: "available"
        };

        if (req.query.bloodGroup) {
            query.bloodGroup = req.query.bloodGroup;
        }

        const bloodUnits = await BloodUnit.find(query).sort({ expiryDate: 1 }); // Oldest first (FIFO)

        res.status(200).json({
            message: "Available blood units fetched successfully",
            bloodUnits
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch blood units",
            error: error.message
        });
    }
};

const getAllBloodUnits = async (req, res) => {
    try {
        const bloodUnits = await BloodUnit.find().sort({ collectionDate: -1 });
        res.status(200).json({
            message: "All blood units fetched successfully",
            bloodUnits
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch all blood units",
            error: error.message
        });
    }
};

module.exports = {
    createBloodUnit,
    updateTestingStatus,
    getInventory,
    getAvailableBloodUnits,
    getAllBloodUnits
};
