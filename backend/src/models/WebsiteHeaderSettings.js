
import mongoose from "mongoose";
import websiteHeaderSettingsSchema from "./schemas/WebsiteHeaderSettings.schema.js";

const WebsiteHeaderSettings =
  mongoose.models.WebsiteHeaderSettings ||
  mongoose.model("WebsiteHeaderSettings", websiteHeaderSettingsSchema);

export default WebsiteHeaderSettings;
