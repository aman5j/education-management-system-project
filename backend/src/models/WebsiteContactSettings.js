
// backend/src/models/WebsiteContactSettings.js

import mongoose from "mongoose";
import schema from "./schemas/WebsiteContactSettings.schema.js";

export default mongoose.models.WebsiteContactSettings ||
  mongoose.model("WebsiteContactSettings", schema);
