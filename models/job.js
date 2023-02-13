"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
          `SELECT title
           FROM jobs
           WHERE title = $1`,
        [title]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title}`);

    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
        [
          title,
          salary,
          equity,
          companyHandle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /** Find all jobs.
   *
   * Returns [{ title, salary, equity, company_handle }, ...]
   * */

  static async findAll() {
    const jobsRes = await db.query(
          `SELECT id,
                  title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           ORDER BY title`);
    return jobsRes.rows;
  }

  /** Given a job title, return data about the job.
   *
   * Returns { title, salary, equity, company_handle }
   *
   * Throws NotFoundError if not found.
   **/

  static async get(title) {
    const jobRes = await db.query(
          `SELECT id, title,
                  salary,
                  equity,
                  company_handle AS "companyHandle"
           FROM jobs
           WHERE title = $1`,
        [title]);

    const job = jobRes.rows[0];
    if (!job) throw new NotFoundError(`No job: ${title}`);
    return job;
  }
  
  static async getByCompany(company) {
    const jobRes = await db.query(
      `SELECT id, title,
              salary,
              equity,
              company_handle AS "companyHandle"
       FROM jobs
       WHERE company_handle = $1`,
    [company]);

    const jobs = jobRes.rows;
    if (jobs.length === 0) throw new NotFoundError(`No job: ${title}`);
    return jobs;
  }
  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {title, salary, equity, company_handle}
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data, {});
    const idIdx = "$" + (values.length + 1);
    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idIdx} 
                      RETURNING id, title, 
                                salary, 
                                equity, 
                                company_handle AS "companyHandle"`;
 
      const result = await db.query(querySql, [...values, id]);
      const job = result.rows[0];
      if (!job) throw new NotFoundError(`No job with id ${id}`);
      return job
  }
  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(title) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE title = $1
           RETURNING title`,
        [title]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${title}`);
  }

   /** Get companies based on users search.
   *
   * First checks if all the keys of query object are valid(name, minEmployees, maxEmployees)
   *
   * Create starting query string (SELECT * FROM companies WHERE)
   * Creates 2 arrays, 1 for whereFilters(to add to query string), 2nd -- for filters values
   *
   * Returns filtered list of companies(empty if no companies found)
   */

  static async getByFilter(filters) {
    for (let key in filters) {
      if (key !== "title" & key !== "minSalary" & key !== "hasEquity") {
        throw new BadRequestError('Invalid filters included')
      }
    }
    
    let queryString = `SELECT title, salary, equity, company_handle as "companyHandle" FROM jobs WHERE `
    let values = []
    let whereFilters = []

    if (filters.equity >= 0.1) {
      throw new BadRequestError("Invalid equity")
    }

    if (filters.title) {
      values.push(`%${filters.title}%`)
      let subquery = `title ILIKE $${values.length}`
      whereFilters.push(subquery)
    }

    if (filters.minSalary) {
      values.push(filters.minSalary)
      let subquery = `salary >= $${values.length}`
      whereFilters.push(subquery)
    }

    if (filters.hasEquity === true) {
      let subquery = `equity IS NOT NULL AND equity > 0`
      whereFilters.push(subquery)
    }

    queryString += whereFilters.join(" AND ")

    const results = await db.query(queryString, values)
    return results.rows;
  }
}

module.exports = Job
