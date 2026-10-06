const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        subject: {
            type: String,
            trim: true,
            default: ""
        },

        body: {
            type: String,
            required: true
        },

        attachments: [
            {
                filename: String,
                path: String,
                mimetype: String,
                size: Number,
                providerAttachmentId: String
            }
        ],

        // Email category predicted by AI
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

        // How confident the AI is about the category
        categoryConfidence: {
            type: Number,
            default: 0
        },

        // AI-detected importance
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Urgent", "Normal", "Important"],
            default: "Medium"
        },

        // How confident the AI is about priority
        priorityConfidence: {
            type: Number,
            default: 0
        },

        // AI-generated summary
        aiSummary: {
            type: String,
            default: ""
        },

        // Whether AI found an event in the email
        hasEvent: {
            type: Boolean,
            default: false
        },

        // Extracted event details from event model
        extractedEvents: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },

        isRead: {
            type: Boolean,
            default: false
        },

        isStarred: {
            type: Boolean,
            default: false
        },

        folder: {
            type: String,
            enum: ["inbox", "sent", "draft", "trash", "spam"],
            default: "inbox"
        },

        provider: {
            type: String,
            enum: ["gmail", "outlook"],
            default: null
        },

        providerMessageId: {
            type: String,
            default: null
        },

        providerThreadId: {
            type: String,
            default: null
        },

        providerSender: {
            type: String,
            default: ""
        },

        providerRecipients: {
            type: [String],
            default: []
        },

        providerLabels: {
            type: [String],
            default: []
        },

        providerDate: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

emailSchema.index({ provider: 1, providerMessageId: 1, receiver: 1 }, { unique: true, sparse: true });
emailSchema.index({ sender: 1, receiver: 1, folder: 1, providerDate: -1 });
emailSchema.index({ receiver: 1, folder: 1, providerDate: -1 });

const Email = mongoose.model("Email", emailSchema);

module.exports = Email;