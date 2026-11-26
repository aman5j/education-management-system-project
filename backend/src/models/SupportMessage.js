
import mongoose from "mongoose";
import supportMessageSchema from "./schemas/SupportMessage.schema.js";

const SupportMessage =
  mongoose.models.SupportMessage ||
  mongoose.model("SupportMessage", supportMessageSchema);

export default SupportMessage;
