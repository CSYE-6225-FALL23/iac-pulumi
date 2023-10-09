// Import custom files
const UserClient = require("database").UserClient;
const AuthErrorHandler = require("../error/authErrorHandler");

const userClient = new UserClient();

/**
 * Get DB Status
 *
 * @param {Object} req - Request Object
 * @param {Object} res - Response Object
 * @returns {boolean} Status of DB
 */
const getAuthToken = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new Error("invalid input");

    const validUser = await userClient.getUser(email);
    const isValidPassword = await userClient.comparePasswords(
      password,
      validUser.password,
    );
    if (!isValidPassword) throw new AuthErrorHandler("AUTH_103");

    const hashedPassword = await userClient.hashPassword(password);

    const token = Buffer.from(`${email}:${validUser.password}`).toString(
      "base64",
    );
    res.status(200).send({ token: token });
  } catch (error) {
    if (!error.statusCode) error.statusCode = 500;
    res.status(error.statusCode).send(error);
  }
};

module.exports = {
  getAuthToken,
};
