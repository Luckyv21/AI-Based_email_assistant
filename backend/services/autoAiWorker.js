const Email = require("../models/Email");
const { applyAIToEmail } = require("./aiService");
const { deleteEndedEvents } = require("./eventService");

let isRunning = false;
let workerTimer = null;
let lastCleanupTime = 0;

const processBatch = async (batchSize = 5) => {
    if (isRunning) return;
    isRunning = true;

    try {
        // Run ended events auto-cleanup every 30 seconds
        const now = Date.now();
        if (now - lastCleanupTime > 30000) {
            lastCleanupTime = now;
            await deleteEndedEvents();
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
