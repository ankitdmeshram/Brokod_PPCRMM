const { Router } = require("express");

const authRoutes = require("./auth.routes");
const projectRoutes = require("./project.routes");
const userRoutes = require("./user.routes");
const workspaceRoutes = require("./workspace.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/users", userRoutes);
router.use("/workspaces", workspaceRoutes);

module.exports = router;
