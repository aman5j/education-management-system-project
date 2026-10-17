
import express from "express";
import {
  listStaff,
  createStaff,
} from "../controllers/staff.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", listStaff);
router.post("/", createStaff);

export default router;
