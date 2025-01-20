const express = require("express");
const {
  addFraccUser,
  loginFraccUser,
} = require("../controllers/fraccController");

const router = express.Router();

router.post("/add", addFraccUser);

router.post("/login", loginFraccUser);

module.exports = router;
