import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import StudentAdmission from "../models/StudentAdmission.js";

/*
|--------------------------------------------------------------------------
| GET PAYMENT REPORT FILTER OPTIONS
|--------------------------------------------------------------------------
|
| GET /api/reports/payment-filters
|
| Returns:
| - Courses
| - Batches
| - Students
|
|--------------------------------------------------------------------------
*/

export const getPaymentReportFilters = async (
  req,
  res
) => {
  try {
    const [
      courses,
      batches,
      students,
    ] = await Promise.all([
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
          select: "courseTitle courseType",
        })
        .sort({
          batch_name: 1,
        })
        .lean(),

      Student.find({})
        .select(
          "_id rollNo firstName surname status"
        )
        .sort({
          firstName: 1,
          surname: 1,
        })
        .lean(),
    ]);

    return res.status(200).json({
      success: true,

      data: {
        courses,
        batches,
        students,
      },
    });
  } catch (error) {
    console.error(
      "Get payment report filters error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load payment report filters.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PAYMENT REPORT
|--------------------------------------------------------------------------
|
| Filters:
|
| date_from
| date_to
| course_id
| batch_id
| status
| payment_mode
| student_id
|
|--------------------------------------------------------------------------
*/

export const getPaymentReport = async (
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
      payment_mode = "",
      student_id = "",
    } = req.query;

    const match = {};

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    if (status) {
      const allowedStatuses = [
        "Verified",
        "Pending",
        "Failed",
        "Overdue",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      match.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Payment Mode
    |--------------------------------------------------------------------------
    */

    if (payment_mode) {
      const allowedPaymentModes = [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
      ];

      if (
        !allowedPaymentModes.includes(
          payment_mode
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment mode.",
        });
      }

      match.payment_mode =
        payment_mode;
    }

    /*
    |--------------------------------------------------------------------------
    | Student
    |--------------------------------------------------------------------------
    */

    if (student_id) {
      if (
        !mongoose.Types.ObjectId.isValid(
          student_id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid student ID.",
        });
      }

      match.student_id =
        new mongoose.Types.ObjectId(
          student_id
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Date Range
    |--------------------------------------------------------------------------
    */

    if (date_from || date_to) {
      match.payment_date = {};

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

        match.payment_date.$gte =
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

        match.payment_date.$lte =
          endDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Course / Batch
    |--------------------------------------------------------------------------
    |
    | Both Course and Batch belong to StudentAdmission.
    |
    */

    if (course_id || batch_id) {
      const admissionMatch = {};

      /*
      |----------------------------------------------------------------------
      | Course
      |----------------------------------------------------------------------
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

        admissionMatch.course_id =
          new mongoose.Types.ObjectId(
            course_id
          );
      }

      /*
      |----------------------------------------------------------------------
      | Batch
      |----------------------------------------------------------------------
      */

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

      const admissions =
        await StudentAdmission.find(
          admissionMatch
        )
          .select("_id")
          .lean();

      const admissionIds =
        admissions.map(
          (admission) =>
            admission._id
        );

      /*
      |----------------------------------------------------------------------
      | No matching admissions
      |----------------------------------------------------------------------
      */

      if (
        admissionIds.length === 0
      ) {
        return res.status(200).json({
          success: true,

          data: {
            summary: {
              totalStudents: 0,
              totalTransactions: 0,
              totalFeesCollected: 0,
              pendingPayments: 0,
              overduePayments: 0,
              failedPayments: 0,
            },

            paymentModeSummary: [
              {
                mode: "Cash",
                amount: 0,
              },
              {
                mode: "UPI",
                amount: 0,
              },
              {
                mode: "Card",
                amount: 0,
              },
              {
                mode: "Bank Transfer",
                amount: 0,
              },
            ],

            transactions: [],
          },
        });
      }

      match.admission_id = {
        $in: admissionIds,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Load Payments
    |--------------------------------------------------------------------------
    */

    const payments =
      await Payment.find(match)
        .populate({
          path: "student_id",
          select:
            "rollNo firstName surname mobile email",
        })
        .populate({
          path: "admission_id",
          select:
            "course_id batch_id course_type course_fee discount_type discount_value gst_amount final_amount paid_amount admission_fee admission_date status",

          populate: [
            {
              path: "course_id",
              select:
                "courseTitle courseType",
            },

            {
              path: "batch_id",
              select:
                "batch_name status",
            },
          ],
        })
        .sort({
          payment_date: -1,
        })
        .lean();

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const totalTransactions =
      payments.length;

    const totalCollected =
      payments
        .filter(
          (payment) =>
            payment.status ===
            "Verified"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const pendingAmount =
      payments
        .filter(
          (payment) =>
            payment.status ===
            "Pending"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const overdueAmount =
      payments
        .filter(
          (payment) =>
            payment.status ===
            "Overdue"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const failedAmount =
      payments
        .filter(
          (payment) =>
            payment.status ===
            "Failed"
        )
        .reduce(
          (total, payment) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    /*
    |--------------------------------------------------------------------------
    | Unique Students
    |--------------------------------------------------------------------------
    */

    const uniqueStudents =
      new Set(
        payments
          .map(
            (payment) =>
              payment.student_id?._id
          )
          .filter(Boolean)
          .map((id) =>
            String(id)
          )
      );

    /*
    |--------------------------------------------------------------------------
    | Payment Mode Summary
    |--------------------------------------------------------------------------
    */

    const paymentModeSummary = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      "Bank Transfer": 0,
    };

    payments.forEach(
      (payment) => {
        if (
          payment.status !==
          "Verified"
        ) {
          return;
        }

        const mode =
          payment.payment_mode;

        if (
          Object.prototype.hasOwnProperty.call(
            paymentModeSummary,
            mode
          )
        ) {
          paymentModeSummary[
            mode
          ] += Number(
            payment.amount || 0
          );
        }
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Transaction Data
    |--------------------------------------------------------------------------
    */

    const transactions =
      payments.map(
        (payment) => ({
          _id: payment._id,

          receipt_no:
            payment.receipt_no,

          payment_date:
            payment.payment_date,

          payment_mode:
            payment.payment_mode,

          amount: Number(
            payment.amount || 0
          ),

          status:
            payment.status,

          notes: payment.notes || "", // <-- Add this line

          student: {
            _id:
              payment.student_id?._id,

            rollNo:
              payment.student_id
                ?.rollNo || "",

            name: [
              payment.student_id
                ?.firstName,

              payment.student_id
                ?.surname,
            ]
              .filter(Boolean)
              .join(" "),
          },

          course:
            payment.admission_id
              ?.course_id
              ?.courseTitle ||
            payment.admission_id
              ?.course_type ||
            "",

          batch:
            payment.admission_id
              ?.batch_id
              ?.batch_name ||
            "",
        })
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      data: {
        summary: {
          totalStudents:
            uniqueStudents.size,

          totalTransactions,

          totalFeesCollected:
            Number(
              totalCollected.toFixed(
                2
              )
            ),

          pendingPayments:
            Number(
              pendingAmount.toFixed(
                2
              )
            ),

          overduePayments:
            Number(
              overdueAmount.toFixed(
                2
              )
            ),

          failedPayments:
            Number(
              failedAmount.toFixed(
                2
              )
            ),
        },

        paymentModeSummary:
          Object.entries(
            paymentModeSummary
          ).map(
            ([mode, amount]) => ({
              mode,

              amount: Number(
                amount.toFixed(
                  2
                )
              ),
            })
          ),

        transactions,
      },
    });
  } catch (error) {
    console.error(
      "Get payment report error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate payment report.",
    });
  }
};