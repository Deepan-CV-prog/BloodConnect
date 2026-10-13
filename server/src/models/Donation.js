const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
    {
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Donor",
            required: true
        },

        donationDate: {
            type: Date,
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

        volumeMl: {
            type: Number,
            required: true
        },

        status: {
            type: String,
            enum: [
                "scheduled",
                "collected",
                "cancelled"
            ],
            default: "scheduled"
        },

        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
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

module.exports = mongoose.model("Donation", donationSchema);