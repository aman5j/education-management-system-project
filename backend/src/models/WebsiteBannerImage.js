
import mongoose from "mongoose";
import schema from "./schemas/WebsiteBannerImage.schema.js";

export default mongoose.models.WebsiteBannerImage ||
  mongoose.model("WebsiteBannerImage", schema);
