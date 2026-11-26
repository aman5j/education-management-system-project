
import mongoose from "mongoose";
import schema from "./schemas/InstituteSettings.schema.js";

export default mongoose.models.InstituteSettings ||
  mongoose.model("InstituteSettings", schema);
