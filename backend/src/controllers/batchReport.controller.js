import mongoose from "mongoose";

import Batch from "../models/Batch.js";
import StudentAdmission from "../models/StudentAdmission.js";

/*
|--------------------------------------------------------------------------
| GET BATCH REPORT FILTERS
|--------------------------------------------------------------------------
|
| GET /api/reports/batch-filters
|
|--------------------------------------------------------------------------
*/

export const getBatchReportFilters =
  async (req, res, next) => {
    try {
      const batches =
        await Batch.find({})
          .populate({
            path: "course_id",
            select:
              "_id courseTitle courseType courseCategory",
          })
          .select(
            "_id batch_name course_id max_seats available_seats status"
          )
          .sort({
            batch_name: 1,
          })
          .lean();

      const courses =
        await mongoose
          .model("Course")
          .find({})
          .select(
            "_id courseTitle courseType courseCategory"
          )
          .sort({
            courseTitle: 1,
          })
          .lean();

      return res.status(200).json({
        success: true,

        data: {
          courses,
          batches,
        },
      });
    } catch (error) {
      console.error(
        "Batch report filters error:",
        error
      );

      next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| GET BATCH REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/batches
|
| Filters:
| search
| course_id
| status
|
|--------------------------------------------------------------------------
*/

export const getBatchReport =
  async (req, res, next) => {
    try {
      const {
        search = "",
        course_id = "",
        status = "",
      } = req.query;

      /*
      |--------------------------------------------------------------------------
      | Batch Query
      |--------------------------------------------------------------------------
      */

      const batchQuery = {};

      /*
      |--------------------------------------------------------------------------
      | Search Batch
      |--------------------------------------------------------------------------
      */

      if (search.trim()) {
        batchQuery.batch_name = {
          $regex: search.trim(),
          $options: "i",
        };
      }

      /*
      |--------------------------------------------------------------------------
      | Course
      |--------------------------------------------------------------------------
      */

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

        batchQuery.course_id =
          new mongoose.Types.ObjectId(
            course_id
          );
      }

      /*
      |--------------------------------------------------------------------------
      | Status
      |--------------------------------------------------------------------------
      */

      if (status) {
        const allowedStatuses = [
          "Upcoming",
          "Ongoing",
          "Closed",
        ];

        if (
          !allowedStatuses.includes(
            status
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid batch status.",
          });
        }

        batchQuery.status =
          status;
      }

      /*
      |--------------------------------------------------------------------------
      | Load Batches
      |--------------------------------------------------------------------------
      */

      const batches =
        await Batch.find(batchQuery)
          .populate({
            path: "course_id",
            select:
              "_id courseTitle courseType courseCategory",
          })
          .select(
            [
              "_id",
              "course_id",
              "batch_name",
              "max_seats",
              "available_seats",
              "status",
              "createdAt",
              "updatedAt",
            ].join(" ")
          )
          .sort({
            createdAt: -1,
            batch_name: 1,
          })
          .lean();

      /*
      |--------------------------------------------------------------------------
      | No Batches
      |--------------------------------------------------------------------------
      */

      if (!batches.length) {
        return res.status(200).json({
          success: true,

          data: {
            summary: {
              totalBatches: 0,
              totalStudents: 0,
              totalAdmissions: 0,
              totalCapacity: 0,
              totalOccupiedSeats: 0,
              totalAvailableSeats: 0,
              totalCourseFees: 0,
              totalPaidAmount: 0,
              totalRemainingAmount: 0,
              activeAdmissions: 0,
              completedAdmissions: 0,
              droppedAdmissions: 0,
            },

            batches: [],
          },
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Batch IDs
      |--------------------------------------------------------------------------
      */

      const batchIds =
        batches.map(
          (batch) =>
            batch._id
        );

      /*
      |--------------------------------------------------------------------------
      | Load Admissions
      |--------------------------------------------------------------------------
      */

      const admissions =
        await StudentAdmission.find({
          batch_id: {
            $in: batchIds,
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
          .lean();

      /*
      |--------------------------------------------------------------------------
      | Group Report
      |--------------------------------------------------------------------------
      */

      const grouped =
        new Map();

      batches.forEach(
        (batch) => {
          const maxSeats =
            Number(
              batch.max_seats || 0
            );

          const availableSeats =
            Math.max(
              Number(
                batch.available_seats ||
                  0
              ),
              0
            );

          const occupiedSeats =
            Math.max(
              maxSeats -
                availableSeats,
              0
            );

          grouped.set(
            String(batch._id),
            {
              batch,

              studentIds:
                new Set(),

              totalAdmissions: 0,

              activeAdmissions: 0,

              completedAdmissions: 0,

              droppedAdmissions: 0,

              totalCourseFees: 0,

              totalPaidAmount: 0,

              totalRemainingAmount: 0,

              occupiedAdmissionCount: 0,
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
            !admission.batch_id?._id
          ) {
            return;
          }

          const key =
            String(
              admission.batch_id._id
            );

          const report =
            grouped.get(key);

          if (!report) {
            return;
          }

          /*
          |----------------------------------------------------------------------
          | Unique Students
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
          | Admissions
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

            report.occupiedAdmissionCount +=
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
          | Financials
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
      | Build Report
      |--------------------------------------------------------------------------
      */

      const reportBatches =
        Array.from(
          grouped.values()
        ).map(
          (item) => {
            const batch =
              item.batch;

            const maxSeats =
              Number(
                batch.max_seats || 0
              );

            const availableSeats =
              Math.max(
                Number(
                  batch.available_seats ||
                    0
                ),
                0
              );

            /*
             * The database seat values are
             * authoritative for capacity.
             */
            const occupiedSeats =
              Math.max(
                maxSeats -
                  availableSeats,
                0
              );

            const occupancyPercentage =
              maxSeats > 0
                ? Number(
                    (
                      (occupiedSeats /
                        maxSeats) *
                      100
                    ).toFixed(2)
                  )
                : 0;

            return {
              batch,

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

              maxSeats,

              occupiedSeats,

              availableSeats,

              occupancyPercentage,

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
            };
          }
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
        reportBatches.reduce(
          (result, item) => {
            result.totalBatches +=
              1;

            result.totalAdmissions +=
              item.totalAdmissions;

            result.activeAdmissions +=
              item.activeAdmissions;

            result.completedAdmissions +=
              item.completedAdmissions;

            result.droppedAdmissions +=
              item.droppedAdmissions;

            result.totalCapacity +=
              item.maxSeats;

            result.totalOccupiedSeats +=
              item.occupiedSeats;

            result.totalAvailableSeats +=
              item.availableSeats;

            result.totalCourseFees +=
              item.totalCourseFees;

            result.totalPaidAmount +=
              item.totalPaidAmount;

            result.totalRemainingAmount +=
              item.totalRemainingAmount;

            return result;
          },
          {
            totalBatches: 0,

            totalStudents:
              uniqueStudents.size,

            totalAdmissions: 0,

            totalCapacity: 0,

            totalOccupiedSeats: 0,

            totalAvailableSeats: 0,

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
      | Response
      |--------------------------------------------------------------------------
      */

      return res.status(200).json({
        success: true,

        data: {
          summary,

          batches:
            reportBatches,
        },
      });
    } catch (error) {
      console.error(
        "Batch report error:",
        error
      );

      next(error);
    }
  };