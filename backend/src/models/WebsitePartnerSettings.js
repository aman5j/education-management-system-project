
// backend/src/models/WebsitePartnerSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsitePartnerSettings.schema.js";

export default mongoose.models.WebsitePartnerSettings ||
  mongoose.model("WebsitePartnerSettings", schema);
