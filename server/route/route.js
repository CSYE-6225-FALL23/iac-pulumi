const express = require("express");

// Import Custom Files
const { getDBHealthStatus } = require("../controller/dbController.js");
const { getAuthToken } = require("../controller/authController.js");
const { setNoCachePolicy } = require("../middleware/cacheControl.js");

const route = express.Router();

// Test Node Server
route.get("/test", (req, res, next) => {
  res.send("API (sudarshan_kudli_002772991_02) is ready!");
});

// Get Health Status
route.get("/healthz", setNoCachePolicy, getDBHealthStatus);

route.post("/auth", getAuthToken);

module.exports = route;
