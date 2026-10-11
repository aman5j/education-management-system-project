
import express from "express";

import {
  getExamReviewQueue,
  reviewExam,
} from "../controllers/examReview.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/", getExamReviewQueue);
router.patch("/:id/decision", reviewExam);

export default router;
