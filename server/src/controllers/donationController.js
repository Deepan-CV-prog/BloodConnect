const Donation = require("../models/Donation");
const Donor = require("../models/Donor");

const createDonation = async (req, res) => {
    try {
        const {
            donorId,
            donationDate,
            bloodGroup,
            volumeMl,
            remarks
        } = req.body;

        if (!donorId || !donationDate || !bloodGroup || !volumeMl) {
            return res.status(400).json({
                message: "Donor, donation date, blood group and volume are required"
            });
        }

        // Check donor exists
        const donor = await Donor.findById(donorId);

        if (!donor) {
            return res.status(404).json({
                message: "Donor not found"
            });
        }

        // Donor must be eligible
        if (donor.eligibilityStatus !== "eligible") {
            return res.status(400).json({
                message: "Donor is not currently eligible for donation"
            });
        }

        if (donor.lastDonationDate) {
            const lastDonation = new Date(donor.lastDonationDate);
            const nextEligibleDate = new Date(lastDonation);
            nextEligibleDate.setMonth(nextEligibleDate.getMonth() + 3);

            const attemptDate = new Date(donationDate);

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

        // Create donation
        const donation = await Donation.create({
            donorId,
            donationDate,
            bloodGroup,
            volumeMl,
            status: req.body.status || "scheduled",
            staffId: req.user.id,
            remarks
        });

        if (donation.status === "collected") {
            await Donor.findByIdAndUpdate(donorId, {
                lastDonationDate: donation.donationDate,
                eligibilityStatus: "ineligible",
                $inc: { totalDonations: 1 }
            });
        }

        res.status(201).json({
            message: "Donation recorded successfully",
            donation
        });

    } catch (error) {
        console.error("Create donation error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const updateDonationStatus = async (req, res) => {
    try {
        const { status } = req.body;

        const allowedStatuses = [
            "scheduled",
            "collected",
            "cancelled"
        ];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid donation status"
            });
        }

        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({
                message: "Donation not found"
            });
        }

        donation.status = status;

        await donation.save();

        // Update donor's last donation date when collected
        if (status === "collected") {
            await Donor.findByIdAndUpdate(
                donation.donorId,
                {
                    lastDonationDate: donation.donationDate,
                    eligibilityStatus: "ineligible",
                    $inc: { totalDonations: 1 }
                }
            );
        }

        res.status(200).json({
            message: "Donation status updated successfully",
            donation
        });

    } catch (error) {
        console.error("Update donation status error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const getAllDonations = async (req, res) => {
    try {
        const donations = await Donation.find()
            .populate({
                path: "donorId",
                populate: {
                    path: "userId",
                    select: "name email phone"
                }
            })
            .populate("staffId", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Donations fetched successfully",
            donations
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch donations",
            error: error.message
        });
    }
};

const getMyDonations = async (req, res) => {
    try {
        const donor = await Donor.findOne({ userId: req.user.id });
        if (!donor) {
            return res.status(404).json({ message: "Donor profile not found" });
        }

        const donations = await Donation.find({ donorId: donor._id })
            .populate("staffId", "name")
            .sort({ donationDate: -1 });

        res.status(200).json({
            message: "Donations fetched successfully",
            donations
        });
    } catch (error) {
        console.error("Get my donations error:", error.message);
        res.status(500).json({
            message: "Failed to fetch donations",
            error: error.message
        });
    }
};

module.exports = {
    createDonation,
    updateDonationStatus,
    getAllDonations,
    getMyDonations
};
