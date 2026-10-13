const mongoose = require("mongoose");

const traceabilitySchema = new mongoose.Schema(
    {
        bloodUnitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BloodUnit",
            required: true
        },

        action: {
            type: String,
            enum: [
                "collected",
                "testing_started",
                "testing_approved",
                "testing_rejected",
                "stored",
                "allocated",
                "issued",
                "discarded"
            ],
            required: true
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        performedAt: {
            type: Date,
            default: Date.now
        },

        location: {
            type: String,
            default: "Blood Bank"
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

module.exports = mongoose.model("Traceability", traceabilitySchema);