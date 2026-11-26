
// backend/src/models/WebsiteCareerSettings.js

import mongoose from "mongoose";
import schema from "./schemas/WebsiteCareerSettings.schema.js";

export default mongoose.models.WebsiteCareerSettings ||
  mongoose.model("WebsiteCareerSettings", schema);
