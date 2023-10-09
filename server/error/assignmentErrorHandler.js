const assignmentError = {
  ASSGN_101: {
    statusCode: 404,
    code: "ASSGN_101",
    msg: "Assignment not found",
    description: "Expected a valid assignment",
    timestamp: new Date().toISOString(),
  },
  ASSGN_102: {
    statusCode: 400,
    code: "ASSGN_102",
    msg: "Invalid deadline",
    description: "Deadline has to be in the future",
    timestamp: new Date().toISOString(),
  },
  ASSGN_103: {
    statusCode: 400,
    code: "ASSGN_103",
    msg: "Invalid ID",
    description: "Expected a valid id",
    timestamp: new Date().toISOString(),
  },
};

class AssignmentErrorHandler extends Error {
  constructor(errorCode) {
    const { statusCode, msg, description } = assignmentError[errorCode];
    super(msg);
    this.statusCode = statusCode;
    this.msg = msg;
    this.description = description;
  }
}

module.exports = AssignmentErrorHandler;
