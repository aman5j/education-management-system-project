
// backend/src/models/WebsiteTeamSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsiteTeamSettings.schema.js";

export default mongoose.models.WebsiteTeamSettings ||
  mongoose.model("WebsiteTeamSettings", schema);
