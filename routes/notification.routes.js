const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");

router.post("/send-notification", notificationController.sendNotification);
router.get("/pending/:fraccId/:residencia", notificationController.getPendingNotifications);

module.exports = router;
