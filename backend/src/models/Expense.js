
import mongoose from "mongoose";
import expenseSchema, {
  expenseCategories,
} from "./schemas/Expense.schema.js";

const Expense =
  mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema);

export { expenseCategories };
export default Expense;
