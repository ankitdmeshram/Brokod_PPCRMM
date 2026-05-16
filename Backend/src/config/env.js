require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5050,
  frontendDomain: process.env.FRONTEND_DOMAIN || "",
  jwtSecret: process.env.JWT_SECRET || "",
  dbHost: process.env.DB_HOST || "localhost",
  dbUser: process.env.DB_USER || "root",
  dbPassword: process.env.DB_PASS || "",
  dbName: process.env.DB_DATABASE || "",
  dbTimeZone: process.env.DB_TIMEZONE || "+00:00",
};

const requiredVariables = ["DB_DATABASE", "JWT_SECRET"];
const missingVariables = requiredVariables.filter((key) => !process.env[key]);

if (missingVariables.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVariables.join(", ")}`);
}

module.exports = env;
