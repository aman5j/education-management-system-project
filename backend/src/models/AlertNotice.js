import mongoose from "mongoose";
import alertNoticeSchema from "./schemas/AlertNotice.schema.js";

const AlertNotice = mongoose.model(
  "AlertNotice",
  alertNoticeSchema
);

export default AlertNotice;