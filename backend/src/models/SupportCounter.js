
import mongoose from "mongoose";
import supportCounterSchema from "./schemas/SupportCounter.schema.js";

const SupportCounter =
  mongoose.models.SupportCounter ||
  mongoose.model("SupportCounter", supportCounterSchema);

export default SupportCounter;
