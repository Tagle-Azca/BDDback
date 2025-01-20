const express = require("express");
const { registerAdmin } = require("../controllers/authController");

const router = express.Router();

router.post("/register", registerAdmin);

module.exports = router;
