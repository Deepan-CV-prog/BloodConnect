const User = require("../models/User");
const Donor = require("../models/Donor");
const Hospital = require("../models/Hospital");
const BloodUnit = require("../models/BloodUnit");
const BloodRequest = require("../models/BloodRequest");
const Donation = require("../models/Donation");
const DonationAppointment = require("../models/DonationAppointment");
const Allocation = require("../models/Allocation");
const Issuance = require("../models/Issuance");
const Traceability = require("../models/Traceability");

/**
 * GET /api/admin/overview
 * Real database-backed metrics and operational summary
 */
const getAdminOverview = async (req, res) => {
    try {
        const [
            totalUsers,
            roleStats,
            userStatusStats,
            totalDonors,
            donorEligibilityStats,
            totalBloodUnits,
            availableBloodUnits,
            testingUnits,
            testingBreakdown,
            inventoryStatusBreakdown,
            availableByGroup,
            totalByGroup,
            totalRequests,
            activeRequests,
            emergencyRequests,
            requestStatusBreakdown,
            totalAppointments,
            pendingAppointments,
            appointmentStatusBreakdown,
            totalDonations,
            collectedDonations,
            totalIssuances,
            recentRequests,
            recentDonations,
            recentIssuances,
            recentTraceability
        ] = await Promise.all([
            // User counts
            User.countDocuments(),
            User.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } }
            ]),
            User.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            // Donor counts
            Donor.countDocuments(),
            Donor.aggregate([
                { $group: { _id: "$eligibilityStatus", count: { $sum: 1 } } }
            ]),

            // Blood unit counts
            BloodUnit.countDocuments(),
            BloodUnit.countDocuments({ inventoryStatus: "available", testingStatus: "approved" }),
            BloodUnit.countDocuments({ testingStatus: "pending" }),
            BloodUnit.aggregate([
                { $group: { _id: "$testingStatus", count: { $sum: 1 } } }
            ]),
            BloodUnit.aggregate([
                { $group: { _id: "$inventoryStatus", count: { $sum: 1 } } }
            ]),
            BloodUnit.aggregate([
                { $match: { inventoryStatus: "available", testingStatus: "approved" } },
                { $group: { _id: "$bloodGroup", count: { $sum: 1 } } }
            ]),
            BloodUnit.aggregate([
                { $group: { _id: "$bloodGroup", count: { $sum: 1 } } }
            ]),

            // Hospital request counts
            BloodRequest.countDocuments(),
            BloodRequest.countDocuments({ status: { $nin: ["completed", "rejected", "cancelled"] } }),
            BloodRequest.countDocuments({ priority: "emergency", status: { $nin: ["completed", "rejected", "cancelled"] } }),
            BloodRequest.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            // Appointment counts
            DonationAppointment.countDocuments(),
            DonationAppointment.countDocuments({ status: "pending" }),
            DonationAppointment.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]),

            // Donation counts
            Donation.countDocuments(),
            Donation.countDocuments({ status: "collected" }),

            // Issuance counts
            Issuance.countDocuments(),

            // Recent activity lists
            BloodRequest.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("hospitalId", "name email phone location"),

            Donation.find()
                .sort({ donationDate: -1, createdAt: -1 })
                .limit(5)
                .populate({ path: "donorId", populate: { path: "userId", select: "name email phone" } })
                .populate("staffId", "name"),

            Issuance.find()
                .sort({ issuedDate: -1, createdAt: -1 })
                .limit(5)
                .populate({
                    path: "allocationId",
                    populate: [
                        { path: "unitId", select: "unitId bloodGroup" },
                        { path: "requestId", select: "requestId hospitalId", populate: { path: "hospitalId", select: "name" } }
                    ]
                })
                .populate("issuedBy", "name"),

            Traceability.find()
                .sort({ performedAt: -1, createdAt: -1 })
                .limit(6)
                .populate("bloodUnitId", "unitId bloodGroup")
                .populate("performedBy", "name")
        ]);

        // Format role counts into an object
        const roles = { donor: 0, staff: 0, hospital: 0, admin: 0 };
        roleStats.forEach(r => {
            if (r._id) roles[r._id] = r.count;
        });

        const userStatuses = { active: 0, inactive: 0 };
        userStatusStats.forEach(s => {
            if (s._id) userStatuses[s._id] = s.count;
        });

        // Format donor eligibility
        const donorEligibility = { eligible: 0, ineligible: 0, pending: 0 };
        donorEligibilityStats.forEach(e => {
            if (e._id) donorEligibility[e._id] = e.count;
        });

        // Format standard blood groups
        const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
        const inventoryByGroup = {};
        const totalUnitsByGroup = {};
        bloodGroups.forEach(bg => {
            inventoryByGroup[bg] = 0;
            totalUnitsByGroup[bg] = 0;
        });

        availableByGroup.forEach(g => {
            if (g._id && inventoryByGroup.hasOwnProperty(g._id)) {
                inventoryByGroup[g._id] = g.count;
            }
        });

        totalByGroup.forEach(g => {
            if (g._id && totalUnitsByGroup.hasOwnProperty(g._id)) {
                totalUnitsByGroup[g._id] = g.count;
            }
        });

        // Format testing & inventory breakdowns
        const testingStats = { pending: 0, approved: 0, rejected: 0 };
        testingBreakdown.forEach(t => {
            if (t._id) testingStats[t._id] = t.count;
        });

        const inventoryStats = {
            not_released: 0,
            available: 0,
            allocated: 0,
            issued: 0,
            expired: 0,
            discarded: 0
        };
        inventoryStatusBreakdown.forEach(i => {
            if (i._id) inventoryStats[i._id] = i.count;
        });

        // Format request status breakdown
        const requestStatuses = {
            pending: 0,
            approved: 0,
            partially_allocated: 0,
            allocated: 0,
            rejected: 0,
            completed: 0,
            cancelled: 0
        };
        requestStatusBreakdown.forEach(rs => {
            if (rs._id) requestStatuses[rs._id] = rs.count;
        });

        // Format appointment status breakdown
        const appointmentStatuses = {
            pending: 0,
            approved: 0,
            completed: 0,
            cancelled: 0,
            rejected: 0
        };
        appointmentStatusBreakdown.forEach(as => {
            if (as._id) appointmentStatuses[as._id] = as.count;
        });

        res.status(200).json({
            message: "Admin overview fetched successfully",
            overview: {
                users: {
                    total: totalUsers,
                    roles,
                    status: userStatuses
                },
                donors: {
                    total: totalDonors,
                    eligibility: donorEligibility
                },
                bloodUnits: {
                    total: totalBloodUnits,
                    available: availableBloodUnits,
                    testing: testingUnits,
                    testingBreakdown: testingStats,
                    inventoryStatusBreakdown: inventoryStats,
                    inventoryByGroup,
                    totalUnitsByGroup
                },
                requests: {
                    total: totalRequests,
                    active: activeRequests,
                    emergency: emergencyRequests,
                    statuses: requestStatuses
                },
                appointments: {
                    total: totalAppointments,
                    pending: pendingAppointments,
                    statuses: appointmentStatuses
                },
                donations: {
                    total: totalDonations,
                    collected: collectedDonations
                },
                issuances: {
                    total: totalIssuances
                },
                recentActivity: {
                    requests: recentRequests,
                    donations: recentDonations,
                    issuances: recentIssuances,
                    traceability: recentTraceability
                }
            }
        });

    } catch (error) {
        console.error("Admin overview error:", error.message);
        res.status(500).json({
            message: "Failed to fetch admin overview metrics",
            error: error.message
        });
    }
};

/**
 * GET /api/admin/users
 * Searchable, filterable list of registered users (excluding sensitive password hash)
 */
const getAdminUsers = async (req, res) => {
    try {
        const { search, role, status } = req.query;

        const query = {};

        if (role && role !== "all") {
            query.role = role;
        }

        if (status && status !== "all") {
            query.status = status;
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [
                { name: regex },
                { email: regex },
                { phone: regex }
            ];
        }

        const users = await User.find(query, "-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Users fetched successfully",
            total: users.length,
            users
        });

    } catch (error) {
        console.error("Admin fetch users error:", error.message);
        res.status(500).json({
            message: "Failed to fetch users",
            error: error.message
        });
    }
};

/**
 * PUT /api/admin/users/:id/status
 * Safe toggle of user account status (active / inactive)
 */
const updateUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !["active", "inactive"].includes(status)) {
            return res.status(400).json({
                message: "Status must be either 'active' or 'inactive'"
            });
        }

        // Security check: Admin cannot deactivate their own account
        if (req.user && req.user.id === id && status === "inactive") {
            return res.status(400).json({
                message: "Administrators cannot deactivate their own account"
            });
        }

        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.status = status;
        await user.save();

        res.status(200).json({
            message: `User status updated to ${status}`,
            user
        });

    } catch (error) {
        console.error("Admin update user status error:", error.message);
        res.status(500).json({
            message: "Failed to update user status",
            error: error.message
        });
    }
};

module.exports = {
    getAdminOverview,
    getAdminUsers,
    updateUserStatus
};
