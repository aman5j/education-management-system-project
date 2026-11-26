
import mongoose from "mongoose";
import roleSchema from "./schemas/Role.schema.js";

const Role = mongoose.model("Role", roleSchema);

export default Role;
