
import mongoose from "mongoose";
import certificateSchema from "./schemas/Certificate.schema.js";

const Certificate =
  mongoose.models.Certificate ||
  mongoose.model("Certificate", certificateSchema);

export default Certificate;
