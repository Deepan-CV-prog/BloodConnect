const DonorAlert = require("../models/DonorAlert");
const BloodRequest = require("../models/BloodRequest");
const Donor = require("../models/Donor");
const BloodUnit = require("../models/BloodUnit");
const Hospital = require("../models/Hospital");
const User = require("../models/User");
const { evaluateDonorEligibility, formatEligibleDate } = require("../utils/donorEligibility");

// Staff / Admin: Find eligible donors for a hospital blood request
const findMatchingDonors = async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await BloodRequest.findById(requestId).populate("hospitalId", "name address contactPerson phone");
        if (!request) {
            return res.status(404).json({ message: "Hospital blood request not found" });
        }

        // Count available suitable inventory (tested passed & available)
        const availableInventory = await BloodUnit.countDocuments({
            bloodGroup: request.bloodGroup,
            testingStatus: "passed",
            inventoryStatus: "available"
        });

        // Find all registered donors matching the requested blood group
        const donors = await Donor.find({ bloodGroup: request.bloodGroup })
            .populate("userId", "name email phone status");

        // Find existing alerts for this request to prevent duplicate alerting
        const existingAlerts = await DonorAlert.find({ requestId: request._id });
        const alertMap = new Map();
        existingAlerts.forEach((alert) => {
            alertMap.set(alert.donorId.toString(), alert);
        });

        const matchingEligibleDonors = [];
        const excludedDonors = [];

        for (const donor of donors) {
            const isUserActive = donor.userId && donor.userId.status !== "inactive";
            const evalResult = await evaluateDonorEligibility(donor);
            const isEligible = isUserActive && evalResult.isEligible;

            const existingAlert = alertMap.get(donor._id.toString());
            const donorInfo = {
                id: donor._id,
                name: donor.userId ? donor.userId.name : "Unknown Donor",
                email: donor.userId ? donor.userId.email : "",
                phone: donor.phone || (donor.userId ? donor.userId.phone : ""),
                bloodGroup: donor.bloodGroup,
                eligibilityStatus: evalResult.eligibilityStatus,
                lastDonationDate: evalResult.lastDonationDate,
                nextEligibleDate: evalResult.nextEligibleDate,
                formattedNextEligibleDate: evalResult.formattedNextEligibleDate,
                isDeferred: evalResult.isDeferred,
                totalDonations: donor.totalDonations,
                alreadyAlerted: !!existingAlert,
                alertStatus: existingAlert ? existingAlert.status : null,
                alertSentAt: existingAlert ? existingAlert.sentAt : null,
                respondedAt: existingAlert ? existingAlert.respondedAt : null,
                responseNote: existingAlert ? existingAlert.responseNote : ""
            };

            if (isEligible) {
                matchingEligibleDonors.push(donorInfo);
            } else {
                let reason = "Ineligible";
                if (!isUserActive) {
                    reason = "Account inactive";
                } else if (evalResult.isDeferred) {
                    reason = evalResult.deferralReason || `In 3-month deferral period until ${evalResult.formattedNextEligibleDate}`;
                } else if (evalResult.eligibilityStatus !== "eligible") {
                    reason = `Status is ${evalResult.eligibilityStatus}`;
                }

                excludedDonors.push({
                    ...donorInfo,
                    exclusionReason: reason
                });
            }
        }

        const shortage = Math.max(0, request.quantity - availableInventory);

        res.status(200).json({
            request: {
                id: request._id,
                requestId: request.requestId,
                bloodGroup: request.bloodGroup,
                quantity: request.quantity,
                priority: request.priority,
                status: request.status,
                requiredDate: request.requiredDate,
                requestDate: request.requestDate,
                hospital: request.hospitalId
            },
            inventory: {
                availableUnits: availableInventory,
                requestedQuantity: request.quantity,
                shortage,
                isInsufficient: availableInventory < request.quantity
            },
            matchingEligibleDonors,
            excludedDonors,
            metrics: {
                totalMatchingBloodGroup: donors.length,
                eligibleCount: matchingEligibleDonors.length,
                unalertedCount: matchingEligibleDonors.filter((d) => !d.alreadyAlerted).length,
                alreadyAlertedCount: matchingEligibleDonors.filter((d) => d.alreadyAlerted).length,
                excludedCount: excludedDonors.length
            }
        });

    } catch (error) {
        console.error("Find matching donors error:", error.message);
        res.status(500).json({ message: "Failed to find matching donors", error: error.message });
    }
};

// Staff / Admin: Send emergency alerts to eligible donors
const sendEmergencyAlerts = async (req, res) => {
    try {
        const { requestId, donorIds } = req.body;

        if (!requestId) {
            return res.status(400).json({ message: "Request ID is required" });
        }

        const request = await BloodRequest.findById(requestId).populate("hospitalId", "name address");
        if (!request) {
            return res.status(404).json({ message: "Hospital blood request not found" });
        }

        if (["completed", "rejected", "cancelled"].includes(request.status)) {
            return res.status(400).json({
                message: `Cannot send alerts for a request with status '${request.status}'`
            });
        }

        // Query donors to alert
        const query = { bloodGroup: request.bloodGroup };
        if (Array.isArray(donorIds) && donorIds.length > 0) {
            query._id = { $in: donorIds };
        }

        const donors = await Donor.find(query).populate("userId", "name email phone status");

        // Filter strictly for eligible, non-deferred donors
        // Filter strictly for eligible, non-deferred donors using single source of truth
        const evaluatedDonors = await Promise.all(
            donors.map(async (d) => {
                const isUserActive = d.userId && d.userId.status !== "inactive";
                const evalResult = await evaluateDonorEligibility(d);
                return {
                    donor: d,
                    isEligible: isUserActive && evalResult.isEligible
                };
            })
        );

        const eligibleDonors = evaluatedDonors
            .filter((item) => item.isEligible)
            .map((item) => item.donor);

        if (eligibleDonors.length === 0) {
            return res.status(400).json({
                message: "No eligible donors found matching the criteria"
            });
        }

        // Find existing alerts to prevent duplicates
        const existingAlerts = await DonorAlert.find({
            requestId: request._id,
            donorId: { $in: eligibleDonors.map((d) => d._id) }
        });

        const alreadyAlertedIds = new Set(existingAlerts.map((a) => a.donorId.toString()));
        const unalertedDonors = eligibleDonors.filter(
            (d) => !alreadyAlertedIds.has(d._id.toString())
        );

        if (unalertedDonors.length === 0) {
            return res.status(400).json({
                message: "All selected eligible donors have already been alerted for this request"
            });
        }

        const alertsToInsert = unalertedDonors.map((donor) => ({
            requestId: request._id,
            donorId: donor._id,
            bloodGroup: request.bloodGroup,
            urgency: request.priority === "emergency" ? "emergency" : "normal",
            status: "sent",
            sentBy: req.user.id,
            sentAt: new Date()
        }));

        const createdAlerts = await DonorAlert.insertMany(alertsToInsert);

        // Real-time notification via Socket.IO
        const io = req.app.get("io");
        if (io) {
            io.emit("emergencyAlertCreated", {
                requestId: request._id,
                bloodGroup: request.bloodGroup,
                priority: request.priority,
                count: createdAlerts.length,
                hospitalName: request.hospitalId ? request.hospitalId.name : "Hospital"
            });
        }

        res.status(201).json({
            message: `Successfully sent emergency alert to ${createdAlerts.length} eligible donor(s)`,
            count: createdAlerts.length,
            alerts: createdAlerts
        });

    } catch (error) {
        console.error("Send emergency alerts error:", error.message);
        res.status(500).json({ message: "Failed to send emergency alerts", error: error.message });
    }
};

// Staff / Admin: Get all alerts and responses for a request
const getRequestAlerts = async (req, res) => {
    try {
        const { requestId } = req.params;

        const alerts = await DonorAlert.find({ requestId })
            .populate({
                path: "donorId",
                populate: { path: "userId", select: "name email phone" }
            })
            .populate("sentBy", "name email role")
            .sort({ sentAt: -1 });

        res.status(200).json({ alerts });

    } catch (error) {
        console.error("Get request alerts error:", error.message);
        res.status(500).json({ message: "Failed to fetch request alerts", error: error.message });
    }
};

// Donor: Get all alerts addressed to the authenticated donor
const getMyAlerts = async (req, res) => {
    try {
        const donor = await Donor.findOne({ userId: req.user.id });
        if (!donor) {
            return res.status(200).json({ alerts: [] });
        }

        const alerts = await DonorAlert.find({ donorId: donor._id })
            .populate({
                path: "requestId",
                populate: { path: "hospitalId", select: "name address contactPerson phone" }
            })
            .sort({ sentAt: -1 });

        const evalResult = await evaluateDonorEligibility(donor);

        res.status(200).json({
            alerts,
            donorEligibility: {
                isEligible: evalResult.isEligible,
                isDeferred: evalResult.isDeferred,
                eligibilityStatus: evalResult.eligibilityStatus,
                nextEligibleDate: evalResult.nextEligibleDate,
                formattedNextEligibleDate: evalResult.formattedNextEligibleDate,
                deferralReason: evalResult.deferralReason
            }
        });

    } catch (error) {
        console.error("Get donor alerts error:", error.message);
        res.status(500).json({ message: "Failed to fetch donor alerts", error: error.message });
    }
};

// Donor: Respond "available" or "unavailable" to an alert
const respondToAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        const { response, note } = req.body;

        if (!response || !["available", "unavailable"].includes(response.toLowerCase())) {
            return res.status(400).json({
                message: "Response must be either 'available' or 'unavailable'"
            });
        }

        const donor = await Donor.findOne({ userId: req.user.id });
        if (!donor) {
            return res.status(404).json({ message: "Donor profile not found" });
        }

        const alert = await DonorAlert.findById(alertId);
        if (!alert) {
            return res.status(404).json({ message: "Alert not found" });
        }

        if (alert.donorId.toString() !== donor._id.toString()) {
            return res.status(403).json({ message: "Access denied. This alert was not issued to you." });
        }

        alert.status = response.toLowerCase();
        alert.responseNote = note ? note.trim() : "";
        alert.respondedAt = new Date();
        await alert.save();

        // Real-time update to blood bank staff
        const io = req.app.get("io");
        if (io) {
            io.emit("donorAlertResponded", {
                alertId: alert._id,
                requestId: alert.requestId,
                donorId: donor._id,
                status: alert.status,
                respondedAt: alert.respondedAt
            });
        }

        res.status(200).json({
            message: `Response recorded: marked as ${alert.status}`,
            alert
        });

    } catch (error) {
        console.error("Respond to alert error:", error.message);
        res.status(500).json({ message: "Failed to record response", error: error.message });
    }
};

module.exports = {
    findMatchingDonors,
    sendEmergencyAlerts,
    getRequestAlerts,
    getMyAlerts,
    respondToAlert
};
