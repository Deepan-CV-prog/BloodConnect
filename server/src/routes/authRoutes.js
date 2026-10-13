const express = require("express");
const { register, login, changePassword } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/change-password", protect, changePassword);
router.get("/me", protect, async (req, res) => {
    res.status(200).json({
        message: "You are authenticated",
        user: req.user
    });
});
router.get("/donor-test", protect, authorize("donor"), (req, res) => {
    res.json({
        message: "Donor access granted",
        user: req.user
    });
});

router.get("/staff-test", protect, authorize("staff", "admin"), (req, res) => {
    res.json({
        message: "Staff/Admin access granted",
        user: req.user
    });
});
module.exports = router;