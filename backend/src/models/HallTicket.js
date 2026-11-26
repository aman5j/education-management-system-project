import mongoose from "mongoose";
import hallTicketSchema from "./schemas/HallTicket.schema.js";

const HallTicket =
  mongoose.models.HallTicket ||
  mongoose.model("HallTicket", hallTicketSchema);

export default HallTicket;