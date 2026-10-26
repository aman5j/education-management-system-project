import express from "express";

import {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/auth.controller.js";

import { uploadStaffAvatar } from "../controllers/auth.controller.js";
import staffAvatarUpload from "../middleware/staffAvatarUpload.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);

router.post("/register", register);

router.post("/logout", logout);

router.post("/refresh", refresh);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.get("/me", authenticate, getMe);

router.put("/profile", authenticate, updateProfile);

router.post(
  "/profile/avatar",
  authenticate,
  staffAvatarUpload.single("avatar"),
  uploadStaffAvatar
);

router.put(
  "/change-password",
  authenticate,
  changePassword
);

export default router;