const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        email: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Email",
            default: null
        },

        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            default: ""
        },

        category: {
            type: String,
            enum: [
                "Education",
                "College/Education",
                "Office",
                "Office/Work",
                "Personal",
                "Finance",
                "Shopping",
                "Travel",
                "Other"
            ],
            default: "Other"
        },

        eventDate: {
            type: Date,
            default: Date.now
        },

        eventDateRaw: {
            type: String,
            default: ""
        },

        eventTime: {
            type: String,
            default: ""
        },

        location: {
            type: String,
            default: ""
        },

        reminderTime: {
            type: Date,
            default: null
        },

        reminderSent: {
            type: Boolean,
            default: false
        },

        reminderMinutesBefore: {
            type: Number,
            default: 60
        },

        alertDismissed: {
            type: Boolean,
            default: false
        },

        status: {
            type: String,
            enum: ["Upcoming", "Completed", "Cancelled"],
            default: "Upcoming"
        },

        // Tells us what the latest email did to the event
        eventType: {
            type: String,
            enum: ["New", "Update", "Cancellation"],
            default: "New"
        },

        // When the event was cancelled
        cancelledAt: {
            type: Date,
            default: null
        },

        // The email that most recently changed this event
        lastUpdatedFromEmail: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Email",
            default: null
        }
    },
    {
        timestamps: true
    }
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;