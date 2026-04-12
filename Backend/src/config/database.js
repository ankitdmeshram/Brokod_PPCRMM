const path = require("path");
const mysql = require("mysql");
const knex = require("knex");

const env = require("./env");

const knexConfig = {
  client: "mysql",
  connection: {
    host: env.dbHost,
    user: env.dbUser,
    password: env.dbPassword,
    database: env.dbName,
  },
  pool: {
    min: 0,
    max: 10,
  },
  migrations: {
    directory: path.join(__dirname, "../../migrations"),
  },
};

let db;

const getDb = () => {
  if (!db) {
    throw new Error("Database has not been initialized yet.");
  }

  return db;
};

const ensureDatabaseExists = async () =>
  new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
      host: env.dbHost,
      user: env.dbUser,
      password: env.dbPassword,
    });

    connection.connect((connectError) => {
      if (connectError) {
        reject(connectError);
        return;
      }

      connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.dbName}\``,
        (databaseError) => {
          connection.end();

          if (databaseError) {
            reject(databaseError);
            return;
          }

          resolve();
        }
      );
    });
  });

const initializeDatabase = async () => {
  await ensureDatabaseExists();

  if (!db) {
    db = knex(knexConfig);
  }

  await db.migrate.latest();
};

const closePool = async () => {
  if (!db) {
    return;
  }

  await db.destroy();
  db = null;
};

module.exports = {
  closePool,
  getDb,
  initializeDatabase,
  knexConfig,
};
