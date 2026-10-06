const quotedPrintable = require("quoted-printable");

const decodeBase64 = (data) => {
    if (!data) {
        return "";
    }

    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

    return Buffer.from(padded, "base64").toString("utf-8");
};

const decodeBody = (data, transferEncoding = "") => {
    if (!data) {
        return "";
    }

    let text = decodeBase64(data);

    if (transferEncoding.toLowerCase() === "quoted-printable") {
        text = quotedPrintable.decode(text);
    }

    return text;
};

const decodeMimeWord = (value) => {
    if (!value) return "";

    return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]+)\?=/g, (match, charset, encoding, content) => {
        try {
            const encoded = encoding.toLowerCase() === "b"
                ? Buffer.from(content, "base64")
                : Buffer.from(content.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))), "binary");

            return new TextDecoder(charset).decode(encoded);
        } catch (error) {
            return content;
        }
    });
};

const decodeHtmlEntities = (value) => value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const htmlToText = (html) => decodeHtmlEntities(
    html
        .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, "")
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();

const getHeader = (headers, name) => {
    const header = headers?.find(
        (item) => item.name.toLowerCase() === name.toLowerCase()
    );

    return header ? decodeMimeWord(header.value) : "";
};

const collectAttachments = (payload, attachments = []) => {
    if (!payload) return attachments;

    if (payload.filename && payload.body?.attachmentId) {
        attachments.push({
            filename: payload.filename,
            mimetype: payload.mimeType || "application/octet-stream",
            size: payload.body.size || 0,
            providerAttachmentId: payload.body.attachmentId
        });
    }

    for (const part of payload.parts || []) {
        collectAttachments(part, attachments);
    }

    return attachments;
};

const extractBody = (payload) => {
    if (!payload) {
        return "";
    }

    if (payload.parts?.length) {
        const textPart = payload.parts.find((part) => part.mimeType === "text/plain");
        const htmlPart = payload.parts.find((part) => part.mimeType === "text/html");

        for (const part of [textPart, htmlPart, ...payload.parts]) {
            const body = extractBody(part);

            if (body) return body;
        }
    }

    const transferEncoding = getHeader(
        payload.headers,
        "Content-Transfer-Encoding"
    );

    if (
        (payload.mimeType === "text/plain" || payload.mimeType === "text/html") &&
        payload.body?.data
    ) {
            const body = decodeBody(payload.body.data, transferEncoding);
            return payload.mimeType === "text/html" ? htmlToText(body) : body;
    }

    return "";
};

const parseGmailMessage = (message) => {
    try {
        const headers = message?.payload?.headers || [];
        const dateHeader = getHeader(headers, "Date");
        const parsedDate = Date.parse(dateHeader);

        return {
            gmailMessageId: message?.id || "",
            threadId: message?.threadId || "",
            sender: getHeader(headers, "From"),
            recipients: getHeader(headers, "To")
                .split(",")
                .map((recipient) => recipient.trim())
                .filter(Boolean),
            subject: getHeader(headers, "Subject"),
            date: dateHeader,
            parsedDate: Number.isNaN(parsedDate) ? null : new Date(parsedDate),
            body: extractBody(message?.payload),
            labels: Array.isArray(message?.labelIds) ? message.labelIds : [],
            attachments: collectAttachments(message?.payload)
        };
    } catch (error) {
        return {
            gmailMessageId: message?.id || "",
            threadId: message?.threadId || "",
            sender: "",
            recipients: [],
            subject: "",
            date: "",
            parsedDate: null,
            body: "",
            labels: [],
            attachments: []
        };
    }
};

module.exports = {
    parseGmailMessage
};