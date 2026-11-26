
import mongoose from "mongoose";
import schema from "./schemas/InstituteLogo.schema.js";

export default mongoose.models.InstituteLogo ||
  mongoose.model("InstituteLogo", schema);
