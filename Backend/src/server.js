const app = require("./app");
const env = require("./config/env");
const { initializeDatabase, closePool } = require("./config/database");

const startServer = async () => {
  try {
    await initializeDatabase();

    const server = app.listen(env.port, () => {
      console.log(`Backend listening on port ${env.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully.`);

      server.close(async () => {
        await closePool();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    await closePool();
    process.exit(1);
  }
};

void startServer();
