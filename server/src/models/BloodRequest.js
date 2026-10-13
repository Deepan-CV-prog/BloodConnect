const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema(
    {
        requestId: {
            type: String,
            unique: true
        },
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hospital",
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

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        priority: {
            type: String,
            enum: ["normal", "emergency"],
            default: "normal"
        },

        requestDate: {
            type: Date,
            default: Date.now
        },

        requiredDate: {
            type: Date,
            required: true
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "partially_allocated",
                "allocated",
                "rejected",
                "completed",
                "cancelled"
            ],
            default: "pending"
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

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);