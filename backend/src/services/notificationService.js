import Notification from "../models/Notification.js";
import User from "../models/User.js";

/*
|--------------------------------------------------------------------------
| CREATE ONE NOTIFICATION
|--------------------------------------------------------------------------
*/

export const createNotification =
  async ({
    recipient,
    title,
    message,
    type = "system",
    link = "",
    metadata = {},
  }) => {
    if (!recipient) {
      throw new Error(
        "Notification recipient is required."
      );
    }

    return Notification.create({
      recipient,
      title,
      message,
      type,
      link,
      metadata,
    });
  };

/*
|--------------------------------------------------------------------------
| CREATE NOTIFICATIONS FOR ADMINS
|--------------------------------------------------------------------------
*/

export const notifyAdmins =
  async ({
    title,
    message,
    type = "system",
    link = "",
    metadata = {},
  }) => {
    const admins =
      await User.find({
        role: "admin",
        status: "active",
      })
        .select("_id")
        .lean();

    if (!admins.length) {
      return [];
    }

    const notifications =
      admins.map((admin) => ({
        recipient: admin._id,
        title,
        message,
        type,
        link,
        metadata,
      }));

    return Notification.insertMany(
      notifications
    );
  };

/*
|--------------------------------------------------------------------------
| CREATE NOTIFICATIONS FOR MULTIPLE USERS
|--------------------------------------------------------------------------
*/

export const notifyUsers =
  async ({
    recipients,
    title,
    message,
    type = "system",
    link = "",
    metadata = {},
  }) => {
    if (
      !Array.isArray(recipients) ||
      recipients.length === 0
    ) {
      return [];
    }

    const uniqueRecipients = [
      ...new Set(
        recipients
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    const notifications =
      uniqueRecipients.map(
        (recipient) => ({
          recipient,
          title,
          message,
          type,
          link,
          metadata,
        })
      );

    return Notification.insertMany(
      notifications
    );
  };