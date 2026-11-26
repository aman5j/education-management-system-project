
import mongoose from "mongoose";
import websiteMenuSettingsSchema from "./schemas/WebsiteMenuSettings.schema.js";

const WebsiteMenuSettings =
  mongoose.models.WebsiteMenuSettings ||
  mongoose.model("WebsiteMenuSettings", websiteMenuSettingsSchema);

export default WebsiteMenuSettings;
