const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
    getEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    getAlerts,
    dismissAlert,
    restoreAlert,
    setReminder
} = require("../controllers/eventController");

router.use(protect);

router.get("/alerts", getAlerts);
router.patch("/:id/dismiss-alert", dismissAlert);
router.patch("/:id/restore-alert", restoreAlert);
router.patch("/:id/reminder", setReminder);
router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", createEvent);
router.patch("/:id", updateEvent);
router.delete("/:id", deleteEvent);

module.exports = router;
