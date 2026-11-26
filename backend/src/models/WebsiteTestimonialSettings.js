
// backend/src/models/WebsiteTestimonialSettings.js
import mongoose from "mongoose";
import schema from "./schemas/WebsiteTestimonialSettings.schema.js";

export default mongoose.models.WebsiteTestimonialSettings ||
  mongoose.model("WebsiteTestimonialSettings", schema);
