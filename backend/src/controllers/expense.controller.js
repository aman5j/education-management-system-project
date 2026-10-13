
import mongoose from "mongoose";
import Expense, {
  expenseCategories,
} from "../models/Expense.js";

const paymentMethods = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
  "Cheque",
  "Other",
];

const statuses = ["Paid", "Pending"];

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const parseDate = (value) => {
  if (!value) return null;

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
};

const validateExpense = (body) => {
  const title = String(body.title || "").trim();
  const category = String(body.category || "").trim();
  const amount = Number(body.amount);
  const paymentMethod = String(body.paymentMethod || "").trim();
  const expenseDate = parseDate(body.expenseDate);
  const vendor = String(body.vendor || "").trim();
  const description = String(body.description || "").trim();
  const receiptUrl = String(body.receiptUrl || "").trim();
  const status = String(body.status || "Paid").trim();

  if (!title || title.length > 150) {
    return { error: "Title is required and must be at most 150 characters." };
  }

  if (!expenseCategories.includes(category)) {
    return { error: "Select a valid expense category." };
  }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999) {
    return { error: "Enter a valid expense amount greater than zero." };
  }

  if (!expenseDate) {
    return { error: "Expense date must use YYYY-MM-DD format." };
  }

  if (!paymentMethods.includes(paymentMethod)) {
    return { error: "Select a valid payment method." };
  }

  if (vendor.length > 150) {
    return { error: "Vendor must be at most 150 characters." };
  }

  if (description.length > 1000) {
    return { error: "Description must be at most 1000 characters." };
  }

  if (receiptUrl.length > 1000) {
    return { error: "Receipt URL must be at most 1000 characters." };
  }

  if (!statuses.includes(status)) {
    return { error: "Select a valid expense status." };
  }

  return {
    data: {
      title,
      category,
      amount: Number(amount.toFixed(2)),
      expenseDate,
      paymentMethod,
      vendor,
      description,
      receiptUrl,
      status,
    },
  };
};

const getFilters = (query) => {
  const filter = {};

  if (query.category) {
    if (!expenseCategories.includes(query.category)) {
      return { error: "Invalid expense category." };
    }

    filter.category = query.category;
  }

  if (query.status) {
    if (!statuses.includes(query.status)) {
      return { error: "Invalid expense status." };
    }

    filter.status = query.status;
  }

  if (query.paymentMethod) {
    if (!paymentMethods.includes(query.paymentMethod)) {
      return { error: "Invalid payment method." };
    }

    filter.paymentMethod = query.paymentMethod;
  }

  if (query.from || query.to) {
    const from = query.from ? parseDate(query.from) : null;
    const to = query.to ? parseDate(query.to) : null;

    if ((query.from && !from) || (query.to && !to)) {
      return { error: "Date filters must use YYYY-MM-DD format." };
    }

    if (from && to && from > to) {
      return { error: "'From' date cannot be after 'To' date." };
    }

    filter.expenseDate = {};

    if (from) filter.expenseDate.$gte = from;

    if (to) {
      const exclusiveEnd = new Date(to);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      filter.expenseDate.$lt = exclusiveEnd;
    }
  }

  if (query.search) {
    const search = String(query.search).trim().slice(0, 100);

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { title: regex },
        { vendor: regex },
        { description: regex },
      ];
    }
  }

  return { filter };
};

export const getExpenses = async (req, res, next) => {
  try {
    const result = getFilters(req.query);

    if (result.error) {
      return sendError(res, 400, result.error);
    }

    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const [expenses, total] = await Promise.all([
      Expense.find(result.filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean(),

      Expense.countDocuments(result.filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseSummary = async (req, res, next) => {
  try {
    const result = getFilters(req.query);

    if (result.error) {
      return sendError(res, 400, result.error);
    }

    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );
    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

    const [overall, monthly, yearly, categories] = await Promise.all([
      Expense.aggregate([
        { $match: result.filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...result.filter,
            expenseDate: {
              $gte: monthStart,
              $lt: nextMonthStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            ...result.filter,
            expenseDate: {
              $gte: yearStart,
              $lt: nextYearStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        { $match: result.filter },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overall: overall[0] || { totalAmount: 0, count: 0 },
        monthly: monthly[0] || { totalAmount: 0, count: 0 },
        yearly: yearly[0] || { totalAmount: 0, count: 0 },
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getExpense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid expense ID.");
    }

    const expense = await Expense.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!expense) {
      return sendError(res, 404, "Expense not found.");
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const validation = validateExpense(req.body);

    if (validation.error) {
      return sendError(res, 400, validation.error);
    }

    const expense = await Expense.create({
      ...validation.data,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Expense created successfully.",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid expense ID.");
    }

    const validation = validateExpense(req.body);

    if (validation.error) {
      return sendError(res, 400, validation.error);
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        ...validation.data,
        updatedBy: req.user._id,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!expense) {
      return sendError(res, 404, "Expense not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(res, 400, "Invalid expense ID.");
    }

    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return sendError(res, 404, "Expense not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
