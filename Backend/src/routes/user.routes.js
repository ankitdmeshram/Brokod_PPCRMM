const { Router } = require("express");

const userController = require("../controllers/user.controller");
const { requireAuth, requireSuperAdmin } = require("../middlewares/auth.middleware");

const router = Router();

/**
 * @swagger
 * /api/users/export/json:
 *   get:
 *     tags:
 *       - Users
 *     summary: Export the full application database as JSON
 *     description: Returns all application tables as a downloadable JSON snapshot. Super admin only.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Database exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Only super admins can access this resource
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/export/json", requireAuth, requireSuperAdmin, userController.exportDatabase);
router.get("/", requireAuth, requireSuperAdmin, userController.getUsers);
router.put("/:userId", requireAuth, requireSuperAdmin, userController.updateUser);
router.patch("/:userId/status", requireAuth, requireSuperAdmin, userController.updateUserStatus);
router.delete("/:userId", requireAuth, requireSuperAdmin, userController.deleteUser);

module.exports = router;
