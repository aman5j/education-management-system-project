
import express from "express";

import {
  listRoles,
  listAvailablePermissions,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All Role Management endpoints require an authenticated Admin.
router.use(authenticate);
router.use(authorizeRoles("admin"));

// Available permissions for the Role Management UI.
router.get("/permissions", listAvailablePermissions);

// Custom staff roles.
router.get("/", listRoles);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
