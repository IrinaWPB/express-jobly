"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError, UnauthorizedError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
    const newJob = {
      title: "NewJob",
      salary: 50,
      equity: '0.03',
      companyHandle: 'c1'
    };
    test("works with valid data", async function () {
      let job = await Job.create(newJob);
      expect(job).toEqual(newJob);
      
      //Checks if newJob is in db
      const result = await db.query(
            `SELECT title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE title = 'NewJob'`);
      expect(result.rows).toEqual([
        {
            title: "NewJob",
            salary: 50,
            equity: "0.03",
            companyHandle: 'c1'
        }
      ]);
    });
  
    test("bad request with dupe", async function () {
      try {
        await Job.create(newJob);
        await Job.create(newJob);
        fail();
      } catch (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      }
    });
})
/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      { id: expect.any(Number),
        title: 'j1',
        salary: 10,
        equity: null,
        companyHandle: 'c1'
      },
      { id: expect.any(Number),
        title: 'j2',
        salary: 20,
        equity: '0',
        companyHandle: 'c2'
      },
      { id: expect.any(Number),
        title: 'j3',
        salary: 30,
        equity: "0.02",
        companyHandle: 'c3'
      },
    ]);
  });
});

/************************************** getByFilter */

describe("getByFilter", function () {
    test('works with 1 valid filter', async () => {
      const filters = {title: 'j1'}
      const results = await Job.getByFilter(filters)
  
      expect(results).toEqual([ {"title": "j1",
                                "salary": 10,
                                "equity": null,
                                "companyHandle": "c1"} ])
    })
  
    test('works, title contains string "2"', async () => {
      const filters = {title: '2'}
      const results = await Job.getByFilter(filters)
  
      expect(results).toEqual([ {"title": "j2",
                                "salary": 20,
                                "equity": "0",
                                "companyHandle": "c2"},
                                ])
    })
    
    test('works with 2 filters', async () => {
      const filters = {title: 'j',
                       minSalary: 20}
      const results = await Job.getByFilter(filters)
  
      expect(results).toEqual([
                {
                    "title": "j2",
                    "salary": 20,
                    "equity": "0",
                    "companyHandle": "c2"
                },
                {
                    "title": "j3",
                    "salary": 30,
                    "equity": "0.02",
                    "companyHandle": "c3"
                }])
})
  
    test('fails if wrong filters sent', async () => {
      const filters = {type: 12}
      try {
        await Job.getByFilter(filters)
      } catch (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      }
    })
  
    test('hasEquity is set to true', async () => {
      const filters = {hasEquity: true}
      const results = await Job.getByFilter(filters)
      expect(results).toEqual([
                {
                    "title": "j3",
                    "salary": 30,
                    "equity": "0.02",
                    "companyHandle": "c3"
                }])
    })
})

/************************************** get */

describe("get", function () {
    test("works", async function () {
      let job = await Job.get("j1");
      expect(job).toEqual({
                    "id": expect.any(Number),
                    "title": "j1",
                    "salary": 10,
                    "equity": null,
                    "companyHandle": "c1"
                });
    });
  
    test("not found if no such job", async function () {
      try {
        await Job.get("badtitle");
        fail();
      } catch (err) {
        expect(err instanceof NotFoundError).toBeTruthy();
      }
    });
});

/************************************** update */

describe("update", function () {
    const updateData = {
      title: "New",
      salary: 50,
      equity: 0.03
    };

    test("works", async function () {
      const jobToUpdate = await db.query(`SELECT id FROM jobs WHERE title ='j1'`)
      const jobId = jobToUpdate.rows[0].id  
      let job = await Job.update(jobId, updateData);
      expect(job).toEqual({
        id: expect.any(Number),
        title: "New",
        salary: 50,
        equity: "0.03",
        companyHandle: "c1"
      });
  
      const result = await db.query(
            `SELECT title, salary, equity, company_handle AS "companyHandle"
             FROM jobs
             WHERE id = ${jobId}`);
      expect(result.rows).toEqual([{
        title: "New",
        salary: 50,
        equity: "0.03",
        companyHandle: "c1",
      }]);
    });
  
    test("fails: null fields", async function () {
      const jobToUpdate = await db.query(`SELECT id FROM jobs WHERE title ='j1'`)
      const jobId = jobToUpdate.rows[0].id  
      const updateDataSetNulls = {
            title: null,
            salary: 50,
            equity: "0.03",
            companyHandle: null
      };
      try {
        await Job.update(jobId, updateDataSetNulls);
        fail()
      } catch (err) {
        console.log(err)
        expect(err.code).toEqual(expect.any(String));
      }
    });
  
    test("not found if no such job", async function () {
      try {
        await Job.update(300, updateData);
        fail();
      } catch (err) {
        expect(err instanceof NotFoundError).toBeTruthy();
      }
    });
  
    test("bad request with no data", async function () {
      const jobToUpdate = await db.query(`SELECT id FROM jobs WHERE title ='j1'`)
      const jobId = jobToUpdate.rows[0].id  
      try {
        await Job.update(jobId, {});
        fail();
      } catch (err) {
        expect(err instanceof BadRequestError).toBeTruthy();
      }
    });
  });
/************************************** remove */

describe("remove", function () {
    test("works", async function () {
      await Job.remove("j1");
      const res = await db.query(
          "SELECT title FROM jobs WHERE title='j1'");
      expect(res.rows.length).toEqual(0);
    });
  
    test("not found if no such job", async function () {
      try {
        await Job.remove("nope");
        fail();
      } catch (err) {
        expect(err instanceof NotFoundError).toBeTruthy();
      }
    });
  });
