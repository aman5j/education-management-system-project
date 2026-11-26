
import mongoose from "mongoose";
import websiteFooterSettingsSchema from "./schemas/WebsiteFooterSettings.schema.js";

const WebsiteFooterSettings =
  mongoose.models.WebsiteFooterSettings ||
  mongoose.model("WebsiteFooterSettings", websiteFooterSettingsSchema);

export default WebsiteFooterSettings;
