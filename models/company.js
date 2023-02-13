"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
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
      if (key !== "name" & key !== "maxEmployees" & key !== "minEmployees") {
        throw new BadRequestError('Invalid filters included')
      }
    }
    
    let queryString = `SELECT handle, name, description, num_employees as "numEmployees", logo_URL AS "logoUrl" FROM companies WHERE `
    let values = []
    let whereFilters = []

    if (filters.maxEmployees < filters.minEmployees) {
      throw new BadRequestError("Max/min employees filters are not valid")
    }

    if (filters.name) {
      values.push(`%${filters.name}%`)
      let subquery = `name ILIKE $${values.length}`
      whereFilters.push(subquery)
    }

    if (filters.maxEmployees) {
      values.push(filters.maxEmployees)
      let subquery = `num_employees <= $${values.length}`
      whereFilters.push(subquery)
    }

    if (filters.minEmployees) {
      values.push(filters.minEmployees)
      let subquery = `num_employees >= $${values.length}`
      whereFilters.push(subquery)
    }
    queryString += whereFilters.join(" AND ")
    console.log(queryString, values)

    const results = await db.query(queryString, values)
    return results.rows;
  }
}

module.exports = Company
