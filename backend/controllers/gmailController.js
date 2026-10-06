const {
    getGmailClient,
    getGmailMessage,
    sendGmailMessage,
    syncGmailMessages
} = require("../services/gmailService");
const { parseGmailMessage } = require("../utils/gmailParser");
const Email = require("../models/Email");
const User = require("../models/User");
const { applyAIToEmail } = require("../services/aiService");

const getUserWithGmail = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if (!user.google?.connected || !user.google.refreshToken) {
        const error = new Error("Gmail account is not connected");
        error.statusCode = 400;
        throw error;
    }

    return user;
};

const sendGmailError = (error, res) => {
    const status = error.response?.status || error.code;

    if (status === 401 || status === 403) {
        return res.status(401).json({
            message: "Gmail authorization expired or was revoked. Please reconnect Gmail."
        });
    }

    if (status === 429 || status >= 500) {
        return res.status(503).json({
            message: "Gmail is temporarily unavailable. Please try again later."
        });
    }

    return res.status(error.statusCode || 500).json({
        message: error.statusCode ? error.message : "Gmail synchronization failed"
    });
};

const syncGmail = async (req, res) => {
    try {
        const user = await getUserWithGmail(req.user.userId);
        const result = await syncGmailMessages({
            user,
            gmail: getGmailClient(user.google.refreshToken),
            parseMessage: parseGmailMessage,
            query: req.query.q || "",
            maxPages: 2
        });

        res.status(200).json({
            message: "Gmail synchronized successfully",
            ...result
        });
    } catch (error) {
        sendGmailError(error, res);
    }
};

const buildMailboxFilter = (userId, query) => {
    const filter = { $and: [{ $or: [{ receiver: userId }, { sender: userId }] }] };

    if (query.folder) {
        const folders = ["inbox", "sent", "draft", "trash", "spam"];
        if (folders.includes(query.folder)) filter.folder = query.folder;
    }
    if (query.read === "true") filter.isRead = true;
    if (query.read === "false") filter.isRead = false;
    if (query.starred === "true") filter.isStarred = true;
    if (query.starred === "false") filter.isStarred = false;
    if (query.hasEvent === "true") filter.hasEvent = true;

    if (query.priority) {
        const pri = query.priority.trim();
        if (pri.toLowerCase() === "important") {
            filter.$and.push({ priority: { $in: ["Important", "High", "Urgent"] } });
        } else {
            filter.$and.push({ priority: new RegExp(`^${pri}$`, "i") });
        }
    }

    if (query.category) {
        const cat = query.category.trim();
        if (cat.toLowerCase().includes("edu")) {
            filter.$and.push({ category: { $in: ["Education", "College/Education"] } });
        } else if (cat.toLowerCase().includes("office") || cat.toLowerCase().includes("work")) {
            filter.$and.push({ category: { $in: ["Office", "Office/Work"] } });
        } else {
            filter.$and.push({ category: new RegExp(cat, "i") });
        }
    }

    if (query.search?.trim()) {
        const search = query.search.trim().slice(0, 100);
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const expression = new RegExp(escaped, "i");
        filter.$and.push({ $or: [
            { subject: expression },
            { body: expression },
            { providerSender: expression },
            { providerRecipients: expression }
        ] });
    }

    return filter;
};

const getGmailMessages = async (req, res) => {
    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
        const filter = buildMailboxFilter(req.user.userId, req.query);
        const [messages, total] = await Promise.all([
            Email.find(filter)
                .sort({ providerDate: -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Email.countDocuments(filter)
        ]);

        res.status(200).json({
            messages,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        sendGmailError(error, res);
    }
};

const getStoredEmail = async (req, res) => {
    try {
        let email = await Email.findOne({
            _id: req.params.id,
            $or: [{ receiver: req.user.userId }, { sender: req.user.userId }]
        });

        if (!email) return res.status(404).json({ message: "Email not found" });

        // Automatically run AI models if email has not been analyzed yet
        if (!email.categoryConfidence || email.category === "Other") {
            try {
                const analyzed = await applyAIToEmail(email, req.user.userId);
                if (analyzed) email = analyzed;
            } catch (aiErr) {
                console.warn("Auto AI analysis failed on getStoredEmail:", aiErr.message);
            }
        }

        res.status(200).json({ email });
    } catch (error) {
        sendGmailError(error, res);
    }
};

const updateEmailState = (field) => async (req, res) => {
    try {
        const value = req.body[field];

        if (typeof value !== "boolean") {
            return res.status(400).json({ message: `${field} must be a boolean` });
        }

        const email = await Email.findOneAndUpdate(
            {
                _id: req.params.id,
                $or: [{ receiver: req.user.userId }, { sender: req.user.userId }]
            },
            { $set: { [field]: value } },
            { new: true, runValidators: true }
        );

        if (!email) return res.status(404).json({ message: "Email not found" });
        res.status(200).json({ email });
    } catch (error) {
        sendGmailError(error, res);
    }
};

const normalizeAddresses = (value) => {
    const values = Array.isArray(value) ? value : [value];

    return values
        .filter((address) => typeof address === "string")
        .flatMap((address) => address.split(","))
        .map((address) => address.trim())
        .filter(Boolean);
};

const addressFromHeader = (header) => {
    if (!header || typeof header !== "string") return "";
    const match = header.match(/<([^>]+)>/);
    if (match && match[1]) return match[1].trim();
    const emailMatch = header.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) return emailMatch[0].trim();
    return header.trim();
};

const resolveReplyRecipient = (replyMessage, currentUserEmail) => {
    if (!replyMessage) return "";
    const senderEmail = addressFromHeader(replyMessage.providerSender);
    if (currentUserEmail && senderEmail && senderEmail.toLowerCase() === currentUserEmail.toLowerCase()) {
        if (Array.isArray(replyMessage.providerRecipients) && replyMessage.providerRecipients.length > 0) {
            return addressFromHeader(replyMessage.providerRecipients[0]);
        }
    }
    return senderEmail;
};

const persistSentEmail = async ({ user, gmail, sentMessage, input }) => {
    let parsedMessage;

    try {
        parsedMessage = parseGmailMessage(await getGmailMessage(gmail, sentMessage.id));
    } catch (error) {
        parsedMessage = {
            gmailMessageId: sentMessage.id,
            threadId: sentMessage.threadId || input.threadId || "",
            sender: user.email,
            recipients: [...input.to, ...input.cc, ...input.bcc],
            subject: input.subject,
            parsedDate: new Date(),
            body: input.body,
            labels: ["SENT"],
            attachments: []
        };
    }

    const document = {
        sender: user._id,
        receiver: user._id,
        subject: parsedMessage.subject || input.subject,
        body: parsedMessage.body || input.body,
        folder: "sent",
        isRead: true,
        provider: "gmail",
        providerMessageId: parsedMessage.gmailMessageId,
        providerThreadId: parsedMessage.threadId || input.threadId || "",
        providerSender: parsedMessage.sender || user.email,
        providerRecipients: parsedMessage.recipients.length
            ? parsedMessage.recipients
            : [...input.to, ...input.cc, ...input.bcc],
        providerLabels: parsedMessage.labels.length ? parsedMessage.labels : ["SENT"],
        providerDate: parsedMessage.parsedDate || new Date(),
        attachments: parsedMessage.attachments || []
    };

    return Email.findOneAndUpdate(
        { provider: "gmail", providerMessageId: document.providerMessageId },
        { $set: document },
        { new: true, upsert: true, runValidators: true }
    );
};

const sendEmailThroughGmail = async (req, res, replyMessage = null) => {
    try {
        const user = await getUserWithGmail(req.user.userId);
        let defaultTo = "";
        if (replyMessage) {
            defaultTo = resolveReplyRecipient(replyMessage, user.email);
        }

        const to = normalizeAddresses(req.body.to || defaultTo);
        const cc = normalizeAddresses(req.body.cc);
        const bcc = normalizeAddresses(req.body.bcc);
        const body = typeof req.body.body === "string" ? req.body.body : "";

        if (!to.length || !body.trim()) {
            return res.status(400).json({ message: "Recipient and message body are required" });
        }

        let subject = req.body.subject;
        if (!subject && replyMessage) {
            const orig = replyMessage.subject || "";
            subject = /^re:/i.test(orig) ? orig : `Re: ${orig}`.trim();
        }

        const input = {
            to,
            cc,
            bcc,
            subject: subject || "(no subject)",
            body,
            threadId: req.body.threadId || replyMessage?.providerThreadId,
            inReplyTo: req.body.inReplyTo || replyMessage?.providerMessageId,
            references: req.body.references || replyMessage?.providerMessageId || ""
        };
        const gmail = getGmailClient(user.google.refreshToken);
        const sentMessage = await sendGmailMessage(gmail, input);
        const email = await persistSentEmail({ user, gmail, sentMessage, input });

        return res.status(201).json({ message: "Reply sent successfully", email });
    } catch (error) {
        return sendGmailError(error, res);
    }
};

const sendGmailEmail = (req, res) => sendEmailThroughGmail(req, res);

const replyToGmailMessage = async (req, res) => {
    try {
        const replyMessage = await Email.findOne({
            _id: req.params.id,
            $or: [{ receiver: req.user.userId }, { sender: req.user.userId }]
        });

        if (!replyMessage) return res.status(404).json({ message: "Email not found" });
        return sendEmailThroughGmail(req, res, replyMessage);
    } catch (error) {
        return sendGmailError(error, res);
    }
};

const analyzeEmailMessage = async (req, res) => {
    try {
        const email = await Email.findOne({
            _id: req.params.id,
            $or: [{ receiver: req.user.userId }, { sender: req.user.userId }]
        });

        if (!email) {
            return res.status(404).json({ message: "Email not found" });
        }

        const analyzed = await applyAIToEmail(email, req.user.userId);
        return res.status(200).json({
            message: "Email analyzed successfully with AI models",
            email: analyzed
        });
    } catch (error) {
        console.error("AI analysis error:", error);
        return res.status(500).json({ message: "Failed to analyze email" });
    }
};

module.exports = {
    syncGmail,
    buildMailboxFilter,
    sendGmailEmail,
    replyToGmailMessage,
    getGmailMessages,
    getStoredEmail,
    analyzeEmailMessage,
    markEmailRead: updateEmailState("isRead"),
    starEmail: updateEmailState("isStarred")
};