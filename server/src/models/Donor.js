const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
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

        dateOfBirth: {
            type: Date,
            required: true
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true
        },

        address: {
            type: String,
            required: true
        },

        phone: {
            type: String,
            required: true
        },

        eligibilityStatus: {
            type: String,
            enum: ["pending", "eligible", "ineligible"],
            default: "pending"
        },

        lastDonationDate: {
            type: Date,
            default: null
        },

        totalDonations: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Donor", donorSchema);