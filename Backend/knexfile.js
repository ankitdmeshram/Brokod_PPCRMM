const { knexConfig } = require("./src/config/database");

module.exports = {
  development: knexConfig,
  production: knexConfig,
};
