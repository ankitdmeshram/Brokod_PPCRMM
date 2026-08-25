const { Router } = require("express");

const authController = require("../controllers/auth.controller");
const { requireAuth, requireSuperAdmin } = require("../middlewares/auth.middleware");

const router = Router();

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get the currently signed-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentUserResponse'
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   patch:
 *     tags:
 *       - Auth
 *     summary: Update the currently signed-in user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCurrentUserRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CurrentUserResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Inactive account
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already exists
 *
 * /api/auth/signin:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Sign in an existing user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SigninRequest'
 *     responses:
 *       200:
 *         description: Signin successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SigninResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/auth/signup:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: Signup successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
/**
 * @swagger
 * /api/auth/trails:
 *   get:
 *     tags:
 *       - Auth
 *     summary: List authentication trail records
 *     description: Returns paginated authentication events. Super admin only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: sortBy
 *         description: Column used to sort the result set.
 *         schema:
 *           type: string
 *           default: createdAt
 *           enum: [id, userId, attemptedEmail, eventType, outcome, failureReason, ipAddress, userAgent, requestId, sessionId, createdAt]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           default: desc
 *           enum: [asc, desc]
 *       - in: query
 *         name: search
 *         description: Partial attempted-email search; a numeric value also matches user ID.
 *         schema: { type: string }
 *       - in: query
 *         name: id
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: userId
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: attemptedEmail
 *         description: Case-normalized partial match.
 *         schema: { type: string }
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [signin, signout, signup, token_rejected]
 *       - in: query
 *         name: outcome
 *         schema:
 *           type: string
 *           enum: [success, failure]
 *       - in: query
 *         name: failureReason
 *         description: Partial match.
 *         schema: { type: string }
 *       - in: query
 *         name: ipAddress
 *         schema: { type: string }
 *       - in: query
 *         name: userAgent
 *         description: Partial match.
 *         schema: { type: string }
 *       - in: query
 *         name: requestId
 *         schema: { type: string }
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: createdAt
 *         description: Exact creation timestamp.
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: createdFrom
 *         description: Inclusive creation-time lower bound.
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: createdTo
 *         description: Inclusive creation-time upper bound.
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Authentication trails fetched successfully
 *       400:
 *         description: Invalid pagination or filter
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Only super admins can access this resource
 */
/**
 * @swagger
 * /api/auth/signout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Record an explicit user signout
 *     description: Records an audit-only signout event. The JWT is not revoked.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Signout recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Signout successful.
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Inactive account
 */
router.get("/trails", requireAuth, requireSuperAdmin, authController.getAuthTrails);
router.get("/me", requireAuth, authController.me);
router.patch("/me", requireAuth, authController.updateMe);
router.post("/signin", authController.signin);
router.post("/signout", requireAuth, authController.signout);
router.post("/signup", authController.signup);

module.exports = router;
