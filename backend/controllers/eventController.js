const Event = require("../models/Event");
const Email = require("../models/Email");
const { deleteEndedEvents, isEventEnded } = require("../services/eventService");

const getEvents = async (req, res) => {
    try {
        // Automatically delete any events that have already ended or expired
        await deleteEndedEvents(req.user.userId);

        const filter = { user: req.user.userId };

        if (req.query.status) {
            filter.status = req.query.status;
        }
        if (req.query.category) {
            filter.category = req.query.category;
        }

        const events = await Event.find(filter)
            .sort({ eventDate: 1, createdAt: -1 })
            .populate("email", "subject providerSender providerDate body folder");

        return res.status(200).json({
            count: events.length,
            events
        });
    } catch (error) {
        console.error("Get events error:", error);
        return res.status(500).json({ message: "Failed to fetch events" });
    }
};

const getEventById = async (req, res) => {
    try {
        // Check and clean ended events first
        await deleteEndedEvents(req.user.userId);

        const event = await Event.findOne({
            _id: req.params.id,
            user: req.user.userId
        }).populate("email", "subject providerSender providerDate body");

        if (!event) {
            return res.status(404).json({ message: "Event not found or has ended" });
        }

        return res.status(200).json({ event });
    } catch (error) {
        console.error("Get event error:", error);
        return res.status(500).json({ message: "Failed to fetch event" });
    }
};

const createEvent = async (req, res) => {
    try {
        const { title, description, category, eventDate, eventTime, location, emailId } = req.body;

        if (!title?.trim()) {
            return res.status(400).json({ message: "Event title is required" });
        }

        const resolvedDate = eventDate ? new Date(eventDate) : new Date();
        const validDate = isNaN(resolvedDate.getTime()) ? new Date() : resolvedDate;

        if (isEventEnded(validDate, eventTime)) {
            return res.status(400).json({
                message: "Cannot create an event that is already ended or in the past"
            });
        }

        const newEvent = await Event.create({
            user: req.user.userId,
            email: emailId || null,
            title: title.trim(),
            description: description || "",
            category: category || "Other",
            eventDate: validDate,
            eventDateRaw: String(eventDate || ""),
            eventTime: eventTime || "",
            location: location || "",
            status: "Upcoming"
        });

        return res.status(201).json({
            message: "Event created successfully",
            event: newEvent
        });
    } catch (error) {
        console.error("Create event error:", error);
        return res.status(500).json({ message: "Failed to create event" });
    }
};

const updateEvent = async (req, res) => {
    try {
        const allowedUpdates = [
            "title",
            "description",
            "category",
            "eventDate",
            "eventTime",
            "location",
            "status"
        ];

        const updates = {};
        for (const field of allowedUpdates) {
            if (req.body[field] !== undefined) {
                if (field === "eventDate") {
                    const parsed = new Date(req.body[field]);
                    if (!isNaN(parsed.getTime())) {
                        updates.eventDate = parsed;
                    }
                } else {
                    updates[field] = req.body[field];
                }
            }
        }

        if (updates.status === "Cancelled") {
            updates.cancelledAt = new Date();
        }

        const event = await Event.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { $set: updates },
            { new: true, runValidators: true }
        ).populate("email", "subject providerSender providerDate");

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({
            message: "Event updated successfully",
            event
        });
    } catch (error) {
        console.error("Update event error:", error);
        return res.status(500).json({ message: "Failed to update event" });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const event = await Event.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId
        });

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({
            message: "Event deleted successfully",
            eventId: req.params.id
        });
    } catch (error) {
        console.error("Delete event error:", error);
        return res.status(500).json({ message: "Failed to delete event" });
    }
};

module.exports = {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent
};
