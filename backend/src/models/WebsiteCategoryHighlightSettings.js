
// backend/src/models/WebsiteCategoryHighlightSettings.js

import mongoose from "mongoose";
import schema from "./schemas/WebsiteCategoryHighlightSettings.schema.js";

export default mongoose.models.WebsiteCategoryHighlightSettings ||
  mongoose.model("WebsiteCategoryHighlightSettings", schema);
