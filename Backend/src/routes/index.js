const { Router } = require("express");

const authRoutes = require("./auth.routes");
const projectRoutes = require("./project.routes");
const workspaceRoutes = require("./workspace.routes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/workspaces", workspaceRoutes);

module.exports = router;
