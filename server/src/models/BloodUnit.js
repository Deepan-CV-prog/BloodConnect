const mongoose = require("mongoose");

const bloodUnitSchema = new mongoose.Schema(
    {
        unitId: {
            type: String,
            required: true,
            unique: true
        },

        donationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Donation",
            required: true,
            unique: true
        },

        bloodGroup: {
            type: String,
            enum: [
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-"
            ],
            required: true
        },

        collectionDate: {
            type: Date,
            required: true
        },

        expiryDate: {
            type: Date,
            required: true
        },

        testingStatus: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected"
            ],
            default: "pending"
        },

        inventoryStatus: {
            type: String,
            enum: [
                "not_released",
                "available",
                "allocated",
                "issued",
                "expired",
                "discarded"
            ],
            default: "not_released"
        },

        currentLocation: {
            type: String,
            default: "Blood Bank"
        },

        qrCode: {
            type: String,
            default: ""
        },

        remarks: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("BloodUnit", bloodUnitSchema);