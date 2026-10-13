const Donor = require("../models/Donor");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const createDonor = async (req, res) => {
    try {
        const {
            bloodGroup,
            dateOfBirth,
            gender,
            address,
            phone
        } = req.body;

        if (
            !bloodGroup ||
            !dateOfBirth ||
            !gender ||
            !address ||
            !phone
        ) {
            return res.status(400).json({
                message: "All donor details are required"
            });
        }

        // Check if donor profile already exists
        const existingDonor = await Donor.findOne({
            userId: req.user.id
        });

        if (existingDonor) {
            return res.status(400).json({
                message: "Donor profile already exists"
            });
        }

        const donor = await Donor.create({
            userId: req.user.id,
            bloodGroup,
            dateOfBirth,
            gender,
            address,
            phone
        });

        res.status(201).json({
            message: "Donor profile created successfully",
            donor
        });

    } catch (error) {
        console.error("Create donor error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const getDonorProfile = async (req, res) => {
    try {
        const donor = await Donor.findOne({
            userId: req.user.id
        }).populate("userId", "name email role");

        if (!donor) {
            return res.status(404).json({
                message: "Donor profile not found"
            });
        }

        const donorObj = donor.toObject();
        let nextEligibleDate = null;

        if (donorObj.lastDonationDate) {
            const nextDate = new Date(donorObj.lastDonationDate);
            nextDate.setMonth(nextDate.getMonth() + 3);

            if (new Date() < nextDate) {
                donorObj.eligibilityStatus = "ineligible";
                nextEligibleDate = nextDate;
            }
        }

        res.status(200).json({
            donor: donorObj,
            nextEligibleDate
        });

    } catch (error) {
        console.error("Get donor profile error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const updateDonorProfile = async (req, res) => {
    try {
        const {
            bloodGroup,
            dateOfBirth,
            gender,
            address,
            phone
        } = req.body;

        const donor = await Donor.findOne({
            userId: req.user.id
        });

        if (!donor) {
            return res.status(404).json({
                message: "Donor profile not found"
            });
        }

        if (bloodGroup !== undefined) {
            donor.bloodGroup = bloodGroup;
        }

        if (dateOfBirth !== undefined) {
            donor.dateOfBirth = dateOfBirth;
        }

        if (gender !== undefined) {
            donor.gender = gender;
        }

        if (address !== undefined) {
            donor.address = address;
        }

        if (phone !== undefined) {
            donor.phone = phone;
        }

        await donor.save();

        res.status(200).json({
            message: "Donor profile updated successfully",
            donor
        });

    } catch (error) {
        console.error("Update donor error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const updateEligibility = async (req, res) => {
    try {
        const { eligibilityStatus } = req.body;

        if (!eligibilityStatus) {
            return res.status(400).json({
                message: "Eligibility status is required"
            });
        }

        const allowedStatuses = [
            "pending",
            "eligible",
            "ineligible"
        ];

        if (!allowedStatuses.includes(eligibilityStatus)) {
            return res.status(400).json({
                message: "Invalid eligibility status"
            });
        }

        const donor = await Donor.findById(req.params.id);

        if (!donor) {
            return res.status(404).json({
                message: "Donor not found"
            });
        }

        let finalStatus = eligibilityStatus;
        let nextEligibleDate = null;

        if (donor.lastDonationDate) {
            const nextDate = new Date(donor.lastDonationDate);
            nextDate.setMonth(nextDate.getMonth() + 3);

            if (new Date() < nextDate) {
                finalStatus = "ineligible";
                nextEligibleDate = nextDate;
            }
        }

        donor.eligibilityStatus = finalStatus;
        await donor.save();

        const donorObj = donor.toObject();
        donorObj.nextEligibleDate = nextEligibleDate;

        res.status(200).json({
            message: finalStatus === "ineligible" && eligibilityStatus === "eligible" ? `Donor is currently ineligible. Next eligible date: ${new Date(nextEligibleDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}.` : `Donor marked as ${finalStatus}.`,
            donor: donorObj,
            actualStatus: finalStatus
        });

    } catch (error) {
        console.error("Update eligibility error:", error.message);

        res.status(500).json({
            message: "Server error"
        });
    }
};
const getAllDonors = async (req, res) => {
    try {
        const donorsRaw = await Donor.find()
            .populate("userId", "name email phone role")
            .sort({ createdAt: -1 });

        const donors = donorsRaw.map(donor => {
            const donorObj = donor.toObject();
            if (donorObj.lastDonationDate) {
                const nextDate = new Date(donorObj.lastDonationDate);
                nextDate.setMonth(nextDate.getMonth() + 3);

                if (new Date() < nextDate) {
                    donorObj.eligibilityStatus = "ineligible";
                    donorObj.nextEligibleDate = nextDate;
                }
            }
            return donorObj;
        });

        res.status(200).json({
            message: "Donors fetched successfully",
            donors
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch donors",
            error: error.message
        });
    }
};
const registerDonorByStaff = async (req, res) => {
    try {
        const { name, email, password, phone, bloodGroup, dateOfBirth, gender, address } = req.body;
        if (!name || !email || !password || !phone || !bloodGroup || !dateOfBirth || !gender || !address) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "donor",
            phone
        });
        const donor = await Donor.create({
            userId: user._id,
            bloodGroup,
            dateOfBirth,
            gender,
            address,
            phone
        });
        res.status(201).json({
            message: "Donor registered successfully",
            donor
        });
    } catch (error) {
        console.error("Register donor by staff error:", error.message);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    registerDonorByStaff,
    createDonor,
    getDonorProfile,
    updateDonorProfile,
    updateEligibility,
    getAllDonors
};
