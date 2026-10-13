const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema(
    {
        allocationId: {
            type: String,
            unique: true
        },
        requestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BloodRequest",
            required: true
        },

        unitId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BloodUnit",
            required: true
        },

        allocatedDate: {
            type: Date,
            default: Date.now
        },

        allocatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["allocated", "released", "cancelled"],
            default: "allocated"
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

module.exports = mongoose.model("Allocation", allocationSchema);