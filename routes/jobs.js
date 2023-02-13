"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureIsAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, company_handle }
 *
 * Returns { title, salary, equity, company_handle }
 *
 * Authorization required: login
 */

router.post("/", ensureIsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }
    const job = await Job.create(req.body);
    return res.status(201).json({ job });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { jobs: [ { title, salary, equity, company_handle }, ]
 *
 * Can filter on provided search filters:
 * - titleLike (will find case-insensitive, partial matches)
 * - minSalary
 * - hasEquity (trur or false)
 * 
 * If no filters set uses findAll(), if there is a query string --- uses "getByFilter(filters)"
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    let jobs;
    //Checks if any filters were added
    if (Object.keys(req.query).length != 0) {
      jobs = await Job.getByFilter(req.query);
    } else {
      jobs = await Job.findAll();
    }
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  } 
});

/** GET /[title]  =>  { job }
 *
 * Job is { title, salary, equity, company_handle }
 * 
 * Authorization required: none
 */

router.get("/:title", async function (req, res, next) {
  try {
    const job = await Job.get(req.params.title);
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: {title, salary, equity}
 *
 * Returns { title, salary, equity, company_nandle }
 *
 * Authorization required: login
 */

router.patch("/:id", ensureIsAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, jobUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const job = await Job.update(req.params.id, req.body);
    return res.json({job });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[title]  =>  { deleted: title }
 *
 * Authorization: login
 */

router.delete("/:title", ensureIsAdmin, async function (req, res, next) {
  try {
    await Job.remove(req.params.title);
    return res.json({ deleted: req.params.title });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
