import mongoose from "mongoose";

import Notification from "../models/Notification.js";

/*
|--------------------------------------------------------------------------
| GET /api/notifications
|--------------------------------------------------------------------------
*/

export const getNotifications =
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        unreadOnly = "false",
      } = req.query;

      const currentPage = Math.max(
        Number(page) || 1,
        1
      );

      const perPage = Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        50
      );

      const query = {
        recipient: req.user._id,
      };

      if (unreadOnly === "true") {
        query.isRead = false;
      }

      const skip =
        (currentPage - 1) *
        perPage;

      const [
        notifications,
        total,
        unreadCount,
      ] = await Promise.all([
        Notification.find(query)
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(perPage)
          .lean(),

        Notification.countDocuments(
          query
        ),

        Notification.countDocuments({
          recipient:
            req.user._id,
          isRead: false,
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount,
          pagination: {
            page: currentPage,
            limit: perPage,
            total,
            totalPages:
              Math.ceil(
                total / perPage
              ) || 1,
          },
        },
      });
    } catch (error) {
      console.error(
        "Get notifications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load notifications.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/notifications/unread-count
|--------------------------------------------------------------------------
*/

export const getUnreadCount =
  async (req, res) => {
    try {
      const count =
        await Notification.countDocuments({
          recipient: req.user._id,
          isRead: false,
        });

      return res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
        },
      });
    } catch (error) {
      console.error(
        "Get unread count error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load unread count.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/:id/read
|--------------------------------------------------------------------------
*/

export const markNotificationAsRead =
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification ID.",
        });
      }

      const notification =
        await Notification.findOneAndUpdate(
          {
            _id: id,
            recipient: req.user._id,
          },
          {
            $set: {
              isRead: true,
            },
          },
          {
            new: true,
          }
        ).lean();

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification marked as read.",
        data: notification,
      });
    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update notification.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| PATCH /api/notifications/read-all
|--------------------------------------------------------------------------
*/

export const markAllNotificationsAsRead =
  async (req, res) => {
    try {
      await Notification.updateMany(
        {
          recipient: req.user._id,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
          },
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "All notifications marked as read.",
      });
    } catch (error) {
      console.error(
        "Mark all notifications read error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to update notifications.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| DELETE /api/notifications/:id
|--------------------------------------------------------------------------
*/

export const deleteNotification =
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid notification ID.",
        });
      }

      const notification =
        await Notification.findOneAndDelete({
          _id: id,
          recipient: req.user._id,
        });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message:
            "Notification not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Notification deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete notification.",
      });
    }
  };