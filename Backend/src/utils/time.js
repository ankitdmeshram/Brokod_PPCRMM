const moment = require("moment-timezone");

const DEFAULT_TIMEZONE = "UTC";

const nowUtc = () => moment.tz(DEFAULT_TIMEZONE);

const toUtcMoment = (value) => moment.tz(value, DEFAULT_TIMEZONE);

const isValidDateTime = (value) => toUtcMoment(value).isValid();

const formatUtcDate = (value = nowUtc()) => toUtcMoment(value).format("YYYY-MM-DD");

const addUtcDays = (dateValue, days) =>
  toUtcMoment(dateValue)
    .add(days, "days")
    .format("YYYY-MM-DD");

const toUtcIsoString = (value = nowUtc()) => toUtcMoment(value).toISOString();

const compareUtc = (leftValue, rightValue) =>
  toUtcMoment(leftValue).valueOf() - toUtcMoment(rightValue).valueOf();

const toUtcDate = (value = nowUtc()) => toUtcMoment(value).toDate();

module.exports = {
  addUtcDays,
  compareUtc,
  DEFAULT_TIMEZONE,
  formatUtcDate,
  isValidDateTime,
  nowUtc,
  toUtcDate,
  toUtcIsoString,
  toUtcMoment,
};
