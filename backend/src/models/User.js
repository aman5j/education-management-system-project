import mongoose from "mongoose";
import userSchema from "./schemas/User.schema.js";

const User = mongoose.model("User", userSchema);

export default User;