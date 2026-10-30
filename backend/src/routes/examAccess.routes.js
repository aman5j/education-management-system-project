import express from "express";

import {
  getExamAccessRequests,
  reviewExamAccessRequest,
} from "../controllers/examAccess.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getExamAccessRequests);

router.patch("/:requestId/review", reviewExamAccessRequest);

export default router;