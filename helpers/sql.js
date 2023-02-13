const { BadRequestError } = require("../expressError");

  /** Creates object with info to partially update a user/company info.
   * Takes 2 arguments. 1st - data to update, 2nd - properties to convert to sql.
   *
   * Collects an array of keys we want to update based on sent info (dataToUpdate). 
   * 
   * Format data to send a query to database
   * {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
   *
   * Returns {
   *          setCols: string with fields to update formatted to make queries., 
   *          values: list of new values
   *         }
   *
   * Throws BadRequestError if no data sent.
   */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
