const Email = require("../models/Email");
const User = require("../models/User");
const { applyAIToEmail } = require("./aiService");
const { deleteEndedEvents, checkAndTriggerEventReminders } = require("./eventService");
const { getGmailClient, syncGmailMessages } = require("./gmailService");
const { parseGmailMessage } = require("../utils/gmailParser");

let isRunning = false;
let workerTimer = null;
let lastCleanupTime = 0;
let lastBackgroundSync = 0;

const processBatch = async (batchSize = 2) => {
    if (isRunning) return;
    isRunning = true;

    try {
        const now = Date.now();

        // 1. Run background Gmail sync for connected users every 25 seconds
        if (now - lastBackgroundSync > 25000) {
            lastBackgroundSync = now;
            try {
                const connectedUsers = await User.find({
                    "google.connected": true,
                    "google.refreshToken": { $exists: true, $ne: "" }
                }).limit(5);

                for (const u of connectedUsers) {
                    try {
                        await syncGmailMessages({
                            user: u,
                            gmail: getGmailClient(u.google.refreshToken),
                            parseMessage: parseGmailMessage,
                            maxPages: 1,
                            maxResults: 15
                        });
                    } catch (e) {
                        // Silent in background
                    }
                }
            } catch (err) {
                // Ignore background query errors
            }
        }

        // 2. Run ended events auto-cleanup and reminder checks every 30 seconds
        if (now - lastCleanupTime > 30000) {
            lastCleanupTime = now;
            await deleteEndedEvents();
            await checkAndTriggerEventReminders();
        }

        const unanalyzedEmails = await Email.find({
            $or: [
                { categoryConfidence: { $lte: 0 } },
                { categoryConfidence: { $exists: false } }
            ]
        })
            .sort({ providerDate: -1, createdAt: -1 })
            .limit(batchSize);

        if (!unanalyzedEmails.length) {
            return;
        }

        for (const email of unanalyzedEmails) {
            try {
                const targetUserId = email.receiver || email.sender;
                await applyAIToEmail(email, targetUserId);
            } catch (err) {
                console.error(`Auto AI worker failed on email ${email._id}:`, err.message);
                // Mark with nominal confidence to prevent repeated failures
                await Email.updateOne(
                    { _id: email._id },
                    { $set: { categoryConfidence: 0.001 } }
                );
            }
        }
    } catch (error) {
        console.error("Auto AI worker batch error:", error.message);
    } finally {
        isRunning = false;
    }
};

const startAutoAiWorker = ({ intervalMs = 4000, batchSize = 5 } = {}) => {
    if (workerTimer) return;

    console.log("🤖 Automatic AI Analysis Worker started");
    // Run first batch promptly
    setTimeout(() => processBatch(batchSize), 1000);

    workerTimer = setInterval(() => {
        processBatch(batchSize);
    }, intervalMs);
};

const stopAutoAiWorker = () => {
    if (workerTimer) {
        clearInterval(workerTimer);
        workerTimer = null;
        console.log("Auto AI Analysis Worker stopped");
    }
};

module.exports = {
    startAutoAiWorker,
    stopAutoAiWorker,
    processBatch
};
