
import express from "express";
import rateLimit from "express-rate-limit";

import {
  createCourseEnquiry,
  getCourseEnquiries,
  getCourseEnquiryById,
  updateCourseEnquiryStatus,
  deleteCourseEnquiry,
} from "../controllers/courseEnquiry.controller.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many enquiries submitted. Please try again later.",
  },
});

// Public enquiry submission
router.post("/", enquiryLimiter, createCourseEnquiry);

// Admin-only enquiry management
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  getCourseEnquiries
);

router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  getCourseEnquiryById
);

router.patch(
  "/:id/status",
  authenticate,
  authorizeRoles("admin"),
  updateCourseEnquiryStatus
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  deleteCourseEnquiry
);

export default router;
