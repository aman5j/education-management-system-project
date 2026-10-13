
import mongoose from "mongoose";

const expenseCategories = [
  "Rent",
  "Salary",
  "Electricity",
  "Internet",
  "Stationery",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Travel",
  "Software",
  "Utilities",
  "Other",
];

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Expense title is required."],
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      required: [true, "Expense category is required."],
      enum: expenseCategories,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Expense amount is required."],
      min: [0.01, "Amount must be greater than zero."],
    },
    expenseDate: {
      type: Date,
      required: [true, "Expense date is required."],
      index: true,
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required."],
      enum: ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"],
    },
    vendor: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    receiptUrl: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Paid",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

expenseSchema.index({ expenseDate: -1, category: 1 });
expenseSchema.index({ createdAt: -1 });

const Expense = mongoose.model("Expense", expenseSchema);

export { expenseCategories };
export default Expense;
