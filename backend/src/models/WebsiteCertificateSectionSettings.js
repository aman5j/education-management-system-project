
// backend/src/models/WebsiteCertificateSectionSettings.js

import mongoose from "mongoose";
import schema from "./schemas/WebsiteCertificateSectionSettings.schema.js";

export default mongoose.models.WebsiteCertificateSectionSettings ||
  mongoose.model("WebsiteCertificateSectionSettings", schema);
