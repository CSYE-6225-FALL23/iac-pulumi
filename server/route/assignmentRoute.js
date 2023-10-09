const express = require("express");

// Import Custom Files
const {
  createAssignment,
  deleteAssignment,
  getAllAssignment,
  getAssignment,
  updateAssignment,
} = require("../controller/assignmentController.js");

const { isUserAuthenticated } = require("../middleware/auth.js");
const { isDBOnline } = require("../middleware/auth.js");

const {
  canUserDeleteAssignment,
  canUserUpdateAssignment
} = require("../middleware/assignmentAuthorization.js");

const route = express.Router();

route.get("/", isDBOnline, isUserAuthenticated, getAllAssignment);
route.get("/:id", isDBOnline, isUserAuthenticated, getAssignment);

route.post("/", isDBOnline, isUserAuthenticated, createAssignment);
route.put(
  "/:id",
  isDBOnline,
  isUserAuthenticated,
  canUserUpdateAssignment,
  updateAssignment,
);

route.delete(
  "/:id",
  isDBOnline,
  isUserAuthenticated,
  canUserDeleteAssignment,
  deleteAssignment,
);

module.exports = route;
