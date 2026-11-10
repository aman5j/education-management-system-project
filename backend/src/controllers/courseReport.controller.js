
import Course from "../models/Course.js";
import StudentAdmission from "../models/StudentAdmission.js";
import Category from "../models/Category.js";

const getPagination = (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);

  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;

  const limit = [10, 25, 50].includes(requestedLimit)
    ? requestedLimit
    : 10;

  return { page, limit };
};

const emptySummary = () => ({
  totalCourses: 0,
  totalStudents: 0,
  totalAdmissions: 0,
  activeAdmissions: 0,
  completedAdmissions: 0,
  droppedAdmissions: 0,
  totalCourseFees: 0,
  totalPaidAmount: 0,
  totalRemainingAmount: 0,
});

export const getCourseReport = async (req, res, next) => {
  try {
    const {
      course_search = "",
      course_status = "",
      course_type = "",
      course_category = "",
    } = req.query;

    const { page, limit } = getPagination(req.query);

    const [
      storedCourseTypes,
      activeCategories,
      usedCourseCategories,
    ] = await Promise.all([
      Course.distinct("courseType", {
        courseType: { $nin: ["", null] },
      }),
      Category.find({ status: "Active" })
        .select("categoryName")
        .sort({ displayOrder: 1, categoryName: 1 })
        .lean(),
      Course.distinct("courseCategory", {
        courseCategory: { $nin: ["", null] },
      }),
    ]);

    const filterOptions = {
      courseTypes: [
        ...new Set(
          storedCourseTypes
            .filter(Boolean)
            .map((value) => String(value).trim())
            .filter(Boolean)
        ),
      ].sort((a, b) => a.localeCompare(b)),

      categories: [
        ...new Set([
          ...activeCategories.map((item) =>
            String(item.categoryName || "").trim()
          ),
          ...usedCourseCategories.map((item) =>
            String(item || "").trim()
          ),
        ].filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
    };

    const courseQuery = {};

    if (course_search.trim()) {
      courseQuery.courseTitle = {
        $regex: course_search.trim(),
        $options: "i",
      };
    }

    if (course_status) {
      if (!["Published", "Draft", "Archived"].includes(course_status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course status.",
        });
      }

      courseQuery.status = course_status;
    }

    // Dropdown values are actual stored values, so use exact matching.
    if (course_type.trim()) {
      courseQuery.courseType = {
        $regex: `^${course_type.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      };
    }

    if (course_category.trim()) {
      courseQuery.courseCategory = {
        $regex: `^${course_category.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      };
    }

    const courses = await Course.find(courseQuery)
      .select([
        "_id",
        "courseTitle",
        "courseType",
        "courseCategory",
        "mrp",
        "price",
        "displayOrder",
        "duration",
        "durationUnit",
        "courseImage",
        "previewVideo",
        "totalLectures",
        "practicalMarks",
        "objectiveMarks",
        "description",
        "syllabus",
        "eligibility",
        "certificateSubject",
        "popular",
        "recommended",
        "mrpVisible",
        "hideExamResult",
        "status",
        "createdAt",
        "updatedAt",
      ].join(" "))
      .sort({ displayOrder: 1, courseTitle: 1 })
      .lean();

    if (!courses.length) {
      return res.status(200).json({
        success: true,
        data: {
          summary: emptySummary(),
          courses: [],
          filterOptions,
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    const courseIds = courses.map((course) => course._id);

    const admissions = await StudentAdmission.find({
      course_id: { $in: courseIds },
    })
      .populate({
        path: "student_id",
        select: "_id rollNo firstName surname mobile email status",
      })
      .populate({
        path: "course_id",
        select: "_id courseTitle courseType courseCategory",
      })
      .populate({
        path: "batch_id",
        select: "_id batch_name status",
      })
      .sort({ admission_date: -1 })
      .lean();

    const groupedCourses = new Map();

    courses.forEach((course) => {
      groupedCourses.set(String(course._id), {
        course,
        studentIds: new Set(),
        totalAdmissions: 0,
        activeAdmissions: 0,
        completedAdmissions: 0,
        droppedAdmissions: 0,
        totalCourseFees: 0,
        totalPaidAmount: 0,
        totalRemainingAmount: 0,
      });
    });

    admissions.forEach((admission) => {
      const courseId = admission.course_id?._id;
      if (!courseId) return;

      const report = groupedCourses.get(String(courseId));
      if (!report) return;

      if (admission.student_id?._id) {
        report.studentIds.add(String(admission.student_id._id));
      }

      report.totalAdmissions += 1;

      if (admission.status === "Active") {
        report.activeAdmissions += 1;
      }

      if (admission.status === "Completed") {
        report.completedAdmissions += 1;
      }

      if (admission.status === "Dropped") {
        report.droppedAdmissions += 1;
      }

      const finalAmount = Number(admission.final_amount || 0);
      const paidAmount = Number(admission.paid_amount || 0);

      report.totalCourseFees += finalAmount;
      report.totalPaidAmount += paidAmount;
      report.totalRemainingAmount += Math.max(
        0,
        finalAmount - paidAmount
      );
    });

    const reportCourses = Array.from(groupedCourses.values()).map((item) => ({
      course: item.course,
      totalStudents: item.studentIds.size,
      totalAdmissions: item.totalAdmissions,
      activeAdmissions: item.activeAdmissions,
      completedAdmissions: item.completedAdmissions,
      droppedAdmissions: item.droppedAdmissions,
      totalCourseFees: Number(item.totalCourseFees.toFixed(2)),
      totalPaidAmount: Number(item.totalPaidAmount.toFixed(2)),
      totalRemainingAmount: Number(item.totalRemainingAmount.toFixed(2)),
    }));

    const uniqueStudents = new Set();

    admissions.forEach((admission) => {
      if (admission.student_id?._id) {
        uniqueStudents.add(String(admission.student_id._id));
      }
    });

    const summary = reportCourses.reduce(
      (result, item) => {
        result.totalCourses += 1;
        result.totalAdmissions += item.totalAdmissions;
        result.activeAdmissions += item.activeAdmissions;
        result.completedAdmissions += item.completedAdmissions;
        result.droppedAdmissions += item.droppedAdmissions;
        result.totalCourseFees += item.totalCourseFees;
        result.totalPaidAmount += item.totalPaidAmount;
        result.totalRemainingAmount += item.totalRemainingAmount;
        return result;
      },
      {
        ...emptySummary(),
        totalStudents: uniqueStudents.size,
      }
    );

    summary.totalCourseFees = Number(summary.totalCourseFees.toFixed(2));
    summary.totalPaidAmount = Number(summary.totalPaidAmount.toFixed(2));
    summary.totalRemainingAmount = Number(
      summary.totalRemainingAmount.toFixed(2)
    );

    // Paginate only after full report calculations and summary.
    const total = reportCourses.length;
    const totalPages = Math.ceil(total / limit);
    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
    const startIndex = (safePage - 1) * limit;

    return res.status(200).json({
      success: true,
      data: {
        summary,
        courses: reportCourses.slice(startIndex, startIndex + limit),
        filterOptions,
        pagination: {
          page: safePage,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Course report error:", error);
    next(error);
  }
};
