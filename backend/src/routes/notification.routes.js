import express from "express";

import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

import {
  authenticate,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

router.get(
  "/",
  authenticate,
  getNotifications
);

router.get(
  "/unread-count",
  authenticate,
  getUnreadCount
);

router.patch(
  "/read-all",
  authenticate,
  markAllNotificationsAsRead
);

router.patch(
  "/:id/read",
  authenticate,
  markNotificationAsRead
);

router.delete(
  "/:id",
  authenticate,
  deleteNotification
);

export default router;