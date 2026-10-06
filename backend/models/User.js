const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: false,
            minlength: 6
        },

        googleId: {
            type: String,
            default: ""
        },

        profilePicture: {
            type: String,
            default: ""
        },
        google: {
            connected: {
                type: Boolean,
                default: false
            },
            email: {
                type: String,
                default: ""
            },
            refreshToken: {
                type: String,
                default: ""
            }
        }
    },
    {
        timestamps: true
    }
);

const User = mongoose.model("User", userSchema);

module.exports = User;