const Event = require("../models/Event");
const Email = require("../models/Email");

const MONTHS = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
};

/**
 * Extracts the true date & time of an event from raw text, title, time string, and email context.
 */
function extractRealEventDate(title = "", rawDate = "", timeStr = "", emailDate = null) {
    const refDate = emailDate ? new Date(emailDate) : new Date();
    const fallbackYear = !isNaN(refDate.getTime()) ? refDate.getFullYear() : new Date().getFullYear();
    const text = `${title} ${rawDate || ""}`.toLowerCase();

    let targetDate = null;

    // 1. Look for explicit patterns like "Feb 20, 2026", "20 February", "Aug 18 2025", "18th August"
    const monthDayMatch =
        text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[.\s]+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/i) ||
        text.match(/\b(\d{1,2})(?:st|nd|rd|th)?[.\s]+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*(\d{4}))?\b/i);

    if (monthDayMatch) {
        let monthStr, dayStr, yearStr;
        if (isNaN(parseInt(monthDayMatch[1], 10))) {
            monthStr = monthDayMatch[1].toLowerCase();
            dayStr = monthDayMatch[2];
            yearStr = monthDayMatch[3];
        } else {
            dayStr = monthDayMatch[1];
            monthStr = monthDayMatch[2].toLowerCase();
            yearStr = monthDayMatch[3];
        }

        const month = MONTHS[monthStr];
        const day = parseInt(dayStr, 10);
        const year = yearStr ? parseInt(yearStr, 10) : fallbackYear;

        if (month !== undefined && !isNaN(day) && day >= 1 && day <= 31) {
            targetDate = new Date(year, month, day, 23, 59, 59);
        }
    }

    // 2. Look for explicit ISO/numeric date: YYYY-MM-DD or DD/MM/YYYY
    if (!targetDate) {
        const isoMatch = text.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
        if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10) - 1;
            const d = parseInt(isoMatch[3], 10);
            targetDate = new Date(y, m, d, 23, 59, 59);
        } else {
            const ddmmyyyy = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
            if (ddmmyyyy) {
                const d = parseInt(ddmmyyyy[1], 10);
                const m = parseInt(ddmmyyyy[2], 10) - 1;
                const y = parseInt(ddmmyyyy[3], 10);
                targetDate = new Date(y, m, d, 23, 59, 59);
            }
        }
    }

    // 3. Look for explicit past years (e.g., "in 2020", "2024")
    if (!targetDate) {
        const pastYearMatch = text.match(/\b(201\d|202[0-5])\b/);
        if (pastYearMatch) {
            targetDate = new Date(parseInt(pastYearMatch[1], 10), 11, 31, 23, 59, 59);
        }
    }

    // 4. Relative dates like "today", "tomorrow"
    if (!targetDate) {
        if (text.includes("today")) {
            targetDate = new Date(refDate);
        } else if (text.includes("tomorrow")) {
            const d = new Date(refDate);
            d.setDate(d.getDate() + 1);
            targetDate = d;
        }
    }

    // 5. If rawDate was a valid date string directly
    if (!targetDate && rawDate) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
            targetDate = parsed;
        }
    }

    // 6. Default to the source email's date if available (prevents assigning tomorrow to old emails!)
    if (!targetDate) {
        if (emailDate && !isNaN(new Date(emailDate).getTime())) {
            targetDate = new Date(emailDate);
        } else {
            targetDate = new Date();
        }
    }

    // 7. Parse and apply time if available
    const timeToParse = timeStr || "";
    if (timeToParse && targetDate) {
        const timeMatch = timeToParse.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

            if (meridian === "pm" && hours < 12) hours += 12;
            if (meridian === "am" && hours === 12) hours = 0;

            targetDate.setHours(hours, minutes, 0, 0);
        }
    }

    return targetDate;
}

/**
 * Checks whether an event has already ended (its date/month/time are in the past).
 */
function isEventEnded(eventDate, eventTime = "", now = new Date()) {
    if (!eventDate) return true;
    const d = new Date(eventDate);
    if (isNaN(d.getTime())) return true;

    // If explicit time is provided, compare exact date-time
    if (eventTime && typeof eventTime === "string") {
        const timeMatch = eventTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

            if (meridian === "pm" && hours < 12) hours += 12;
            if (meridian === "am" && hours === 12) hours = 0;

            d.setHours(hours, minutes, 0, 0);
            return d < now;
        }
    }

    // If no specific time was provided, the event ends at the conclusion of that date (23:59:59.999)
    d.setHours(23, 59, 59, 999);
    return d < now;
}

/**
 * Checks if event title is garbage / HTML tags / template noise rather than a real event.
 */
function isGarbageEvent(title = "") {
    const t = String(title || "").trim();
    if (!t || t.length < 3) return true;
    return /^(doctype|table id|<\/|<html|email template|^subject$|^update$|please do not share|newsletter|statement of your account|payment for|i want to connect|why is vitamin|what should i do)/i.test(t);
}

/**
 * Automatically finds and permanently deletes any events that have already ended or are past due.
 * Also cleans up corresponding references in the Email collection.
 */
async function deleteEndedEvents(userId = null) {
    try {
        const now = new Date();
        const query = {};
        if (userId) {
            query.user = userId;
        }

        const events = await Event.find(query).populate("email", "subject providerDate").lean() || [];
        const toDeleteIds = [];
        const affectedEmailIds = new Set();

        for (const ev of events) {
            const garbage = isGarbageEvent(ev.title);
            const realDate = extractRealEventDate(
                `${ev.title} ${ev.email?.subject || ""}`,
                ev.eventDateRaw,
                ev.eventTime,
                ev.email?.providerDate
            );

            const ended = ev.status === "Completed" || isEventEnded(realDate, ev.eventTime, now);

            if (garbage || ended) {
                toDeleteIds.push(ev._id);
                if (ev.email?._id) {
                    affectedEmailIds.add(String(ev.email._id));
                }
            }
        }

        if (toDeleteIds.length > 0) {
            console.log(`🧹 Auto-deleting ${toDeleteIds.length} ended/expired event(s)`);
            await Event.deleteMany({ _id: { $in: toDeleteIds } });

            // Synchronize Email records
            for (const emailId of affectedEmailIds) {
                const remaining = await Event.find({ email: emailId }).lean();
                if (remaining.length === 0) {
                    await Email.updateOne(
                        { _id: emailId },
                        { $set: { hasEvent: false, extractedEvents: [] } }
                    );
                } else {
                    await Email.updateOne(
                        { _id: emailId },
                        {
                            $set: {
                                hasEvent: true,
                                extractedEvents: remaining.map((r) => ({
                                    title: r.title,
                                    date: r.eventDateRaw || r.eventDate?.toISOString(),
                                    time: r.eventTime || "",
                                    description: r.description || "",
                                    type: r.eventType || "New"
                                }))
                            }
                        }
                    );
                }
            }
        }

        // Also ensure any Email records with hasEvent: true whose events have ended are cleaned up
        const emailsWithEvents = await Email.find({ hasEvent: true }).select("_id subject providerDate createdAt extractedEvents").lean();
        for (const em of emailsWithEvents) {
            const rawEvents = em.extractedEvents || [];
            const activeOnly = rawEvents.filter((ev) => {
                const garbage = isGarbageEvent(ev.title);
                if (garbage) return false;
                const d = extractRealEventDate(
                    `${ev.title} ${em.subject || ""}`,
                    ev.date,
                    ev.time,
                    em.providerDate || em.createdAt
                );
                return !isEventEnded(d, ev.time, now);
            });

            if (activeOnly.length === 0) {
                await Email.updateOne(
                    { _id: em._id },
                    { $set: { hasEvent: false, extractedEvents: [] } }
                );
            } else if (activeOnly.length !== rawEvents.length) {
                await Email.updateOne(
                    { _id: em._id },
                    { $set: { hasEvent: true, extractedEvents: activeOnly } }
                );
            }
        }

        return toDeleteIds.length;
    } catch (error) {
        console.error("deleteEndedEvents error:", error.message);
        return 0;
    }
}

const STOPWORDS = new Set([
    "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
    "is", "are", "was", "were", "be", "been", "we", "i", "you", "he", "she", "it",
    "they", "my", "your", "our", "let", "lets", "let's", "hi", "hello", "hey",
    "from", "about", "this", "that", "have", "has", "had", "do", "does", "did",
    "will", "would", "shall", "should", "can", "could", "may", "might", "must",
    "re", "fwd", "fw", "subject", "email", "meeting", "call", "new", "update"
]);

function extractKeywords(str) {
    if (!str || typeof str !== "string") return [];
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function calculateKeywordOverlap(wordsA, wordsB) {
    if (!wordsA.length || !wordsB.length) return 0;
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    let intersection = 0;
    for (const w of setA) {
        if (setB.has(w)) intersection++;
    }
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * Checks if an email is indicating that an event / meeting is cancelled or called off.
 */
function isCancellationEmail(emailDoc) {
    if (!emailDoc) return false;
    const subj = String(emailDoc.subject || "").toLowerCase();
    const body = String(emailDoc.body || "").toLowerCase();
    const text = `${subj} ${body}`;

    const cancelPatterns = [
        /\b(cancell?ed|cancellation|canceling|cancelling|called off|calling off)\b/i,
        /\b(unable to attend|cannot make it|can't make it|will not be able to attend|won't be able to make it|not taking place)\b/i,
        /\b(postponed indefinitely|event is off|meeting is off)\b/i
    ];

    const hasCancelPhrase = cancelPatterns.some((pattern) => pattern.test(text));
    if (!hasCancelPhrase) return false;

    // Must be in the context of an event / meeting
    const eventContextPatterns = [
        /\b(meeting|discussion|session|call|event|interview|exam|review|demo|appointment|presentation|webinar|class)\b/i
    ];
    return eventContextPatterns.some((pattern) => pattern.test(text));
}

/**
 * Searches for an existing upcoming event for the user that matches this email/event.
 */
async function findSimilarEvent(userId, { title = "", emailDoc = null, resolvedDate = null } = {}) {
    if (!userId) return null;

    const existingEvents = await Event.find({
        user: userId,
        status: { $ne: "Cancelled" }
    }).populate("email", "subject providerThreadId providerDate");

    if (!existingEvents || !existingEvents.length) return null;

    const threadId = emailDoc?.providerThreadId;
    const newKeywords = [
        ...extractKeywords(title),
        ...extractKeywords(emailDoc?.subject || "")
    ];

    for (const ev of existingEvents) {
        // 1. Thread matching - same email thread/conversation
        if (threadId && ev.email?.providerThreadId && threadId === ev.email.providerThreadId) {
            return ev;
        }

        // 2. Exact or very close title
        const evTitle = String(ev.title || "").toLowerCase().trim();
        const curTitle = String(title || "").toLowerCase().trim();
        if (evTitle && curTitle && (evTitle === curTitle || evTitle.includes(curTitle) || curTitle.includes(evTitle))) {
            return ev;
        }

        // 3. Keyword semantic overlap
        const existingKeywords = [
            ...extractKeywords(ev.title),
            ...extractKeywords(ev.email?.subject || ""),
            ...extractKeywords(ev.description || "")
        ];

        const overlap = calculateKeywordOverlap(newKeywords, existingKeywords);
        const setA = new Set(newKeywords);
        let intersectionCount = 0;
        for (const w of setA) {
            if (existingKeywords.includes(w)) intersectionCount++;
        }

        if (overlap >= 0.3 || intersectionCount >= 2) {
            return ev;
        }

        // 4. Same date and at least one shared keyword
        if (resolvedDate && ev.eventDate) {
            const sameDay =
                new Date(resolvedDate).toDateString() === new Date(ev.eventDate).toDateString();
            if (sameDay && intersectionCount >= 1) {
                return ev;
            }
        }
    }

    return null;
}

/**
 * If the email is a cancellation, find and delete the existing matching event.
 */
async function handleCancellationIfApplicable(emailDoc, userId) {
    if (!userId || !isCancellationEmail(emailDoc)) {
        return false;
    }

    const matchedEvent = await findSimilarEvent(userId, {
        title: emailDoc.subject || "",
        emailDoc
    });

    if (matchedEvent) {
        console.log(`🗑️ Deleting cancelled event: "${matchedEvent.title}" (ID: ${matchedEvent._id}) due to cancellation email.`);
        await Event.findByIdAndDelete(matchedEvent._id);

        if (matchedEvent.email) {
            await Email.updateOne(
                { _id: matchedEvent.email },
                { $set: { hasEvent: false, extractedEvents: [] } }
            );
        }

        emailDoc.hasEvent = false;
        emailDoc.extractedEvents = [];
        await emailDoc.save();

        return true;
    }

    return false;
}

/**
 * Upserts or updates an existing similar event, or creates a new one.
 */
async function processOrUpsertEvent({ userId, emailDoc, eventData, category = "Other", resolvedDate }) {
    // 1. Check if an existing similar event exists
    const similar = await findSimilarEvent(userId, {
        title: eventData.title,
        emailDoc,
        resolvedDate
    });

    if (similar) {
        console.log(`🔄 Updating existing similar event: "${similar.title}" -> "${eventData.title}"`);
        similar.title = eventData.title || similar.title;
        similar.eventDate = resolvedDate || similar.eventDate;
        similar.eventDateRaw = eventData.date || similar.eventDateRaw;
        if (eventData.time) similar.eventTime = eventData.time;
        if (eventData.location) similar.location = eventData.location;
        similar.category = category || similar.category;
        similar.description = `Updated from: "${emailDoc.subject || "Email"}"`;
        similar.eventType = "Update";
        similar.lastUpdatedFromEmail = emailDoc._id;
        similar.status = "Upcoming";
        await similar.save();
        return { event: similar, isNew: false };
    }

    // 2. Otherwise create a brand new event
    console.log(`✨ Creating new event: "${eventData.title}"`);
    const newEv = await Event.create({
        user: userId,
        email: emailDoc._id,
        title: eventData.title,
        description: `Detected from: "${emailDoc.subject || "Email"}"`,
        category: category,
        eventDate: resolvedDate,
        eventDateRaw: eventData.date || "",
        eventTime: eventData.time || "",
        location: eventData.location || "",
        eventType: "New",
        status: "Upcoming"
    });

    return { event: newEv, isNew: true };
}

/**
 * Derives the exact start Date-Time object for an event from date + time strings.
 */
function getEventStartDateTime(event) {
    if (!event || !event.eventDate) return null;
    const d = new Date(event.eventDate);
    if (isNaN(d.getTime())) return null;

    if (event.eventTime && typeof event.eventTime === "string") {
        const timeMatch = event.eventTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const meridian = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

            if (meridian === "pm" && hours < 12) hours += 12;
            if (meridian === "am" && hours === 12) hours = 0;

            d.setHours(hours, minutes, 0, 0);
            return d;
        }
    }

    d.setHours(9, 0, 0, 0);
    return d;
}

/**
 * Formats an alert summary with urgency and human-friendly time countdown.
 */
function calculateEventAlert(event, now = new Date()) {
    const startTime = getEventStartDateTime(event);
    if (!startTime) return null;

    const diffMs = startTime.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // If event has concluded over 30 mins ago, no alert
    if (diffMs < -1000 * 60 * 30) {
        return null;
    }

    let urgency = "upcoming";
    let timeRemaining = "";

    if (diffMinutes <= 0 && diffMinutes >= -30) {
        urgency = "imminent";
        timeRemaining = "Happening right now";
    } else if (diffMinutes > 0 && diffMinutes <= 60) {
        urgency = "imminent";
        timeRemaining = `In ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
    } else if (diffHours > 0 && diffHours <= 24) {
        urgency = "today";
        timeRemaining = `In ~${diffHours} hour${diffHours === 1 ? "" : "s"}`;
    } else if (diffDays <= 2) {
        urgency = "tomorrow";
        timeRemaining = "Tomorrow";
    } else {
        urgency = "upcoming";
        timeRemaining = `In ${diffDays} days`;
    }

    return {
        eventId: event._id,
        title: event.title,
        category: event.category || "Other",
        startTime,
        eventDate: event.eventDate,
        eventTime: event.eventTime || "",
        location: event.location || "",
        urgency,
        timeRemaining,
        reminderSent: Boolean(event.reminderSent),
        alertDismissed: Boolean(event.alertDismissed),
        alertMessage: `${event.title} is scheduled for ${event.eventTime ? event.eventTime : startTime.toLocaleDateString()}${event.location ? ` at ${event.location}` : ""}`,
        email: event.email
    };
}

/**
 * Returns active upcoming alerts for a specific user.
 */
async function getUserEventAlerts(userId) {
    await deleteEndedEvents(userId);

    const now = new Date();
    const events = await Event.find({
        user: userId,
        status: "Upcoming",
        alertDismissed: { $ne: true }
    })
        .sort({ eventDate: 1 })
        .populate("email", "subject providerSender providerDate")
        .lean() || [];

    const alerts = [];
    for (const ev of events) {
        const alert = calculateEventAlert(ev, now);
        if (alert) {
            alerts.push(alert);
        }
    }

    return alerts;
}

/**
 * Checks and marks reminderSent for any events nearing their scheduled start.
 */
async function checkAndTriggerEventReminders() {
    try {
        const now = new Date();
        const upcomingEvents = await Event.find({
            status: "Upcoming",
            reminderSent: false
        }).lean() || [];

        for (const ev of upcomingEvents) {
            const startTime = getEventStartDateTime(ev);
            if (!startTime) continue;

            const reminderMinutes = ev.reminderMinutesBefore || 60;
            const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);

            if (diffMinutes <= reminderMinutes && diffMinutes >= -15) {
                console.log(`🔔 Event Alert Triggered: "${ev.title}" starting in ${Math.round(diffMinutes)} minutes!`);
                await Event.updateOne(
                    { _id: ev._id },
                    { $set: { reminderSent: true, reminderTime: now } }
                );
            }
        }
    } catch (err) {
        console.error("Error in checkAndTriggerEventReminders:", err.message);
    }
}

module.exports = {
    MONTHS,
    extractRealEventDate,
    isEventEnded,
    isGarbageEvent,
    deleteEndedEvents,
    extractKeywords,
    calculateKeywordOverlap,
    isCancellationEmail,
    findSimilarEvent,
    handleCancellationIfApplicable,
    processOrUpsertEvent,
    getEventStartDateTime,
    calculateEventAlert,
    getUserEventAlerts,
    checkAndTriggerEventReminders
};
