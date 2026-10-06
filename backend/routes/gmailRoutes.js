const express = require("express");

const {
	syncGmail,
	sendGmailEmail,
	replyToGmailMessage,
	getGmailMessages,
	getStoredEmail,
	analyzeEmailMessage,
	markEmailRead,
	starEmail
} = require("../controllers/gmailController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/sync", protect, syncGmail);
router.post("/send", protect, sendGmailEmail);
router.get("/messages", protect, getGmailMessages);
router.get("/messages/:id", protect, getStoredEmail);
router.post("/messages/:id/analyze", protect, analyzeEmailMessage);
router.post("/messages/:id/reply", protect, replyToGmailMessage);
router.patch("/messages/:id/read", protect, markEmailRead);
router.patch("/messages/:id/star", protect, starEmail);

module.exports = router;