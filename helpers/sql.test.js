const { sqlForPartialUpdate } = require('./sql.js')
const { BadRequestError } = require('../expressError')

describe('SQL for partial update', () => {
    test('Data sent, return object created', () => {
        const data = { "firstname": "Max", "lastname": "Smith" }
        const jsToSql = { firstname: "first_name", lastname: "last_name"}
        const result = sqlForPartialUpdate(data, jsToSql)

        expect(result).toEqual({ setCols: '"first_name"=$1, "last_name"=$2',
                                 values:  ["Max", "Smith"]})
    })
    test('No data sent (0 fields to update)', () => {
        const data = {}
        const jsToSql = { firstname: "first_name", lastname: "last_name"}
        try {
            sqlForPartialUpdate(data, jsToSql)
        } catch(e) {
            expect(e instanceof BadRequestError).toBeTruthy()
        }
    })
})