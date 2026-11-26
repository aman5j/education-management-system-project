
// backend/src/models/WebsiteFreeVideoSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsiteFreeVideoSettings.schema.js";

export default mongoose.models.WebsiteFreeVideoSettings ||
  mongoose.model("WebsiteFreeVideoSettings", schema);
