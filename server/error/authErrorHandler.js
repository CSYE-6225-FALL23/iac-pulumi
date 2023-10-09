authError = {
  AUTH_101: {
    statusCode: 401,
    code: "AUTH_101",
    msg: "Missing authorization header",
    description:
      "Expected value is a base64 encoded token in format username:password",
    timestamp: new Date().toISOString(),
  },
  AUTH_102: {
    statusCode: 401,
    code: "AUTH_102",
    msg: "Invalid authorization header",
    description:
      "Expected value is a base64 encoded token in format username:password",
    timestamp: new Date().toISOString(),
  },
  AUTH_103: {
    statusCode: 401,
    code: "AUTH_103",
    msg: "Invalid credentials",
    description: "Enter a valid token or credentials",
    timestamp: new Date().toISOString(),
  },
  AUTH_104: {
    statusCode: 403,
    code: "AUTH_104",
    msg: "Permission denied",
    description: "You are not authorized for this action",
    timestamp: new Date().toISOString(),
  },
};

class AuthErrorHandler extends Error {
  constructor(errorCode) {
    const { statusCode, msg, description } = authError[errorCode];
    super(msg);
    this.statusCode = statusCode;
    this.msg = msg;
    this.description = description;
  }
}

module.exports = AuthErrorHandler;
