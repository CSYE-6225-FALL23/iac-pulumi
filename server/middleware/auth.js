const AuthErrorHandler = require("../error/authErrorHandler");
const GeneralErrorHandler = require("../error/generalErrorHandler");
const UserClient = require("database").UserClient;

const Connection = require("database").Connection;

const userClient = new UserClient();

// Middleware to check authorization
const isUserAuthenticated = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new AuthErrorHandler("AUTH_101");

    const encodedCredentials = authHeader.split(" ")[1];
    if (!encodedCredentials) throw new AuthErrorHandler("AUTH_102");

    const decodedCredentials = Buffer.from(
      encodedCredentials,
      "base64",
    ).toString("utf-8");
    const [email, password] = decodedCredentials.split(":");
    if (!email || !password) throw new AuthErrorHandler("AUTH_103");

    const validUser = await userClient.getUser(email);
    if (!validUser) throw new AuthErrorHandler("AUTH_103");

    if (password !== validUser.password) throw new AuthErrorHandler("AUTH_103");

    req.user = {
      email,
      password,
      id: validUser.id,
    };
    next();
  } catch (error) {
    console.log(error);
    if (!error.statusCode) error.statusCode = 500;
    res.status(error.statusCode).send(error);
  }
};

const isDBOnline = async (req, res, next) => {
  try {
    const isDBRunning = await Connection.testConnection();
    if (!isDBRunning) throw new GeneralErrorHandler("GEN_103");
    next();
  } catch (error) {
    console.log(error);
    if (!error.statusCode) error.statusCode = 500;
    res.status(error.statusCode).send(error);
  }
};

module.exports = {
  isUserAuthenticated,
  isDBOnline,
};
