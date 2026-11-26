
// backend/src/models/WebsiteCourseCategorySettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsiteCourseCategorySettings.schema.js";

export default mongoose.models.WebsiteCourseCategorySettings ||
  mongoose.model("WebsiteCourseCategorySettings", schema);
