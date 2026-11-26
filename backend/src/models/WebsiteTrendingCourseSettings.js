
// backend/src/models/WebsiteTrendingCourseSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsiteTrendingCourseSettings.schema.js";

export default mongoose.models.WebsiteTrendingCourseSettings ||
  mongoose.model("WebsiteTrendingCourseSettings", schema);
