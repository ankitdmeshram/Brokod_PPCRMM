const express = require("express");
const cors = require("cors");

const env = require("./config/env");
const { swaggerSpec, swaggerUi } = require("./config/swagger");
const routes = require("./routes");
const notFoundMiddleware = require("./middlewares/not-found.middleware");
const errorHandlerMiddleware = require("./middlewares/error-handler.middleware");

const app = express();

app.use(
  cors({
    origin: env.frontendDomain || true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_request, response) => {
  response.status(200).json({ ok: true });
});

app.get("/api-docs.json", (_request, response) => {
  response.status(200).json(swaggerSpec);
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;
