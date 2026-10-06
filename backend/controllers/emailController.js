const Email = require("../models/Email");
const User = require("../models/User");

const sendEmail = async (req, res) => {
    try {
        const { receiverEmail, subject, body } = req.body;

        // Check required fields
        if (!receiverEmail || !body) {
            return res.status(400).json({
                message: "Receiver email and body are required"
            });
        }

        // Find receiver
        const receiver = await User.findOne({
            email: receiverEmail.toLowerCase()
        });

        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        // Create email
        const email = await Email.create({
            sender: req.user.userId,
            receiver: receiver._id,
            subject: subject || "",
            body: body,
            folder: "inbox"
        });

        res.status(201).json({
            message: "Email sent successfully",
            email: {
                id: email._id,
                sender: email.sender,
                receiver: email.receiver,
                subject: email.subject,
                body: email.body,
                createdAt: email.createdAt
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

module.exports = {
    sendEmail
};