/**
 * Validate if date is valid
 * 
 * https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
 * 
 * @param {String} date date string (e.g: 2023-01-10T00:00:00Z)
 * @returns {Boolean}
 */
const isValidDate = date => {
  const d = new Date(date)
  // test against this format -> 2023-02-15T00:00:00Z
  const isoRegexp = /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9].+Z/

  return d instanceof Date && !isNaN(d) && isoRegexp.test(date)
}

module.exports = {
  isValidDate,
}