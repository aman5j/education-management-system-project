import mongoose from "mongoose";
import categorySchema from "./schemas/Category.schema.js";

const Category = mongoose.model("Category", categorySchema);

export default Category;