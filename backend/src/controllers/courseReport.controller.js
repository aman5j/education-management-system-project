import Course from "../models/Course.js";
import StudentAdmission from "../models/StudentAdmission.js";

/*
|--------------------------------------------------------------------------
| GET COURSE REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/courses
|
| Filters:
| course_search
| course_status
| course_type
| course_category
|
|--------------------------------------------------------------------------
*/

export const getCourseReport = async (
  req,
  res,
  next
) => {
  try {
    const {
      course_search = "",
      course_status = "",
      course_type = "",
      course_category = "",
    } = req.query;

    /*
    |--------------------------------------------------------------------------
    | COURSE QUERY
    |--------------------------------------------------------------------------
    */

    const courseQuery = {};

    /*
    |--------------------------------------------------------------------------
    | Course Name Search
    |--------------------------------------------------------------------------
    */

    if (course_search.trim()) {
      courseQuery.courseTitle = {
        $regex: course_search.trim(),
        $options: "i",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    if (course_status) {
      const allowedStatuses = [
        "Published",
        "Draft",
        "Archived",
      ];

      if (
        !allowedStatuses.includes(
          course_status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid course status.",
        });
      }

      courseQuery.status =
        course_status;
    }

    /*
    |--------------------------------------------------------------------------
    | Course Type Filter
    |--------------------------------------------------------------------------
    */

    if (course_type.trim()) {
      courseQuery.courseType = {
        $regex: course_type.trim(),
        $options: "i",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Category Filter
    |--------------------------------------------------------------------------
    */

    if (course_category.trim()) {
      courseQuery.courseCategory = {
        $regex: course_category.trim(),
        $options: "i",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Load Courses
    |--------------------------------------------------------------------------
    */

    const courses =
      await Course.find(courseQuery)
        .select(
          [
            "_id",
            "courseTitle",
            "courseType",
            "certificateDiploma",
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
          ].join(" ")
        )
        .sort({
          displayOrder: 1,
          courseTitle: 1,
        })
        .lean();

    /*
    |--------------------------------------------------------------------------
    | No Courses
    |--------------------------------------------------------------------------
    */

    if (!courses.length) {
      return res.status(200).json({
        success: true,

        data: {
          summary: {
            totalCourses: 0,
            totalStudents: 0,
            totalAdmissions: 0,
            activeAdmissions: 0,
            completedAdmissions: 0,
            droppedAdmissions: 0,
            totalCourseFees: 0,
            totalPaidAmount: 0,
            totalRemainingAmount: 0,
          },

          courses: [],
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Course IDs
    |--------------------------------------------------------------------------
    */

    const courseIds =
      courses.map(
        (course) =>
          course._id
      );

    /*
    |--------------------------------------------------------------------------
    | Load Admissions
    |--------------------------------------------------------------------------
    */

    const admissions =
      await StudentAdmission.find({
        course_id: {
          $in: courseIds,
        },
      })
        .populate({
          path: "student_id",
          select:
            "_id rollNo firstName surname mobile email status",
        })
        .populate({
          path: "course_id",
          select:
            "_id courseTitle courseType courseCategory",
        })
        .populate({
          path: "batch_id",
          select:
            "_id batch_name status",
        })
        .sort({
          admission_date: -1,
        })
        .lean();

    /*
    |--------------------------------------------------------------------------
    | Initialize Reports
    |--------------------------------------------------------------------------
    */

    const groupedCourses =
      new Map();

    courses.forEach(
      (course) => {
        groupedCourses.set(
          String(course._id),
          {
            course,

            studentIds:
              new Set(),

            totalAdmissions: 0,

            activeAdmissions: 0,

            completedAdmissions: 0,

            droppedAdmissions: 0,

            totalCourseFees: 0,

            totalPaidAmount: 0,

            totalRemainingAmount: 0,
          }
        );
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Process Admissions
    |--------------------------------------------------------------------------
    */

    admissions.forEach(
      (admission) => {
        if (
          !admission.course_id?._id
        ) {
          return;
        }

        const courseKey =
          String(
            admission.course_id._id
          );

        const report =
          groupedCourses.get(
            courseKey
          );

        if (!report) {
          return;
        }

        /*
        |----------------------------------------------------------------------
        | Student Count
        |----------------------------------------------------------------------
        */

        if (
          admission.student_id?._id
        ) {
          report.studentIds.add(
            String(
              admission.student_id._id
            )
          );
        }

        /*
        |----------------------------------------------------------------------
        | Admission Count
        |----------------------------------------------------------------------
        */

        report.totalAdmissions +=
          1;

        /*
        |----------------------------------------------------------------------
        | Status
        |----------------------------------------------------------------------
        */

        if (
          admission.status ===
          "Active"
        ) {
          report.activeAdmissions +=
            1;
        }

        if (
          admission.status ===
          "Completed"
        ) {
          report.completedAdmissions +=
            1;
        }

        if (
          admission.status ===
          "Dropped"
        ) {
          report.droppedAdmissions +=
            1;
        }

        /*
        |----------------------------------------------------------------------
        | Financial Information
        |----------------------------------------------------------------------
        */

        const finalAmount =
          Number(
            admission.final_amount ||
              0
          );

        const paidAmount =
          Number(
            admission.paid_amount ||
              0
          );

        const remainingAmount =
          Math.max(
            0,
            finalAmount -
              paidAmount
          );

        report.totalCourseFees +=
          finalAmount;

        report.totalPaidAmount +=
          paidAmount;

        report.totalRemainingAmount +=
          remainingAmount;
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Build Final Course Report
    |--------------------------------------------------------------------------
    */

    const reportCourses =
      Array.from(
        groupedCourses.values()
      ).map(
        (item) => ({
          course:
            item.course,

          totalStudents:
            item.studentIds.size,

          totalAdmissions:
            item.totalAdmissions,

          activeAdmissions:
            item.activeAdmissions,

          completedAdmissions:
            item.completedAdmissions,

          droppedAdmissions:
            item.droppedAdmissions,

          totalCourseFees:
            Number(
              item.totalCourseFees.toFixed(
                2
              )
            ),

          totalPaidAmount:
            Number(
              item.totalPaidAmount.toFixed(
                2
              )
            ),

          totalRemainingAmount:
            Number(
              item.totalRemainingAmount.toFixed(
                2
              )
            ),
        })
      );

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const uniqueStudents =
      new Set();

    admissions.forEach(
      (admission) => {
        if (
          admission.student_id?._id
        ) {
          uniqueStudents.add(
            String(
              admission.student_id._id
            )
          );
        }
      }
    );

    const summary =
      reportCourses.reduce(
        (result, item) => {
          result.totalCourses +=
            1;

          result.totalAdmissions +=
            item.totalAdmissions;

          result.activeAdmissions +=
            item.activeAdmissions;

          result.completedAdmissions +=
            item.completedAdmissions;

          result.droppedAdmissions +=
            item.droppedAdmissions;

          result.totalCourseFees +=
            item.totalCourseFees;

          result.totalPaidAmount +=
            item.totalPaidAmount;

          result.totalRemainingAmount +=
            item.totalRemainingAmount;

          return result;
        },
        {
          totalCourses: 0,

          totalStudents:
            uniqueStudents.size,

          totalAdmissions: 0,

          activeAdmissions: 0,

          completedAdmissions: 0,

          droppedAdmissions: 0,

          totalCourseFees: 0,

          totalPaidAmount: 0,

          totalRemainingAmount: 0,
        }
      );

    /*
    |--------------------------------------------------------------------------
    | Round Financial Values
    |--------------------------------------------------------------------------
    */

    summary.totalCourseFees =
      Number(
        summary.totalCourseFees.toFixed(
          2
        )
      );

    summary.totalPaidAmount =
      Number(
        summary.totalPaidAmount.toFixed(
          2
        )
      );

    summary.totalRemainingAmount =
      Number(
        summary.totalRemainingAmount.toFixed(
          2
        )
      );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      data: {
        summary,

        courses:
          reportCourses,
      },
    });
  } catch (error) {
    console.error(
      "Course report error:",
      error
    );

    next(error);
  }
};