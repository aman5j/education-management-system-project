import mongoose from "mongoose";
import batchSchema from "./schemas/Batch.schema.js";

const Batch = mongoose.model("Batch", batchSchema);

export default Batch;