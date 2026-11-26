
import mongoose from "mongoose";
import websiteBannerSettingsSchema from "./schemas/WebsiteBannerSettings.schema.js";

const WebsiteBannerSettings =
  mongoose.models.WebsiteBannerSettings ||
  mongoose.model("WebsiteBannerSettings", websiteBannerSettingsSchema);

export default WebsiteBannerSettings;
