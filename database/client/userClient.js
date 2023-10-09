// Import custom files
const bcrypt = require("bcrypt");

const User = require("../models/user");

class UserClient {
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
  createUserBulk = async (users) => {
    try {
      if (!users || users.length == 0) throw new Error("User data not found");
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (!user.email || !user.password) throw new Error("Invalid data");
        users[i].password = await this.hashPassword(users[i].password);
      }
      const addedUsers = await User.bulkCreate(users, {
        ignoreDuplicates: true,
      });
      return addedUsers;
    } catch (error) {
      throw error;
    }
  };

  getUser = async (email) => {
    try {
      const validUser = await User.findOne({
        where: { email: email },
      });
      return validUser;
    } catch (error) {
      throw error;
    }
  };

  hashPassword = async (plainTextPassword) => {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(plainTextPassword, saltRounds);
      return hashedPassword;
    } catch (error) {
      throw error;
    }
  };

  comparePasswords = async (plainTextPassword, hashedPassword) => {
    try {
      const match = await bcrypt.compare(plainTextPassword, hashedPassword);
      return match;
    } catch (error) {
      throw error;
    }
  };
}

module.exports = UserClient;
