import User from "../models/User.js";

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

export const getDashboardSummary = async (
  req,
  res,
  next
) => {
  try {
    const startOfDay = getStartOfDay();
    const startOfMonth = getStartOfMonth();

    const [
      totalStudents,
      activeStudents,
      newStudentsThisMonth,
    ] = await Promise.all([
      User.countDocuments({
        role: "student",
      }),

      User.countDocuments({
        role: "student",
        status: "active",
      }),

      User.countDocuments({
        role: "student",
        createdAt: {
          $gte: startOfMonth,
        },
      }),
    ]);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        status: "active",
      }),

      User.countDocuments({
        status: "suspended",
      }),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        totalStudents,

        newAdmissions: 0,

        enquiries: 0,

        activeCourses: 0,

        feesCollected: 0,

        pendingFees: 0,

        activeStudents,

        newStudentsThisMonth,

        totalUsers,

        activeUsers,

        suspendedUsers,

        todayNewUsers: await User.countDocuments({
          createdAt: {
            $gte: startOfDay,
          },
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentAdmissions =
  async (req, res, next) => {
    try {
      const students = await User.find({
        role: "student",
      })
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .select(
          "name email status createdAt avatar"
        )
        .lean();

      const admissions = students.map(
        (student) => ({
          id: student._id,
          studentName: student.name,
          email: student.email,
          status:
            student.status === "active"
              ? "Active"
              : "Suspended",
          date: student.createdAt,
          avatar: student.avatar || null,
        })
      );

      return res.status(200).json({
        success: true,
        data: admissions,
      });
    } catch (error) {
      next(error);
    }
  };

export const getFeeSummary =
  async (req, res, next) => {
    try {
      /*
       * Fees are implemented in a later phase.
       *
       * We intentionally return an empty,
       * API-driven dataset rather than hardcoding
       * fake production transactions.
       */

      return res.status(200).json({
        success: true,

        data: {
          totalCollected: 0,
          totalPending: 0,

          monthly: [
            {
              month: "Jan",
              collected: 0,
              pending: 0,
            },
            {
              month: "Feb",
              collected: 0,
              pending: 0,
            },
            {
              month: "Mar",
              collected: 0,
              pending: 0,
            },
            {
              month: "Apr",
              collected: 0,
              pending: 0,
            },
            {
              month: "May",
              collected: 0,
              pending: 0,
            },
            {
              month: "Jun",
              collected: 0,
              pending: 0,
            },
            {
              month: "Jul",
              collected: 0,
              pending: 0,
            },
            {
              month: "Aug",
              collected: 0,
              pending: 0,
            },
            {
              month: "Sep",
              collected: 0,
              pending: 0,
            },
            {
              month: "Oct",
              collected: 0,
              pending: 0,
            },
            {
              month: "Nov",
              collected: 0,
              pending: 0,
            },
            {
              month: "Dec",
              collected: 0,
              pending: 0,
            },
          ],
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getPendingActions =
  async (req, res, next) => {
    try {
      /*
       * Admissions, fees and examination
       * models will be connected in their
       * respective development phases.
       */

      return res.status(200).json({
        success: true,

        data: [
          {
            id: "student-profile-review",
            title: "Student profile reviews",
            count: 0,
            type: "students",
          },
          {
            id: "pending-admissions",
            title: "Pending admissions",
            count: 0,
            type: "admissions",
          },
          {
            id: "pending-fees",
            title: "Pending fee payments",
            count: 0,
            type: "fees",
          },
          {
            id: "upcoming-exams",
            title: "Upcoming exam actions",
            count: 0,
            type: "exams",
          },
        ],
      });
    } catch (error) {
      next(error);
    }
  };