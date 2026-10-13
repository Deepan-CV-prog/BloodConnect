const Hospital = require("../models/Hospital");


// Create hospital profile
const createHospital = async (req, res) => {
    try {
        const {
            name,
            contactPerson,
            phone,
            email,
            address,
            licenseNumber,
            location
        } = req.body;

        if (
            !name ||
            !contactPerson ||
            !phone ||
            !email ||
            !address ||
            !licenseNumber
        ) {
            return res.status(400).json({
                message: "All required hospital fields must be provided"
            });
        }

        const existingHospital = await Hospital.findOne({
            userId: req.user.id
        });

        if (existingHospital) {
            return res.status(400).json({
                message: "Hospital profile already exists"
            });
        }

        const existingLicense = await Hospital.findOne({
            licenseNumber
        });

        if (existingLicense) {
            return res.status(400).json({
                message: "License number already registered"
            });
        }

        const hospital = await Hospital.create({
            userId: req.user.id,
            name,
            contactPerson,
            phone,
            email,
            address,
            licenseNumber,
            location: location || ""
        });

        res.status(201).json({
            message: "Hospital profile created successfully",
            hospital
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to create hospital profile",
            error: error.message
        });
    }
};


// Get hospital profile
const getHospitalProfile = async (req, res) => {
    try {
        const hospital = await Hospital.findOne({
            userId: req.user.id
        }).populate("userId", "name email role");

        if (!hospital) {
            return res.status(404).json({
                message: "Hospital profile not found"
            });
        }

        res.status(200).json({
            message: "Hospital profile fetched successfully",
            hospital
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch hospital profile",
            error: error.message
        });
    }
};


// Update hospital profile
const updateHospitalProfile = async (req, res) => {
    try {
        const hospital = await Hospital.findOne({
            userId: req.user.id
        });

        if (!hospital) {
            return res.status(404).json({
                message: "Hospital profile not found"
            });
        }

        const allowedFields = [
            "name",
            "contactPerson",
            "phone",
            "email",
            "address",
            "location"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                hospital[field] = req.body[field];
            }
        });

        await hospital.save();

        res.status(200).json({
            message: "Hospital profile updated successfully",
            hospital
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update hospital profile",
            error: error.message
        });
    }
};


module.exports = {
    createHospital,
    getHospitalProfile,
    updateHospitalProfile
};