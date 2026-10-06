const jwt = require("jsonwebtoken");
const oauth2Client = require("../config/googleAuth");
const User = require("../models/User");
const { revokeGmailToken } = require("../services/gmailService");

const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

// Google Sign-In (no auth required — this is for the Login page)
const googleSignIn = (req, res) => {
    try {
        const state = JSON.stringify({ mode: "signin" });

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
            prompt: "select_account consent",
            state
        });

        res.redirect(authUrl);
    } catch (error) {
        console.error("Google sign-in redirect error:", error);
        res.status(500).json({ message: "Unable to start Google sign-in" });
    }
};

const googleLogin = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        const state = jwt.sign(
            {
                userId: req.user.userId
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m"
            }
        );

        const authUrlOptions = {
            access_type: "offline",
            scope: [
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
            prompt: "select_account consent",
            state
        };

        if (user && user.email) {
            authUrlOptions.login_hint = user.email;
        }

        const authUrl = oauth2Client.generateAuthUrl(authUrlOptions);

        res.redirect(authUrl);

    } catch (error) {
        console.error("Google login error:", error);

        res.status(500).json({
            message: "Unable to start Google authorization"
        });
    }
};

const googleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.redirect(`${frontendOrigin}/login?error=missing_code`);
        }

        const { tokens } = await oauth2Client.getToken(code);

        // Determine if this is a sign-in or a connect flow
        let parsedState;
        try {
            parsedState = JSON.parse(state);
        } catch {
            // Legacy format: state is a JWT (connect flow)
            parsedState = { mode: "connect", jwt: state };
        }

        if (parsedState.mode === "signin") {
            // --- SIGN-IN / SIGN-UP FLOW ---
            // Get the user's Google profile
            oauth2Client.setCredentials(tokens);
            const { google } = require("googleapis");
            const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
            const { data: profile } = await oauth2.userinfo.get();

            // Find or create user
            let user = await User.findOne({ email: profile.email });

            if (!user) {
                // Create a new user from Google profile
                user = await User.create({
                    name: profile.name || profile.email.split("@")[0],
                    email: profile.email,
                    googleId: profile.id,
                    profilePicture: profile.picture || "",
                    google: {
                        connected: true,
                        email: profile.email,
                        refreshToken: tokens.refresh_token || ""
                    }
                });
            } else {
                // Existing user — link Google and save refresh token
                user.googleId = user.googleId || profile.id;
                user.google.connected = true;
                user.google.email = profile.email;
                if (tokens.refresh_token) {
                    user.google.refreshToken = tokens.refresh_token;
                }
                if (profile.picture) {
                    user.profilePicture = profile.picture;
                }
                await user.save();
            }

            // Generate JWT for the frontend
            const appToken = jwt.sign(
                { userId: user._id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            // Redirect to frontend callback page (unprotected)
            return res.redirect(
                `${frontendOrigin}/auth/google/callback?token=${encodeURIComponent(appToken)}&user=${encodeURIComponent(JSON.stringify({ id: user._id, name: user.name, email: user.email, google: { connected: true, email: profile.email } }))}`
            );

        } else {
            // --- CONNECT FLOW (existing user linking Gmail) ---
            const decoded = jwt.verify(parsedState.jwt, process.env.JWT_SECRET);

            const user = await User.findById(decoded.userId);
            if (!user) {
                return res.redirect(`${frontendOrigin}/gmail-connect?error=user_not_found`);
            }

            oauth2Client.setCredentials(tokens);
            const { google: googleApi } = require("googleapis");
            const oauth2 = googleApi.oauth2({ version: "v2", auth: oauth2Client });
            let googleEmail = "";
            try {
                const { data: profile } = await oauth2.userinfo.get();
                googleEmail = profile?.email || "";
            } catch (e) {
                console.warn("Could not fetch Google profile in connect flow:", e.message);
            }

            user.google.connected = true;
            if (googleEmail) {
                user.google.email = googleEmail;
            }
            if (tokens.refresh_token) {
                user.google.refreshToken = tokens.refresh_token;
            }
            await user.save();

            return res.redirect(`${frontendOrigin}/gmail-connect?connected=true`);
        }

    } catch (error) {
        console.error("Google OAuth error:", error);
        return res.redirect(`${frontendOrigin}/login?error=google_authorization_failed`);
    }
};

const disconnectGoogleAccount = async (user, revokeToken = revokeGmailToken) => {
    if (user.google?.refreshToken) {
        try {
            await revokeToken(user.google.refreshToken);
        } catch (error) {
            const status = error.response?.status;
            if (status !== 400 && status !== 401) throw error;
        }
    }

    user.google.connected = false;
    user.google.refreshToken = "";
    await user.save();
};

const disconnectGoogle = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);

        if (!user) return res.status(404).json({ message: "User not found" });

        await disconnectGoogleAccount(user);

        res.status(204).send();
    } catch (error) {
        console.error("Google disconnect error:", error.message);
        res.status(503).json({ message: "Unable to disconnect Google account" });
    }
};

module.exports = {
    googleLogin,
    googleSignIn,
    googleCallback,
    disconnectGoogle,
    disconnectGoogleAccount
};