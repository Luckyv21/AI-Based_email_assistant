const { google } = require("googleapis");
const Email = require("../models/Email");
const { applyAIToEmail } = require("./aiService");

const getGmailClient = (refreshToken) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        refresh_token: refreshToken
    });

    return google.gmail({
        version: "v1",
        auth: oauth2Client
    });
};
const getGmailMessage = async (gmail, messageId) => {
    const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full"
    });

    return response.data;
};

const sendGmailMessage = async (gmail, { to, cc, bcc, subject, body, threadId, inReplyTo, references }) => {
    const headers = [
        `To: ${to.join(", ")}`,
        ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
        ...(bcc.length ? [`Bcc: ${bcc.join(", ")}`] : []),
        `Subject: ${subject || ""}`,
        "Content-Type: text/plain; charset=UTF-8",
        "MIME-Version: 1.0",
        ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
        ...(references ? [`References: ${references}`] : [])
    ];
    const raw = Buffer.from(`${headers.join("\r\n")}\r\n\r\n${body}`).toString("base64url");
    const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw, ...(threadId ? { threadId } : {}) }
    });

    return response.data;
};

const revokeGmailToken = async (refreshToken) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    await oauth2Client.revokeToken(refreshToken);
};

const getFolderFromLabels = (labels) => {
    if (labels.includes("TRASH")) return "trash";
    if (labels.includes("SPAM")) return "spam";
    if (labels.includes("DRAFT")) return "draft";
    if (labels.includes("SENT")) return "sent";
    return "inbox";
};

const toEmailDocument = (parsedMessage, user) => ({
    sender: user._id,
    receiver: user._id,
    subject: parsedMessage.subject || "",
    body: parsedMessage.body || "",
    isRead: !parsedMessage.labels.includes("UNREAD"),
    isStarred: parsedMessage.labels.includes("STARRED"),
    folder: getFolderFromLabels(parsedMessage.labels),
    provider: "gmail",
    providerMessageId: parsedMessage.gmailMessageId,
    providerThreadId: parsedMessage.threadId,
    providerSender: parsedMessage.sender,
    providerRecipients: parsedMessage.recipients,
    providerLabels: parsedMessage.labels,
    providerDate: parsedMessage.parsedDate,
    attachments: parsedMessage.attachments || []
});

const syncGmailMessages = async ({ user, gmail, parseMessage, EmailModel = Email, maxPages = 100, query = "" }) => {
    let pageToken;
    let fetched = 0;
    let inserted = 0;
    let updated = 0;
    let failed = 0;

    for (let page = 0; page < maxPages; page += 1) {
        const response = await gmail.users.messages.list({
            userId: "me",
            maxResults: 100,
            includeSpamTrash: true,
            pageToken,
            ...(query ? { q: query } : {})
        });
        const messageList = response.data.messages || [];

        const chunkResults = await Promise.allSettled(messageList.map(async (message) => {
            const fullMessage = await getGmailMessage(gmail, message.id);
            const parsedMessage = parseMessage(fullMessage);
            const document = toEmailDocument(parsedMessage, user);
            const existing = await EmailModel.findOne({
                provider: "gmail",
                providerMessageId: parsedMessage.gmailMessageId,
                receiver: user._id
            });

            if (existing) {
                await EmailModel.updateOne({ _id: existing._id }, { $set: document });
                if (!existing.category || existing.category === "Other" || !existing.categoryConfidence) {
                    try {
                        const updatedDoc = EmailModel.findById
                            ? await EmailModel.findById(existing._id)
                            : await EmailModel.findOne({ _id: existing._id });
                        if (updatedDoc) {
                            await applyAIToEmail(updatedDoc, user._id);
                        }
                    } catch (e) {
                        console.error("AI analysis error on existing email:", e.message);
                    }
                }
                return 'updated';
            } else {
                const created = await EmailModel.create(document);
                try {
                    await applyAIToEmail(created, user._id);
                } catch (e) {
                    console.error("AI analysis error on new email:", e.message);
                }
                return 'inserted';
            }
        }));

        for (const result of chunkResults) {
            fetched += 1;
            if (result.status === 'fulfilled') {
                if (result.value === 'updated') updated += 1;
                if (result.value === 'inserted') inserted += 1;
            } else {
                const error = result.reason;
                const status = error.response?.status || error.code;

                if ([401, 403, 429].includes(status) || status >= 500) {
                    throw error;
                }

                if (error.code === 11000) {
                    updated += 1;
                } else {
                    failed += 1;
                }
            }
        }

        pageToken = response.data.nextPageToken;
        if (!pageToken) break;
    }

    return { fetched, inserted, updated, failed };
};

module.exports = {
    getGmailClient,
    getGmailMessage,
    sendGmailMessage,
    revokeGmailToken,
    getFolderFromLabels,
    toEmailDocument,
    syncGmailMessages
};
