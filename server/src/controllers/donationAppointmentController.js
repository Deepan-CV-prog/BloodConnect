const DonationAppointment = require("../models/DonationAppointment");
const Donor = require("../models/Donor");

const createAppointment = async (req, res) => {
    try {
        const { preferredDate, preferredTime, remarks } = req.body;

        if (!preferredDate || !preferredTime) {
            return res.status(400).json({
                message: "Preferred date and time are required"
            });
        }

        const donor = await Donor.findOne({ userId: req.user.id });
        if (!donor) {
            return res.status(404).json({
                message: "Donor profile not found"
            });
        }

        if (donor.lastDonationDate) {
            const lastDonation = new Date(donor.lastDonationDate);
            const nextEligibleDate = new Date(lastDonation);
            nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 3);

            const attemptDate = new Date(preferredDate);

            if (attemptDate < nextEligibleDate) {
                const formattedDate = nextEligibleDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                });
                return res.status(400).json({
                    message: `Donor is temporarily ineligible. The next donation can be scheduled after ${formattedDate}.`
                });
            }
        }

        const appointment = await DonationAppointment.create({
            donorId: donor._id,
            preferredDate,
            preferredTime,
            remarks
        });

        res.status(201).json({
            message: "Appointment request submitted successfully",
            appointment
        });

    } catch (error) {
        console.error("Create appointment error:", error.message);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

const getMyAppointments = async (req, res) => {
    try {
        const donor = await Donor.findOne({ userId: req.user.id });
        if (!donor) {
            return res.status(404).json({
                message: "Donor profile not found"
            });
        }

        if (donor.lastDonationDate) {
            const lastDonation = new Date(donor.lastDonationDate);
            const nextEligibleDate = new Date(lastDonation);
            nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 3);

            const attemptDate = new Date(preferredDate);

            if (attemptDate < nextEligibleDate) {
                const formattedDate = nextEligibleDate.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                });
                return res.status(400).json({
                    message: `Donor is temporarily ineligible. The next donation can be scheduled after ${formattedDate}.`
                });
            }
        }

        const appointments = await DonationAppointment.find({ donorId: donor._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Appointments fetched successfully",
            appointments
        });

    } catch (error) {
        console.error("Get my appointments error:", error.message);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

const getAllAppointments = async (req, res) => {
    try {
        const appointments = await DonationAppointment.find()
            .populate({
                path: "donorId",
                populate: {
                    path: "userId",
                    select: "name email phone"
                }
            })
            .populate("reviewedBy", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Appointments fetched successfully",
            appointments
        });

    } catch (error) {
        console.error("Get all appointments error:", error.message);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

const updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ["approved", "rejected", "completed", "cancelled"];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid appointment status"
            });
        }

        const appointment = await DonationAppointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        appointment.status = status;
        appointment.reviewedBy = req.user.id;
        appointment.reviewedAt = Date.now();

        await appointment.save();

        res.status(200).json({
            message: "Appointment status updated successfully",
            appointment
        });

    } catch (error) {
        console.error("Update appointment status error:", error.message);
        res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};

module.exports = {
    createAppointment,
    getMyAppointments,
    getAllAppointments,
    updateAppointmentStatus
};
