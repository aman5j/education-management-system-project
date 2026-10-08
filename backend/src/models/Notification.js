import mongoose from "mongoose";

const notificationSchema =
  new mongoose.Schema(
    {
      recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500,
      },

      type: {
        type: String,
        enum: [
          "admission",
          "payment_received",
          "payment_pending",
          "exam_scheduled",
          "exam_result",
          "certificate",
          "website",
          "enquiry",
          "system",
        ],
        default: "system",
        index: true,
      },

      isRead: {
        type: Boolean,
        default: false,
        index: true,
      },

      link: {
        type: String,
        default: "",
        trim: true,
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    {
      timestamps: true,
    }
  );

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

const Notification =
  mongoose.model(
    "Notification",
    notificationSchema
  );

export default Notification;