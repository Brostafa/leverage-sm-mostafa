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

/**
 * Returns an array of random timestamps
 * 
 * @param {String} startDate start date (e.g: 2023-01-10T00:00:00Z)
 * @param {String} endDate end date (e.g: 2023-01-15T00:00:00Z)
 * @param {Number} dateCount how many dates to generate (e.g: 5)
 * @returns {Array<Number>} returns an array of timestamps
 */
const getRandTimestamps = (startDate, endDate, dateCount) => {
  const startTimestamp = new Date(startDate).getTime()
  const endTimestamp = new Date(endDate).getTime()

  return Array(dateCount).fill().map(() => {
    const randomNum = Math.random() * (endTimestamp - startTimestamp) + startTimestamp

    return Math.floor(randomNum)
  }).sort()
}

module.exports = {
  isValidDate,
  getRandTimestamps
}