const express = require("express");
const router = express.Router();
const playerRegistryController = require("../controllers/player-registry.controller");

router.post("/register", playerRegistryController.registerDevice);
router.get("/:fraccId/:residencia", playerRegistryController.getDevices);
router.delete("/clear/:fraccId/:residencia", playerRegistryController.clearDevices);
router.get("/audit/:fraccId/:residencia", playerRegistryController.auditDevices);
router.delete("/clean-phantom/:fraccId/:residencia", playerRegistryController.cleanPhantomDevices);

module.exports = router;
