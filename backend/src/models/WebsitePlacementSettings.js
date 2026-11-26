
// backend/src/models/WebsitePlacementSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsitePlacementSettings.schema.js";

export default mongoose.models.WebsitePlacementSettings ||
  mongoose.model("WebsitePlacementSettings", schema);
