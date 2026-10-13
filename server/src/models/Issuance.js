const mongoose = require("mongoose");

const issuanceSchema = new mongoose.Schema(
    {
        issuanceId: {
            type: String,
            unique: true
        },
        allocationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Allocation",
            required: true
        },

        issuedDate: {
            type: Date,
            default: Date.now
        },

        issuedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receivedBy: {
            type: String,
            required: true,
            trim: true
        },

        status: {
            type: String,
            enum: ["issued", "cancelled"],
            default: "issued"
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

module.exports = mongoose.model("Issuance", issuanceSchema);