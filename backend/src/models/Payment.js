
import mongoose from "mongoose";
import paymentSchema from "./schemas/Payment.schema.js";

const Payment =
  mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);

export default Payment;
