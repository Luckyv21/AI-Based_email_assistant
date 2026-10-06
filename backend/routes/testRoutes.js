const express = require("express");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/protected", protect, (req, res) => {
    res.json({
        message: "You accessed a protected route 🎉",
        user: req.user
    });
});

module.exports = router;