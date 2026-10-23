
import User from "../models/User.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";
import Course from "../models/Course.js";
import Payment from "../models/Payment.js";
import Expense from "../models/Expense.js";
import InstituteSettings from "../models/InstituteSettings.js";

const getStartOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getStartOfYear = () => {
  const date = new Date();
  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getNextYearStart = () => {
  const date = getStartOfYear();
  date.setFullYear(date.getFullYear() + 1);
  return date;
};

const money = (value) => Number((Number(value) || 0).toFixed(2));

export const getDashboardSummary = async (req, res, next) => {
  try {
    const startOfDay = getStartOfDay();
    const startOfMonth = getStartOfMonth();
    const startOfYear = getStartOfYear();
    const nextYearStart = getNextYearStart();

    const [
      totalStudents,
      activeStudents,
      newStudentsThisMonth,
      activeCourses,
      totalAdmissions,
      newAdmissionsThisMonth,
      verifiedPayments,
      pendingFees,
      totalExpenses,
      thisMonthExpenses,
      totalUsers,
      activeUsers,
      suspendedUsers,
      todayNewUsers,
      instituteSettings,
    ] = await Promise.all([
      Student.countDocuments(),

      Student.countDocuments({ status: "active" }),

      Student.countDocuments({
        createdAt: { $gte: startOfMonth },
      }),

      Course.countDocuments({ status: "Published" }),

      StudentAdmission.countDocuments(),

      StudentAdmission.countDocuments({
        admission_date: { $gte: startOfMonth },
      }),

      Payment.aggregate([
        {
          $match: {
            status: "Verified",
            payment_date: {
              $gte: startOfYear,
              $lt: nextYearStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      StudentAdmission.aggregate([
        {
          $match: {
            status: { $ne: "Dropped" },
          },
        },
        {
          $project: {
            remaining: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$final_amount", 0] },
                    { $ifNull: ["$paid_amount", 0] },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$remaining" },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            status: "Paid",
            expenseDate: {
              $gte: startOfYear,
              $lt: nextYearStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      Expense.aggregate([
        {
          $match: {
            status: "Paid",
            expenseDate: { $gte: startOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]),

      User.countDocuments(),

      User.countDocuments({ status: "active" }),

      User.countDocuments({ status: "suspended" }),

      User.countDocuments({
        createdAt: { $gte: startOfDay },
      }),

      InstituteSettings.findOne({ key: "default" })
        .select("instituteName")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        newStudentsThisMonth,

        totalAdmissions,
        newAdmissions: newAdmissionsThisMonth,

        activeCourses,

        // Only verified payments within the current year.
        feesCollected: money(verifiedPayments[0]?.total),

        // Outstanding balance from admission records.
        pendingFees: money(pendingFees[0]?.total),

        // Paid expenses in the current year.
        totalExpenses: money(totalExpenses[0]?.total),
        thisMonthExpenses: money(thisMonthExpenses[0]?.total),

        totalUsers,
        activeUsers,
        suspendedUsers,
        todayNewUsers,

        // The enquiry model was not identified, so no fake count is returned.
        enquiries: null,

        instituteName:
          instituteSettings?.instituteName?.trim() ||
          "Your Institute",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentAdmissions = async (req, res, next) => {
  try {
    const admissions = await StudentAdmission.find()
      .sort({ admission_date: -1, createdAt: -1 })
      .limit(5)
      .populate("student_id", "rollNo firstName surname mobile email")
      .populate("course_id", "courseTitle")
      .lean();

    const data = admissions.map((admission) => {
      const student = admission.student_id;

      return {
        id: admission._id,
        studentName: student
          ? [student.firstName, student.surname]
              .filter(Boolean)
              .join(" ")
          : "Student record unavailable",
        email: student?.email || "",
        rollNo: student?.rollNo || "",
        courseName: admission.course_id?.courseTitle || "",
        status: admission.status || "Active",
        date: admission.admission_date || admission.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeeSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const year = now.getFullYear();

    const yearStart = new Date(year, 0, 1);
    const nextYearStart = new Date(year + 1, 0, 1);

    const [payments, pendingAdmissions] = await Promise.all([
      Payment.aggregate([
        {
          $match: {
            status: "Verified",
            payment_date: {
              $gte: yearStart,
              $lt: nextYearStart,
            },
          },
        },
        {
          $group: {
            _id: { $month: "$payment_date" },
            collected: { $sum: "$amount" },
          },
        },
      ]),

      StudentAdmission.aggregate([
        {
          $match: {
            status: { $ne: "Dropped" },
          },
        },
        {
          $project: {
            remaining: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$final_amount", 0] },
                    { $ifNull: ["$paid_amount", 0] },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$remaining" },
          },
        },
      ]),
    ]);

    const monthlyMap = new Map(
      payments.map((item) => [
        item._id,
        money(item.collected),
      ])
    );

    const monthly = Array.from({ length: 12 }, (_, index) => ({
      month: new Date(year, index, 1).toLocaleString("en-IN", {
        month: "short",
      }),
      collected: monthlyMap.get(index + 1) || 0,
    }));

    return res.status(200).json({
      success: true,
      data: {
        year,
        totalCollected: money(
          payments.reduce((sum, item) => sum + item.collected, 0)
        ),
        totalPending: money(pendingAdmissions[0]?.total),
        monthly,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPendingActions = async (req, res, next) => {
  try {
    const [pendingPayments, admissionsWithBalance] = await Promise.all([
      Payment.countDocuments({ status: "Pending" }),

      StudentAdmission.aggregate([
        {
          $match: {
            status: { $ne: "Dropped" },
          },
        },
        {
          $project: {
            remaining: {
              $subtract: [
                { $ifNull: ["$final_amount", 0] },
                { $ifNull: ["$paid_amount", 0] },
              ],
            },
          },
        },
        {
          $match: { remaining: { $gt: 0 } },
        },
        { $count: "count" },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: [
        {
          id: "pending-fees",
          title: "Admissions with outstanding fees",
          count: admissionsWithBalance[0]?.count || 0,
          type: "fees",
        },
        {
          id: "pending-payments",
          title: "Payments awaiting verification",
          count: pendingPayments,
          type: "payments",
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};
