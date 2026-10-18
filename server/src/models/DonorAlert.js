const mongoose = require("mongoose");

const donorAlertSchema = new mongoose.Schema(
    {
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BloodRequest",
            required: true
        },
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Donor",
            required: true
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
        urgency: {
            type: String,
            enum: ["normal", "emergency"],
            default: "emergency"
        },
        status: {
            type: String,
            enum: ["sent", "available", "unavailable"],
            default: "sent"
        },
        responseNote: {
            type: String,
            default: ""
        },
        respondedAt: {
            type: Date,
            default: null
        },
        sentBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        sentAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

// Ensure no duplicate alerts for the same donor and request
donorAlertSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

module.exports = mongoose.model("DonorAlert", donorAlertSchema);
