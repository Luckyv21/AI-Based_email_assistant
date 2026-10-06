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

module.exports = {
    MONTHS,
    extractRealEventDate,
    isEventEnded,
    isGarbageEvent,
    deleteEndedEvents
};
