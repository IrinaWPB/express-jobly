"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

describe("POST /jobs", function () {
    const newJob = {
      title: "NewJob",
      salary: 100,
      equity: 0.03,
      companyHandle: "c1"
    };
  
    test("fails for non admin users", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send(newJob)
      expect(resp.statusCode).toEqual(401);
      expect(resp.body).toEqual({
        "error": {
          "message": "Unauthorized",
          "status": 401
        }
      });
    });
  
    test("ok for admins", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send(newJob)
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(201);
      expect(resp.body).toEqual({
        job : {
            title: "NewJob",
            salary: 100,
            equity: "0.03",
            companyHandle: "c1"
        }
      });
    });
  
    test("bad request with missing data", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send({
            //no title sent
            salary: 50,
            equity: 0.02})
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request with invalid data", async function () {
      const resp = await request(app)
          .post("/jobs")
          .send({
            //invalid "salary" type sent
            title: "new",
            salary: "string",
            equity: 0.02
          })
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(400);
    });
  });

/************************************** GET /companies */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
      const resp = await request(app).get("/jobs");
      expect(resp.body).toEqual({
        jobs:
            [ {
                id: expect.any(Number),
                title: 'j1',
                salary: 10,
                equity: null,
                companyHandle: 'c1'
            },
            {
                id: expect.any(Number),
                title: 'j2',
                salary: 20,
                equity: '0',
                companyHandle: 'c2'
            },
            {
                id: expect.any(Number),
                title: 'j3',
                salary: 30,
                equity: "0.02",
                companyHandle: 'c3'
            }],
      });
    });
  
    test("get with filters", async () => {
      const resp = await request(app).get("/jobs?title=j1");
      expect(resp.body).toEqual({
        jobs:[{
                title: 'j1',
                salary: 10,
                equity: null,
                companyHandle: 'c1'
              }]
      })
    })
    
    test("fails to find jobs with given search parameters", async () => {
      const resp = await request(app).get("/jobs?title=nonExistingTitle");
      expect(resp.body).toEqual({ jobs : []})
    })

    test("fails: test next() handler", async function () {
      // there's no normal failure event which will cause this route to fail ---
      // thus making it hard to test that the error-handler works with it. This
      // should cause an error, all right :)
      await db.query("DROP TABLE jobs CASCADE");
      const resp = await request(app)
          .get("/jobs")
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(500);
    });
  });

  describe("GET /jobs/:title", function () {
    test("works for anon", async function () {
      const resp = await request(app).get(`/jobs/j1`);
      expect(resp.body).toEqual({
        job: {
            id: expect.any(Number),
            title: 'j1',
            salary: 10,
            equity: null,
            companyHandle: 'c1'
        }
      });
    });
  
    test("not found for no such job", async function () {
      const resp = await request(app).get(`/jobs/nope`);
      expect(resp.statusCode).toEqual(404);
    });
  });

  describe("PATCH /jobs/:id", function () {
    test("works for admins", async function () {
      let jobId = await request(app).get(`/jobs/j1`)
      jobId = jobId.body.job.id
      const resp = await request(app)
          .patch(`/jobs/${jobId}`)
          .send({
            title: "j1-new",
          })
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.body).toEqual({
        job: {
            id: jobId,
            title: 'j1-new',
            salary: 10,
            equity: null,
            companyHandle: 'c1'
        },
      });
    });
  
    test("fails for non admins", async function () {
      let jobId = await request(app).get(`/jobs/j1`)
      jobId = jobId.body.job.id
      const resp = await request(app)
          .patch(`/jobs/jobId`)
          .send({
            title: "j1-new",
          })
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("unauth for anon", async function () {
      let jobId = await request(app).get(`/jobs/j1`)
      jobId = jobId.body.job.id
      const resp = await request(app)
          .patch(`/jobs/${jobId}`)
          .send({
            title: "j1-new",
          });
      expect(resp.statusCode).toEqual(401);
    });
  
    test("not found on no such company", async function () {
      const resp = await request(app)
          .patch(`/jobs/0`)
          .send({
            title: "new-title",
          })
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(404);
    });
  
    test("bad request on company-handle change attempt", async function () {
      let jobId = await request(app).get(`/jobs/j1`)
      jobId = jobId.body.job.id
      const resp = await request(app)
          .patch(`/jobs/${jobId}`)
          .send({
            companyHandle: "c1-new",
          })
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(400);
    });
  
    test("bad request on invalid data", async function () {
      let jobId = await request(app).get(`/jobs/j1`)
      jobId = jobId.body.job.id
      const resp = await request(app)
          .patch(`/jobs/${jobId}`)
          .send({
            salary: "not-an-integer",
          })
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(400);
    });
  });

/************************************** DELETE /companies/:handle */

describe("DELETE /jobs/:title", function () {
    test("works for admins", async function () {
      const resp = await request(app)
          .delete(`/jobs/j1`)
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.body).toEqual({ deleted: "j1" });
    });
    
    test("fails for non admins", async function () {
      const resp = await request(app)
          .delete(`/jobs/j1`)
          .set("authorization", `Bearer ${u1Token}`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("unauth for anon", async function () {
      const resp = await request(app)
          .delete(`/jobs/j1`);
      expect(resp.statusCode).toEqual(401);
    });
  
    test("not found for no such company", async function () {
      const resp = await request(app)
          .delete(`/jobs/0`)
          .set("authorization", `Bearer ${a1Token}`);
      expect(resp.statusCode).toEqual(404);
    });
  });
  