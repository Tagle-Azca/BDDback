const express = require("express");
const { addFraccionamiento } = require("../controllers/fraccControllers");

const router = express.Router();

router.post("/add", addFraccionamiento);

module.exports = router;
