const { Router } = require("express");

const projectController = require("../controllers/project.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  requireActiveWorkspaceUserByProjectId,
  requireActiveWorkspaceUserByProjectSlug,
  requireActiveWorkspaceUserFromBody,
  requireActiveWorkspaceUserFromQueryWhenPresent,
  requireWorkspaceOwnerAdminOrMember,
} = require("../middlewares/workspace-access.middleware");

const router = Router();

/**
 * @swagger
 * /api/projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Fetch projects for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspaceId
 *         schema:
 *           type: integer
 *         description: Filter projects by workspace id
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search projects by id, owner, name, description, status, workspace, or tags
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of projects to return per page
 *     responses:
 *       200:
 *         description: Projects fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FetchProjectsResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a new project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateProjectResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * /api/projects/{projectId}/users:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Fetch all users assigned to a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FetchProjectUsersResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Projects
 *     summary: Add a user to a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Project user added successfully
 * /api/projects/{projectId}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Fetch a single project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetProjectResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Projects
 *     summary: Update a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectRequest'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateProjectResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Only the owner can update the project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Delete a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteProjectResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Only the owner can delete the project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", requireAuth, requireActiveWorkspaceUserFromQueryWhenPresent, projectController.getProjects);
router.post(
  "/",
  requireAuth,
  requireActiveWorkspaceUserFromBody,
  requireWorkspaceOwnerAdminOrMember,
  projectController.createProject
);
router.get(
  "/slug/:projectSlug",
  requireAuth,
  requireActiveWorkspaceUserByProjectSlug,
  projectController.getProjectBySlug
);
router.get(
  "/:projectId/users",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.getProjectUsers
);
router.post(
  "/:projectId/users",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.addProjectUser
);
router.patch(
  "/:projectId/users/:userId",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.updateProjectUser
);
router.delete(
  "/:projectId/users/:userId",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.deleteProjectUser
);
router.get(
  "/:projectId",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.getProjectById
);
router.put(
  "/:projectId",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.updateProject
);
router.delete(
  "/:projectId",
  requireAuth,
  requireActiveWorkspaceUserByProjectId,
  projectController.deleteProject
);

module.exports = router;
