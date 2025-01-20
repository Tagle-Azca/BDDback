const express = require("express");
const {
  getHousesByFraccionamiento,
} = require("../controllers/houseController");

const router = express.Router();

router.get("/:fraccionamiento", getHousesByFraccionamiento);

module.exports = router;
