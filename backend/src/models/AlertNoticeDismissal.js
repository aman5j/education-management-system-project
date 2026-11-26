import mongoose from "mongoose";
import alertNoticeDismissalSchema from "./schemas/AlertNoticeDismissal.schema.js";

const AlertNoticeDismissal = mongoose.model(
  "AlertNoticeDismissal",
  alertNoticeDismissalSchema
);

export default AlertNoticeDismissal;