const assert = require("node:assert/strict");
const test = require("node:test");

const {
    getFolderFromLabels,
    sendGmailMessage,
    syncGmailMessages
} = require("../services/gmailService");
const { buildMailboxFilter } = require("../controllers/gmailController");
const { disconnectGoogleAccount } = require("../controllers/googleAuthController");
const { parseGmailMessage } = require("../utils/gmailParser");
const protect = require("../middleware/authMiddleware");

const encoded = (text) => Buffer.from(text).toString("base64url");

const message = (id, body, labels = ["INBOX"]) => ({
    id,
    threadId: `thread-${id}`,
    labelIds: labels,
    payload: {
        headers: [
            { name: "From", value: "sender@example.com" },
            { name: "To", value: "recipient@example.com" },
            { name: "Subject", value: `Subject ${id}` },
            { name: "Date", value: "Wed, 27 Aug 2026 10:00:00 +0000" }
        ],
        mimeType: "text/plain",
        body: { data: encoded(body) }
    }
});

const createEmailModel = () => {
    const documents = new Map();

    return {
        documents,
        async findOne(filter) {
            return documents.get(filter.providerMessageId) || null;
        },
        async create(document) {
            documents.set(document.providerMessageId, {
                _id: `email-${document.providerMessageId}`,
                ...document
            });
        },
        async updateOne(filter, update) {
            const document = [...documents.values()].find(
                (item) => item._id === filter._id
            );
            Object.assign(document, update.$set);
        }
    };
};

test("parses plain text, recipients, dates, and malformed messages safely", () => {
    const parsed = parseGmailMessage(message("one", "hello"));

    assert.equal(parsed.body, "hello");
    assert.deepEqual(parsed.recipients, ["recipient@example.com"]);
    assert.equal(parsed.gmailMessageId, "one");
    assert.equal(parsed.threadId, "thread-one");
    assert.ok(parsed.parsedDate instanceof Date);
    assert.equal(parseGmailMessage(null).body, "");
});

test("decodes MIME headers and converts HTML bodies to readable text", () => {
    const parsed = parseGmailMessage({
        id: "html-one",
        threadId: "thread-html",
        payload: {
            headers: [
                { name: "From", value: "=?UTF-8?B?Sm9obiBTbWl0aA==?= <john@example.com>" },
                { name: "To", value: "you@example.com" },
                { name: "Subject", value: "=?UTF-8?Q?Project=20update?=" }
            ],
            mimeType: "text/html",
            body: { data: encoded("<html><style>.x{display:none}</style><p>Hello &amp; welcome</p><p>View <a href='https://example.com'>details</a>.</p></html>") }
        }
    });

    assert.equal(parsed.sender, "John Smith <john@example.com>");
    assert.equal(parsed.subject, "Project update");
    assert.match(parsed.body, /Hello & welcome/);
    assert.match(parsed.body, /View details\./);
    assert.doesNotMatch(parsed.body, /style|<p>|<a /i);
});

test("sync follows Gmail pagination and is idempotent", async () => {
    const pages = [
        { messages: [{ id: "one" }], nextPageToken: "next" },
        { messages: [{ id: "two" }] }
    ];
    const calls = [];
    const listOptions = [];
    const gmail = {
        users: {
            messages: {
                async list(options) {
                    calls.push(options.pageToken || "first");
                    listOptions.push(options);
                    return { data: options.pageToken ? pages[1] : pages[0] };
                },
                async get(options) {
                    return { data: message(options.id, `body ${options.id}`) };
                }
            }
        }
    };
    const EmailModel = createEmailModel();
    const user = { _id: "user-one" };

    const first = await syncGmailMessages({
        user,
        gmail,
        parseMessage: parseGmailMessage,
        EmailModel
    });
    const second = await syncGmailMessages({
        user,
        gmail,
        parseMessage: parseGmailMessage,
        EmailModel
    });

    assert.deepEqual(first, { fetched: 2, inserted: 2, updated: 0, failed: 0 });
    assert.deepEqual(second, { fetched: 2, inserted: 0, updated: 2, failed: 0 });
    assert.equal(EmailModel.documents.size, 2);
    assert.deepEqual(calls, ["first", "next", "first", "next"]);
    assert.equal(listOptions[0].includeSpamTrash, true);
});

test("authentication middleware rejects missing credentials", () => {
    let statusCode;
    let responseBody;
    const response = {
        status(code) {
            statusCode = code;
            return this;
        },
        json(body) {
            responseBody = body;
        }
    };

    protect({ headers: {}, query: {} }, response, () => {
        throw new Error("next should not be called");
    });

    assert.equal(statusCode, 401);
    assert.equal(responseBody.message, "Not authorized. Please login.");
});

test("maps Gmail folders and builds safe search filters", () => {
    assert.equal(getFolderFromLabels(["INBOX"]), "inbox");
    assert.equal(getFolderFromLabels(["SENT"]), "sent");
    assert.equal(getFolderFromLabels(["SPAM"]), "spam");
    assert.equal(getFolderFromLabels(["TRASH"]), "trash");

    const filter = buildMailboxFilter("user-one", {
        folder: "spam",
        read: "false",
        starred: "true",
        search: "quarterly"
    });

    assert.deepEqual(filter.folder, "spam");
    assert.equal(filter.isRead, false);
    assert.equal(filter.isStarred, true);
    assert.equal(filter.$and.length, 2);
});

test("sends a raw Gmail message and preserves reply threading", async () => {
    let sendOptions;
    const gmail = {
        users: {
            messages: {
                async send(options) {
                    sendOptions = options;
                    return { data: { id: "sent-one", threadId: "thread-one" } };
                }
            }
        }
    };

    const result = await sendGmailMessage(gmail, {
        to: ["recipient@example.com"],
        cc: [],
        bcc: [],
        subject: "Re: Meeting",
        body: "Reply body",
        threadId: "thread-one",
        inReplyTo: "original-one",
        references: "original-one"
    });
    const raw = Buffer.from(sendOptions.requestBody.raw, "base64url").toString();

    assert.equal(result.id, "sent-one");
    assert.equal(sendOptions.requestBody.threadId, "thread-one");
    assert.match(raw, /In-Reply-To: original-one/);
    assert.match(raw, /References: original-one/);
    assert.match(raw, /Reply body/);
});

test("disconnect revokes Gmail access and clears stored connection state", async () => {
    const user = {
        google: { connected: true, refreshToken: "refresh-token" },
        async save() {
            this.saved = true;
        }
    };
    let revokedToken;

    await disconnectGoogleAccount(user, async (token) => {
        revokedToken = token;
    });

    assert.equal(revokedToken, "refresh-token");
    assert.equal(user.google.connected, false);
    assert.equal(user.google.refreshToken, "");
    assert.equal(user.saved, true);
});
