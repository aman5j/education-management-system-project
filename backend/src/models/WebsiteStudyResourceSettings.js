
// backend/src/models/WebsiteStudyResourceSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsiteStudyResourceSettings.schema.js";

export default mongoose.models.WebsiteStudyResourceSettings ||
  mongoose.model("WebsiteStudyResourceSettings", schema);
