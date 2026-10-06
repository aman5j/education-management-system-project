import mongoose from "mongoose";

import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import StudentAdmission from "../models/StudentAdmission.js";

/*
|--------------------------------------------------------------------------
| GET STUDENT REPORT FILTERS
|--------------------------------------------------------------------------
|
| GET /api/reports/student-filters
|
| Returns:
| - Courses
| - Batches
|
|--------------------------------------------------------------------------
*/

export const getStudentReportFilters = async (
  req,
  res
) => {
  try {
    const [courses, batches] =
      await Promise.all([
        Course.find({})
          .select(
            "_id courseTitle courseType status"
          )
          .sort({
            courseTitle: 1,
          })
          .lean(),

        Batch.find({})
          .select(
            "_id course_id batch_name status"
          )
          .populate({
            path: "course_id",
            select:
              "courseTitle courseType",
          })
          .sort({
            batch_name: 1,
          })
          .lean(),
      ]);

    return res.status(200).json({
      success: true,

      data: {
        courses,
        batches,
      },
    });
  } catch (error) {
    console.error(
      "Get student report filters error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load student report filters.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET STUDENT REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/students
|
| Filters:
|
| date_from
| date_to
| course_id
| batch_id
| status
|
|--------------------------------------------------------------------------
*/

export const getStudentReport = async (
  req,
  res
) => {
  try {
    const {
      date_from = "",
      date_to = "",
      course_id = "",
      batch_id = "",
      status = "",
    } = req.query;

    /*
    |--------------------------------------------------------------------------
    | STUDENT FILTER
    |--------------------------------------------------------------------------
    */

    const studentMatch = {};

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    if (status) {
      const allowedStatuses = [
        "active",
        "inactive",
        "suspended",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student status.",
        });
      }

      studentMatch.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | DATE RANGE
    |--------------------------------------------------------------------------
    |
    | Student registration date is represented
    | by createdAt.
    |
    */

    if (date_from || date_to) {
      studentMatch.createdAt = {};

      if (date_from) {
        const startDate = new Date(
          `${date_from}T00:00:00`
        );

        if (
          Number.isNaN(
            startDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid start date.",
          });
        }

        studentMatch.createdAt.$gte =
          startDate;
      }

      if (date_to) {
        const endDate = new Date(
          `${date_to}T23:59:59.999`
        );

        if (
          Number.isNaN(
            endDate.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid end date.",
          });
        }

        studentMatch.createdAt.$lte =
          endDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | COURSE / BATCH
    |--------------------------------------------------------------------------
    |
    | Course and batch are related through
    | StudentAdmission.
    |
    */

    if (course_id || batch_id) {
      const admissionMatch = {};

      if (course_id) {
        if (
          !mongoose.Types.ObjectId.isValid(
            course_id
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid course ID.",
          });
        }

        admissionMatch.course_id =
          new mongoose.Types.ObjectId(
            course_id
          );
      }

      if (batch_id) {
        if (
          !mongoose.Types.ObjectId.isValid(
            batch_id
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid batch ID.",
          });
        }

        admissionMatch.batch_id =
          new mongoose.Types.ObjectId(
            batch_id
          );
      }

      const matchingAdmissions =
        await StudentAdmission.find(
          admissionMatch
        )
          .select("student_id")
          .lean();

      const studentIds =
        matchingAdmissions.map(
          (admission) =>
            admission.student_id
        );

      /*
      |--------------------------------------------------------------------------
      | No students match course/batch
      |--------------------------------------------------------------------------
      */

      if (!studentIds.length) {
        return res.status(200).json({
          success: true,

          data: {
            summary: {
              totalStudents: 0,
              activeStudents: 0,
              inactiveStudents: 0,
              suspendedStudents: 0,
              newStudents: 0,
            },

            students: [],
          },
        });
      }

      studentMatch._id = {
        $in: studentIds,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | GET STUDENTS
    |--------------------------------------------------------------------------
    */

    const students =
      await Student.find(
        studentMatch
      )
        .select(
          "_id rollNo firstName surname gender mobile email course batch status createdAt"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
    |--------------------------------------------------------------------------
    | GET ADMISSIONS
    |--------------------------------------------------------------------------
    |
    | We use admissions to display the real
    | Course / Batch relationship.
    |
    */

    const studentIds =
      students.map(
        (student) => student._id
      );

    const admissions =
      studentIds.length
        ? await StudentAdmission.find({
            student_id: {
              $in: studentIds,
            },
          })
            .select(
              "student_id course_id batch_id admission_date status final_amount paid_amount"
            )
            .populate({
              path: "course_id",
              select:
                "courseTitle courseType",
            })
            .populate({
              path: "batch_id",
              select:
                "batch_name status",
            })
            .sort({
              admission_date: -1,
            })
            .lean()
        : [];

    /*
    |--------------------------------------------------------------------------
    | Keep latest admission per student
    |--------------------------------------------------------------------------
    */

    const latestAdmissionMap =
      new Map();

    admissions.forEach(
      (admission) => {
        const studentId =
          String(
            admission.student_id
          );

        if (
          !latestAdmissionMap.has(
            studentId
          )
        ) {
          latestAdmissionMap.set(
            studentId,
            admission
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | FORMAT REPORT ROWS
    |--------------------------------------------------------------------------
    */

    const reportStudents =
      students.map(
        (student) => {
          const admission =
            latestAdmissionMap.get(
              String(student._id)
            );

          return {
            _id: student._id,

            rollNo:
              student.rollNo || "",

            studentName: [
              student.firstName,
              student.surname,
            ]
              .filter(Boolean)
              .join(" ")
              .trim(),

            gender:
              student.gender || "",

            mobile:
              student.mobile || "",

            email:
              student.email || "",

            course:
              admission?.course_id
                ?.courseTitle ||
              student.course ||
              "",

            batch:
              admission?.batch_id
                ?.batch_name ||
              student.batch ||
              "",

            admissionDate:
              admission?.admission_date ||
              null,

            admissionStatus:
              admission?.status ||
              "",

            status:
              student.status ||
              "active",

            createdAt:
              student.createdAt,
          };
        }
      );

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    const totalStudents =
      reportStudents.length;

    const activeStudents =
      reportStudents.filter(
        (student) =>
          student.status ===
          "active"
      ).length;

    const inactiveStudents =
      reportStudents.filter(
        (student) =>
          student.status ===
          "inactive"
      ).length;

    const suspendedStudents =
      reportStudents.filter(
        (student) =>
          student.status ===
          "suspended"
      ).length;

    /*
    |--------------------------------------------------------------------------
    | NEW STUDENTS
    |--------------------------------------------------------------------------
    |
    | When a date range is selected,
    | all returned students belong to that
    | selected registration period.
    |
    */

    const newStudents =
      date_from || date_to
        ? reportStudents.length
        : 0;

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalStudents,

          activeStudents,

          inactiveStudents,

          suspendedStudents,

          newStudents,
        },

        students:
          reportStudents,
      },
    });
  } catch (error) {
    console.error(
      "Get student report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate student report.",
    });
  }
};