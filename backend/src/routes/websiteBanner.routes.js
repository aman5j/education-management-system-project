
import express from "express";

import {
  getWebsiteBannerSettings,
  uploadWebsiteBannerSlide,
  deleteWebsiteBannerSlide,
  reorderWebsiteBannerSlides,
  getWebsiteBannerImage,
} from "../controllers/websiteBanner.controller.js";

import websiteBannerUpload from "../middleware/websiteBannerUpload.js";

import {
  authenticate,
  authorizeRoles,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// PUBLIC: Banner image delivery
router.get(
  "/banner-image/:version",
  getWebsiteBannerImage
);

// Public homepage banner settings
router.get(
  "/public/banner",
  getWebsiteBannerSettings
);


// ADMIN: Get banner settings
router.get(
  "/banner",
  authenticate,
  authorizeRoles("admin"),
  getWebsiteBannerSettings
);

// ADMIN: Upload banner slide
router.post(
  "/banner/slides",
  authenticate,
  authorizeRoles("admin"),
  websiteBannerUpload,
  uploadWebsiteBannerSlide
);

// ADMIN: Delete banner slide
router.delete(
  "/banner/slides/:slideKey",
  authenticate,
  authorizeRoles("admin"),
  deleteWebsiteBannerSlide
);

// ADMIN: Reorder banner slides
router.put(
  "/banner/reorder",
  authenticate,
  authorizeRoles("admin"),
  reorderWebsiteBannerSlides
);

export default router;
