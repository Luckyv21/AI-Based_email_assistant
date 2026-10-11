const express = require("express");
const rateLimit = require("express-rate-limit");
const protect = require("../middleware/authMiddleware");

const { registerUser, loginUser, getMe, updateProfile } = require("../controllers/authController");

const {
    googleLogin,
    googleSignIn,
    googleCallback,
    disconnectGoogle
} = require("../controllers/googleAuthController");

const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many authentication attempts. Please try again later."
    }
});

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

router.get("/google/signin", googleSignIn);       // No auth — Login page
router.get("/google", protect, googleLogin);       // Auth required — Connect page
router.get("/google/callback", googleCallback);
router.delete("/google", protect, disconnectGoogle);

console.log("✅ Auth routes loaded");

module.exports = router;