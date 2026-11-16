
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

// Public image delivery.
router.get("/banner-image/:version", getWebsiteBannerImage);

// Admin-only banner management.
router.use(authenticate);
router.use(authorizeRoles("admin"));

router.get("/banner", getWebsiteBannerSettings);

// router.post(
//   "/banner/slides",
//   websiteBannerUpload.single("image"),
//   uploadWebsiteBannerSlide
// );
router.post(
  "/banner/slides",
  websiteBannerUpload,
  uploadWebsiteBannerSlide
);

router.delete(
  "/banner/slides/:slideKey",
  deleteWebsiteBannerSlide
);

router.put(
  "/banner/reorder",
  reorderWebsiteBannerSlides
);

export default router;
