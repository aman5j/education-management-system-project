
import mongoose from "mongoose";
import notificationSchema from "./schemas/Notification.schema.js";

const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);

export default Notification;
