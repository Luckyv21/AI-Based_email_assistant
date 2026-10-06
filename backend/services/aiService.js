const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
const Email = require("../models/Email");
const Event = require("../models/Event");
const { extractRealEventDate, isEventEnded } = require("./eventService");

const mapCategory = (rawCategory) => {
    const raw = String(rawCategory || "").toLowerCase();
    if (raw.includes("edu") || raw.includes("college")) {
        return "Education";
    }
    if (raw.includes("office") || raw.includes("work")) {
        return "Office";
    }
    if (raw.includes("personal")) {
        return "Personal";
    }
    if (raw.includes("finance")) return "Finance";
    if (raw.includes("shop")) return "Shopping";
    if (raw.includes("travel")) return "Travel";
    return "Other";
};

const mapPriority = (rawPriority) => {
    const raw = String(rawPriority || "").toLowerCase();
    if (raw === "urgent") return "Urgent";
    if (raw === "important" || raw === "high") return "Important";
    if (raw === "low") return "Low";
    return "Normal";
};

const isAdvertisementEmail = (emailDoc) => {
    const labels = Array.isArray(emailDoc.providerLabels) ? emailDoc.providerLabels : [];
    if (labels.some((l) => ["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "SPAM", "PROMOTIONS"].includes(l))) {
        return true;
    }

    const text = `${emailDoc.subject || ""} ${emailDoc.body || ""}`.toLowerCase();
    const sender = `${emailDoc.providerSender || ""}`.toLowerCase();

    const marketingPhrases = [
        "unsubscribe",
        "opt out",
        "manage preferences",
        "view in browser",
        "view online",
        "limited time offer",
        "discount code",
        "promo code",
        "% off",
        "flat sale",
        "special prices end",
        "sale ends",
        "exclusive deal",
        "special discount",
        "shop now",
        "buy now",
        "order now",
        "free shipping",
        "cashback",
        "price drop",
        "deals of the day",
        "newsletter",
        "sponsored",
        "privacy policy | terms",
        "all rights reserved",
        "handpicked for you",
        "courses on sale"
    ];

    let matchCount = 0;
    for (const phrase of marketingPhrases) {
        if (text.includes(phrase)) matchCount++;
    }

    if (matchCount >= 2) return true;
    if (
        matchCount >= 1 &&
        (sender.includes("no-reply") ||
            sender.includes("noreply") ||
            sender.includes("marketing") ||
            sender.includes("promotions") ||
            sender.includes("newsletter") ||
            sender.includes("offers") ||
            sender.includes("news"))
    ) {
        return true;
    }

    return false;
};

const cleanEventTitle = (rawTitle, subject = "") => {
    let t = (rawTitle || "").replace(/<[^>]*>/g, "").trim();
    if (
        t.includes("style=") ||
        t.includes("font-size") ||
        t.includes("http") ||
        t.includes("{") ||
        t.includes("class=") ||
        t.includes("<") ||
        t.includes(">")
    ) {
        t = "";
    }

    const junkWords = [
        "received",
        "turned on",
        "alert",
        "security alert",
        "sign in",
        "login",
        "notice",
        "confirmation",
        "review",
        "call toll",
        "handpicked",
        "stay updated",
        "subject",
        "d like to join",
        "join",
        "updated",
        "click",
        "download",
        "here",
        "verification",
        "password",
        "google account",
        "session"
    ];

    if (junkWords.includes(t.toLowerCase())) {
        t = "";
    }

    if (!t || t.length < 3) {
        const m = subject.match(
            /(exam[^!,.?]*|meeting[^!,.?]*|session[^!,.?]*|webinar[^!,.?]*|interview[^!,.?]*|deadline[^!,.?]*|presentation[^!,.?]*|conference[^!,.?]*|workshop[^!,.?]*|kickoff[^!,.?]*)/i
        );
        if (m) return m[1].trim();
        return "";
    }

    return t;
};

const isRelevantEvent = (eventObj, emailDoc) => {
    // 1. Advertisements and marketing campaigns are never calendar events
    if (isAdvertisementEmail(emailDoc)) {
        return false;
    }

    // 2. Reject security alerts and verification emails
    const subj = (emailDoc.subject || "").toLowerCase();
    if (
        subj.includes("security alert") ||
        subj.includes("verification code") ||
        subj.includes("2-step verification") ||
        subj.includes("sign-in from") ||
        subj.includes("password changed")
    ) {
        return false;
    }

    const cleanedTitle = cleanEventTitle(eventObj.title, emailDoc.subject || "");
    if (!cleanedTitle || cleanedTitle.length < 3) return false;

    eventObj.title = cleanedTitle;

    // 3. Must have an extracted date/time AND relate to meetings/academic/work commitments
    const rawDate = String(eventObj.date || "").trim();
    const rawTime = String(eventObj.time || "").trim();
    const hasDateTime = rawDate.length > 1 || rawTime.length > 1;

    const meetingKeywords =
        /\b(meeting|sync|interview|call|standup|discussion|webinar|workshop|seminar|presentation|appointment|deadline|defense|exam|test|class|lecture|conference|catch-up|demo|kickoff|office hours|session)\b/i;

    const isCalendarEvent =
        meetingKeywords.test(cleanedTitle) || meetingKeywords.test(emailDoc.subject || "");

    return hasDateTime && isCalendarEvent;
};

const parseEventDate = (dateStr, timeStr = "", emailDate = null) => {
    return extractRealEventDate("", dateStr, timeStr, emailDate);
};

const analyzeEmail = async ({ subject = "", body = "" }) => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                subject: String(subject || "").slice(0, 1000),
                body: String(body || "").slice(0, 50000)
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            console.warn(`AI Service returned ${response.status}: ${await response.text()}`);
            return null;
        }

        const data = await response.json();

        return {
            category: mapCategory(data.category),
            categoryConfidence: Number(data.category_confidence || 0),
            priority: mapPriority(data.priority),
            priorityConfidence: Number(data.priority_confidence || 0),
            hasEvent: Boolean(data.has_event),
            events: (data.events || []).map((ev) => ({
                title: ev.title || "Detected Event",
                date: ev.date || "",
                time: ev.time || "",
                location: ev.location || "",
                confidence: Number(ev.confidence || 0),
                rawEntities: ev.raw_entities || []
            }))
        };
    } catch (error) {
        console.error("AI analysis failed:", error.message);
        return null;
    }
};

const applyAIToEmail = async (emailDoc, userId) => {
    if (!emailDoc) return null;

    const analysis = await analyzeEmail({
        subject: emailDoc.subject,
        body: emailDoc.body
    });

    if (!analysis) return emailDoc;

    emailDoc.category = analysis.category;
    emailDoc.categoryConfidence = analysis.categoryConfidence;
    emailDoc.priority = analysis.priority;
    emailDoc.priorityConfidence = analysis.priorityConfidence;

    // Filter events: strictly keep relevant calendar events, completely excluding advertisements
    const rawEvents = analysis.events || [];
    const relevantEvents = rawEvents.filter((ev) => isRelevantEvent(ev, emailDoc));

    const activeEvents = [];

    if (relevantEvents.length > 0 && userId) {
        for (const ev of relevantEvents) {
            const resolvedDate = extractRealEventDate(
                `${ev.title} ${emailDoc.subject || ""}`,
                ev.date,
                ev.time,
                emailDoc.providerDate || emailDoc.createdAt
            );

            // If the event date/month/time is already over/ended, automatically discard it
            if (isEventEnded(resolvedDate, ev.time)) {
                try {
                    await Event.deleteMany({ email: emailDoc._id, title: ev.title });
                } catch (e) {
                    // ignore
                }
                continue;
            }

            activeEvents.push({
                ...ev,
                eventDate: resolvedDate
            });

            try {
                await Event.findOneAndUpdate(
                    {
                        user: userId,
                        email: emailDoc._id,
                        title: ev.title
                    },
                    {
                        $set: {
                            user: userId,
                            email: emailDoc._id,
                            title: ev.title,
                            description: `Detected from: "${emailDoc.subject || "Email"}"`,
                            category: analysis.category,
                            eventDate: resolvedDate,
                            eventDateRaw: ev.date || "",
                            eventTime: ev.time || "",
                            location: ev.location || "",
                            status: "Upcoming"
                        }
                    },
                    { upsert: true, returnDocument: "after" }
                );
            } catch (err) {
                console.error("Failed to persist event to Event collection:", err.message);
            }
        }
    } else if (userId) {
        try {
            await Event.deleteMany({ email: emailDoc._id });
        } catch (e) {
            // ignore
        }
    }

    emailDoc.hasEvent = activeEvents.length > 0;
    emailDoc.extractedEvents = activeEvents;
    await emailDoc.save();

    return emailDoc;
};

module.exports = {
    analyzeEmail,
    applyAIToEmail,
    cleanEventTitle,
    isAdvertisementEmail,
    isRelevantEvent,
    mapCategory,
    mapPriority,
    parseEventDate
};
