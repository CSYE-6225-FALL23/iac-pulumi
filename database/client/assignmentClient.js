// Import custom files
const Assignment = require("../models/assignment");

class AssignmentClient {
  constructor() {
    this.filename = "assignmentClient.js";
  }
  /**
   * Create Assignment
   *
   * @param {Object} req - Request Object
   * @param {Object} res - Response Object
   * @returns {Object} Assignment Object
   */
  createAssignment = async (payload, id) => {
    try {
      const { name, points, num_of_attempts, deadline } = payload;
      const assignment = await Assignment.create({
        name: name,
        points: points,
        num_of_attempts: num_of_attempts,
        deadline: deadline,
        UserId: id,
      });
      return assignment.toJSON();
    } catch (error) {
      throw error;
    }
  };

  deleteAssignment = async (id) => {
    try {
      const isDeleted = await Assignment.destroy({
        where: { id: id },
      });
      return isDeleted;
    } catch (error) {
      return false;
    }
  };

  getAssignment = async (assignmentId) => {
    try {
      const assignment = await Assignment.findOne({
        where: { id: assignmentId },
        attributes: [
          "id",
          "name",
          "points",
          "num_of_attempts",
          "deadline",
          "assignment_updated",
          "assignment_created",
          "UserId"
        ],
      });
      return assignment;
    } catch (error) {
      return false;
    }
  };

  getAllAssignment = async () => {
    try {
      const assignments = await Assignment.findAll({
        attributes: [
          "id",
          "name",
          "points",
          "num_of_attempts",
          "deadline",
          "assignment_updated",
          "assignment_created",
        ],
      });
      assignments.forEach((assignment) => {
        return assignment.toJSON();
      });
      return assignments;
    } catch (error) {
      throw error;
    }
  };

  updateAssignment = async (assignment, assignmentId, userId) => {
    try {
      const [updatedRows, updatedAssignment] = await Assignment.update(
        {
          ...assignment,
          assignment_updated: new Date().toISOString(),
        },
        {
          where: { id: assignmentId },
          fields: [
            "name",
            "points",
            "num_of_attempts",
            "deadline",
            "assignment_updated",
          ],
          returning: true,
        },
      );
      return updatedAssignment;
    } catch (error) {
      throw error;
    }
  };
}

module.exports = AssignmentClient;
