const mongoose = require("mongoose");

const donationAppointmentSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: String,
            required: true,
            unique: true
        },
        donorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Donor",
            required: true
        },
        preferredDate: {
            type: Date,
            required: true
        },
        preferredTime: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "completed", "cancelled"],
            default: "pending"
        },
        remarks: {
            type: String,
            default: ""
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Pre-save middleware to generate appointmentId
donationAppointmentSchema.pre("validate", async function () {
    if (!this.appointmentId) {
        const count = await this.constructor.countDocuments();
        const year = new Date().getFullYear();
        this.appointmentId = `APT-${year}-${(count + 1).toString().padStart(4, "0")}`;
    }
});

module.exports = mongoose.model("DonationAppointment", donationAppointmentSchema);
