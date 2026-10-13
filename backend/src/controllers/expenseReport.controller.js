
import Expense, {
  expenseCategories,
} from "../models/Expense.js";

const validStatuses = ["Paid", "Pending"];

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

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const getExpenseReport = async (req, res, next) => {
  try {
    const { from, to, category, status } = req.query;
    const filter = {};

    if (from || to) {
      const start = from ? parseDate(from) : null;
      const end = to ? parseDate(to) : null;

      if ((from && !start) || (to && !end)) {
        return sendError(
          res,
          400,
          "Date filters must use YYYY-MM-DD format."
        );
      }

      if (start && end && start > end) {
        return sendError(
          res,
          400,
          "'From' date cannot be after 'To' date."
        );
      }

      filter.expenseDate = {};

      if (start) {
        filter.expenseDate.$gte = start;
      }

      if (end) {
        const exclusiveEnd = new Date(end);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        filter.expenseDate.$lt = exclusiveEnd;
      }
    }

    if (category) {
      if (!expenseCategories.includes(category)) {
        return sendError(res, 400, "Invalid expense category.");
      }

      filter.category = category;
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return sendError(
          res,
          400,
          "Status must be Paid or Pending."
        );
      }

      filter.status = status;
    }

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
      100
    );

    const skip = (page - 1) * limit;

    const [
      totals,
      statusBreakdown,
      categoryBreakdown,
      monthlyTrend,
      records,
      total,
    ] = await Promise.all([
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalRecords: { $sum: 1 },
            paidAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Paid"] },
                  "$amount",
                  0,
                ],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Pending"] },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
        { $project: { _id: 0 } },
      ]),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        { $sort: { amount: -1 } },
      ]),

      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              year: { $year: "$expenseDate" },
              month: { $month: "$expenseDate" },
            },
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
          },
        },
      ]),

      Expense.find(filter)
        .select(
          "title category amount expenseDate paymentMethod vendor status receiptUrl description"
        )
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Expense.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        summary: totals[0] || {
          totalAmount: 0,
          totalRecords: 0,
          paidAmount: 0,
          pendingAmount: 0,
        },
        statusBreakdown,
        categoryBreakdown,
        monthlyTrend,
        records,
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
