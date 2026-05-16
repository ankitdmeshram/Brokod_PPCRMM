const { Router } = require("express");

const workspaceController = require("../controllers/workspace.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  requireActiveWorkspaceUser,
  requireWorkspaceOwnerAdminOrMember,
  requireWorkspaceOwner,
  requireWorkspaceOwnerOrAdmin,
} = require("../middlewares/workspace-access.middleware");

const router = Router();

/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: Fetch workspaces for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspaces fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workspaces:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workspace'
 *       401:
 *         description: Missing or invalid token
 *   post:
 *     tags:
 *       - Workspaces
 *     summary: Create a new workspace
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workspaceName
 *             properties:
 *               workspaceName:
 *                 type: string
 *                 example: My Workspace
 *               workspaceDescription:
 *                 type: string
 *                 example: Workspace for product planning and delivery.
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Workspace created successfully.
 *                 workspace:
 *                   $ref: '#/components/schemas/Workspace'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 * /api/workspaces/{workspaceId}:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: Fetch users for a workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workspace users fetched successfully
 *       401:
 *         description: Missing or invalid token
 *       404:
 *         description: Workspace not found
 *   post:
 *     tags:
 *       - Workspaces
 *     summary: Invite a user to a workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [owner, admin, member, viewer]
 *     responses:
 *       201:
 *         description: Workspace user invited successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Only the workspace owner or admin can invite users
 *       404:
 *         description: Workspace not found
 *   put:
 *     tags:
 *       - Workspaces
 *     summary: Update a workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workspaceName
 *             properties:
 *               workspaceName:
 *                 type: string
 *                 example: Updated Workspace
 *               workspaceDescription:
 *                 type: string
 *                 example: Updated workspace description.
 *     responses:
 *       200:
 *         description: Workspace updated successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Only the owner or admin can update the workspace
 *       404:
 *         description: Workspace not found
 *   delete:
 *     tags:
 *       - Workspaces
 *     summary: Soft delete a workspace
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workspace deleted successfully
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Only the owner can delete the workspace
 *       404:
 *         description: Workspace not found
 */
router.get("/", requireAuth, workspaceController.getWorkspaces);
router.post("/", requireAuth, workspaceController.createWorkspace);
router.get(
  "/:workspaceId/users",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwnerAdminOrMember,
  workspaceController.getWorkspaceUsers
);
router.get(
  "/:workspaceId/notifications",
  requireAuth,
  requireActiveWorkspaceUser,
  workspaceController.getWorkspaceNotifications
);
router.post(
  "/:workspaceId/users",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwnerOrAdmin,
  workspaceController.inviteWorkspaceUser
);
router.patch(
  "/:workspaceId/users/:userId",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwnerOrAdmin,
  workspaceController.updateWorkspaceUser
);
router.patch(
  "/:workspaceId/users/:userId/status",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwner,
  workspaceController.updateWorkspaceUserStatus
);
router.delete(
  "/:workspaceId/users/:userId",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwnerOrAdmin,
  workspaceController.deleteWorkspaceUser
);
router.put(
  "/:workspaceId",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwnerOrAdmin,
  workspaceController.updateWorkspace
);
router.delete(
  "/:workspaceId",
  requireAuth,
  requireActiveWorkspaceUser,
  requireWorkspaceOwner,
  workspaceController.deleteWorkspace
);

module.exports = router;
