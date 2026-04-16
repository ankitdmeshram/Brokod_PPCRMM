const { Router } = require("express");

const userController = require("../controllers/user.controller");
const { requireAuth, requireSuperAdmin } = require("../middlewares/auth.middleware");

const router = Router();

router.get("/", requireAuth, requireSuperAdmin, userController.getUsers);
router.put("/:userId", requireAuth, requireSuperAdmin, userController.updateUser);
router.patch("/:userId/status", requireAuth, requireSuperAdmin, userController.updateUserStatus);
router.delete("/:userId", requireAuth, requireSuperAdmin, userController.deleteUser);

module.exports = router;
