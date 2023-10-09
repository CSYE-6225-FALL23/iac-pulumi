const chai = require("chai");
const request = require("supertest");

const Connection = require("database").Connection;

const app = require("../index");

// describe("Integration testing", () => {
//   it("should connect to DB", (done) => {
//     request(app).get("/healthz").expect(200, done);
//   });

//   after("close open connection", async (done) => {
//     Connection.closeConnection();
//     done();
//   });
// });

describe("DB Connection", () => {
  it("Get auth token", async (done) => {
    request(app)
      .post("/auth")
      .send({ username: "csye", password: "csye" })
      .set("Accept", "application/json")
      .expect(200)
      .end(function (err, res) {
        if (err) throw err;
      }, done());
  });

  it("close open connection", (done) => {
    Connection.closeConnection().then((isDBClosed) => {
      chai.assert.isTrue(isDBClosed);
      done();
      process.exit(0);
    });
  });
});
