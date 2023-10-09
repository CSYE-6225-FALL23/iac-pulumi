const chai = require("chai");

// Import the module you want to test
const Connection = require("../db").Connection;

describe("DB Connection", () => {
  it("should connect to db", async () => {
    const isDbConnected = await Connection.testConnection();
    chai.assert.isTrue(isDbConnected);
  });

  after("close open connection", async (done) => {
    Connection.closeConnection().then(() => {
      process.exit(0);
    });
  });
});
