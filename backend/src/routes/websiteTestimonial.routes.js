
import express from "express";

import {
  getWebsiteTestimonialSettings,
  uploadWebsiteTestimonialImage,
  updateWebsiteTestimonialSettings,
  getPublicWebsiteTestimonialSettings,
} from "../controllers/websiteTestimonial.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Public endpoint.
router.get(
  "/public/testimonials",
  getPublicWebsiteTestimonialSettings
);

// Admin endpoints.
router.get(
  "/testimonials",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteTestimonialSettings
);

router.put(
  "/testimonials",
  authenticate,
  authorizeRoles("admin"),
  updateWebsiteTestimonialSettings
);

router.post(
  "/testimonials/images",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsiteTestimonialImage
);

export default router;
