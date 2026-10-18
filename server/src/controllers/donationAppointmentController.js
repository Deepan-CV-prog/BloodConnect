const DonationAppointment = require("../models/DonationAppointment");
const Donor = require("../models/Donor");
const { evaluateDonorEligibility, formatEligibleDate } = require("../utils/donorEligibility");

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

        // Verify current eligibility against actual completed donation records
        const evalResult = await evaluateDonorEligibility(donor);

        if (evalResult.nextEligibleDate) {
            const attemptDate = new Date(preferredDate);
            if (attemptDate < evalResult.nextEligibleDate) {
                return res.status(400).json({
                    message: `Donor is temporarily ineligible. The next donation can be scheduled after ${evalResult.formattedNextEligibleDate}.`,
                    nextEligibleDate: evalResult.nextEligibleDate
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

        const appointmentsRaw = await DonationAppointment.find({ donorId: donor._id })
            .sort({ createdAt: -1 });

        const evalResult = await evaluateDonorEligibility(donor);

        const appointments = appointmentsRaw.map(appt => {
            const apptObj = appt.toObject();
            let isConflicting = false;
            let conflictReason = null;

            if (
                evalResult.nextEligibleDate &&
                ["pending", "approved"].includes(apptObj.status) &&
                new Date(apptObj.preferredDate) < evalResult.nextEligibleDate
            ) {
                isConflicting = true;
                conflictReason = `Appointment falls within 3-month deferral period (eligible after ${evalResult.formattedNextEligibleDate})`;
            }

            return {
                ...apptObj,
                isConflicting,
                conflictReason,
                nextEligibleDate: evalResult.nextEligibleDate
            };
        });

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
        const appointmentsRaw = await DonationAppointment.find()
            .populate({
                path: "donorId",
                populate: {
                    path: "userId",
                    select: "name email phone"
                }
            })
            .populate("reviewedBy", "name")
            .sort({ createdAt: -1 });

        // Annotate conflicting appointments without altering status in DB
        const appointments = await Promise.all(
            appointmentsRaw.map(async (appt) => {
                const apptObj = appt.toObject();
                let isConflicting = false;
                let conflictReason = null;
                let nextEligibleDate = null;
                let formattedNextEligibleDate = "";

                if (appt.donorId) {
                    const evalResult = await evaluateDonorEligibility(appt.donorId);
                    nextEligibleDate = evalResult.nextEligibleDate;
                    formattedNextEligibleDate = evalResult.formattedNextEligibleDate;

                    if (
                        evalResult.nextEligibleDate &&
                        ["pending", "approved"].includes(apptObj.status) &&
                        new Date(apptObj.preferredDate) < evalResult.nextEligibleDate
                    ) {
                        isConflicting = true;
                        conflictReason = `Requires staff review: Donor in 3-month deferral period until ${formattedNextEligibleDate}`;
                    }
                }

                return {
                    ...apptObj,
                    isConflicting,
                    conflictReason,
                    nextEligibleDate,
                    formattedNextEligibleDate
                };
            })
        );

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

        // Verify eligibility before approving an appointment
        if (status === "approved") {
            const donor = await Donor.findById(appointment.donorId);
            if (donor) {
                const evalResult = await evaluateDonorEligibility(donor);
                if (
                    evalResult.nextEligibleDate &&
                    new Date(appointment.preferredDate) < evalResult.nextEligibleDate
                ) {
                    return res.status(400).json({
                        message: `Cannot approve appointment: Donor is in a 3-month deferral period until ${evalResult.formattedNextEligibleDate}.`
                    });
                }
            }
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
