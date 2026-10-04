import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";

import generateReceiptNumber from "../utils/generateReceiptNumber.js";

const getAuthenticatedStudentId =
  async (req) => {
    if (req.user?.student_id) {
      return req.user.student_id;
    }

    if (req.user?.studentId) {
      return req.user.studentId;
    }

    if (req.user?.student?._id) {
      return req.user.student._id;
    }

    if (req.user?.email) {
      const student =
        await Student.findOne({
          email: req.user.email,
        }).select("_id");

      return student?._id || null;
    }

    return null;
  };

const syncAdmissionPaidAmount =
  async (
    admissionId,
    session
  ) => {
    const result =
      await Payment.aggregate([
        {
          $match: {
            admission_id:
              new mongoose.Types.ObjectId(
                admissionId
              ),
            status: "Verified",
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: {
              $sum: "$amount",
            },
          },
        },
      ]).session(session);

    const totalPaid =
      result[0]?.totalPaid || 0;

    await StudentAdmission.updateOne(
      {
        _id: admissionId,
      },
      {
        $set: {
          paid_amount: Number(
            totalPaid.toFixed(2)
          ),
        },
      },
      {
        session,
      }
    );

    return totalPaid;
  };

const validateAdmissionAndStudent =
  async (
    studentId,
    admissionId,
    session
  ) => {
    const admission =
      await StudentAdmission.findById(
        admissionId
      ).session(session);

    if (!admission) {
      const error =
        new Error(
          "Admission not found."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      String(admission.student_id) !==
      String(studentId)
    ) {
      const error =
        new Error(
          "Selected student does not belong to this admission."
        );

      error.statusCode = 400;

      throw error;
    }

    const student =
      await Student.findById(
        studentId
      ).session(session);

    if (!student) {
      const error =
        new Error(
          "Student not found."
        );

      error.statusCode = 404;

      throw error;
    }

    return {
      admission,
      student,
    };
  };

/*
|--------------------------------------------------------------------------
| GET /api/payments
|--------------------------------------------------------------------------
*/

// export const getPayments =
//   async (req, res) => {
//     try {
//       const {
//         search = "",
//         status = "",
//         payment_mode = "",
//         admission_id = "",
//         student_id = "",
//         page = 1,
//         limit = 10,
//         sort = "-payment_date",
//       } = req.query;

//       const currentPage = Math.max(
//         Number(page) || 1,
//         1
//       );

//       const perPage = Math.min(
//         Math.max(
//           Number(limit) || 10,
//           1
//         ),
//         100
//       );

//       const query = {};

//       if (req.user?.role === "student") {
//         const ownStudentId =
//           await getAuthenticatedStudentId(
//             req
//           );

//         if (!ownStudentId) {
//           return res.status(403).json({
//             success: false,
//             message:
//               "Student record could not be resolved.",
//           });
//         }

//         query.student_id =
//           ownStudentId;
//       } else {
//         if (student_id) {
//           query.student_id =
//             student_id;
//         }

//         if (admission_id) {
//           query.admission_id =
//             admission_id;
//         }
//       }

//       if (status) {
//         query.status = status;
//       }

//       if (payment_mode) {
//         query.payment_mode =
//           payment_mode;
//       }

//       /*
// |--------------------------------------------------------------------------
// | SEARCH
// |--------------------------------------------------------------------------
// |
// | Search:
// | 1. Receipt Number
// | 2. Notes
// | 3. Student Name
// | 4. Student Roll No
// |
// |--------------------------------------------------------------------------
// */

// if (search.trim()) {
//   const searchValue =
//     search.trim();

//   const escapedSearch =
//     searchValue.replace(
//       /[.*+?^${}()|[\]\\]/g,
//       "\\$&"
//     );

//   const regex =
//     new RegExp(
//       escapedSearch,
//       "i"
//     );

//   const matchingStudents =
//     await Student.find({
//       $or: [
//         {
//           firstName: regex,
//         },
//         {
//           surname: regex,
//         },
//         {
//           rollNo: regex,
//         },
//       ],
//     })
//       .select("_id")
//       .lean();

//   const studentIds =
//     matchingStudents.map(
//       (student) =>
//         student._id
//     );

//   paymentQuery.$or = [
//     {
//       receipt_no: regex,
//     },
//     {
//       notes: regex,
//     },
//     {
//       student_id: {
//         $in: studentIds,
//       },
//     },
//   ];
// }

//       // if (search.trim()) {
//       //   query.$or = [
//       //     {
//       //       receipt_no: {
//       //         $regex: search.trim(),
//       //         $options: "i",
//       //       },
//       //     },
//       //     {
//       //       notes: {
//       //         $regex: search.trim(),
//       //         $options: "i",
//       //       },
//       //     },
//       //   ];
//       // }

//       const sort = {};

//       sort[sortBy] =
//         sortOrder === "asc"
//           ? 1
//           : -1;

//       const skip =
//         (currentPage - 1) *
//         perPage;

//       const [
//         payments,
//         total,
//       ] = await Promise.all([
//         Payment.find(query)
//           // .populate(
//           //   "student_id",
//           //   "rollNo firstName surname mobile email"
//           // )
//           // .populate(
//           //   "admission_id",
//           //   "course_type course_fee final_amount paid_amount admission_date status"
//           // )
//           .populate({
//             path: "student_id",
//             select:
//               "rollNo firstName surname fatherName profileImage",
//           })
//           .populate({
//             path: "admission_id",
//             select:
//               "course_id batch_id course_type course_fee discount_type discount_value gst_amount final_amount paid_amount admission_fee admission_date status",
//             populate: [
//               {
//                 path: "course_id",
//                 select:
//                   "courseTitle courseType",
//               },
//               {
//                 path: "batch_id",
//                 select:
//                   "batch_name status",
//               },
//             ],
//           })
//           .sort(sort)
//           .skip(skip)
//           .limit(perPage)
//           .lean(),

//         Payment.countDocuments(query),
//       ]);

//       return res.status(200).json({
//         success: true,
//         data: {
//           payments,
//           pagination: {
//             page: currentPage,
//             limit: perPage,
//             total,
//             totalPages:
//               Math.ceil(
//                 total / perPage
//               ) || 1,
//           },
//         },
//       });
//     } catch (error) {
//       console.error(
//         "Get payments error:",
//         error
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Unable to load payments.",
//       });
//     }
//   };

/*
|--------------------------------------------------------------------------
| GET /api/payments
|--------------------------------------------------------------------------
*/

export const getPayments = async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      payment_mode = "",
      admission_id = "",
      student_id = "",
      page = 1,
      limit = 10,
      sort = "-payment_date",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);

    const perPage = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const query = {};

    /*
    |--------------------------------------------------------------------------
    | STUDENT ACCESS
    |--------------------------------------------------------------------------
    */

    if (req.user?.role === "student") {
      const ownStudentId = await getAuthenticatedStudentId(req);

      if (!ownStudentId) {
        return res.status(403).json({
          success: false,
          message: "Student record could not be resolved.",
        });
      }

      query.student_id = ownStudentId;
    } else {
      /*
      |--------------------------------------------------------------------------
      | ADMIN / WEBSITE EDITOR FILTERS
      |--------------------------------------------------------------------------
      */

      if (student_id) {
        query.student_id = student_id;
      }

      if (admission_id) {
        query.admission_id = admission_id;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS FILTER
    |--------------------------------------------------------------------------
    */

    if (status) {
      query.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT MODE FILTER
    |--------------------------------------------------------------------------
    */

    if (payment_mode) {
      query.payment_mode = payment_mode;
    }

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    |
    | Search supports:
    |
    | 1. Receipt Number
    | 2. Notes
    | 3. Student First Name
    | 4. Student Surname
    | 5. Student Roll Number
    | 6. Full Student Name
    |
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const searchValue = search.trim();

      /*
      |--------------------------------------------------------------------------
      | Escape regex special characters
      |--------------------------------------------------------------------------
      */

      const escapeRegex = (value) => {
        return value.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
      };

      const escapedSearch = escapeRegex(searchValue);

      const regex = new RegExp(
        escapedSearch,
        "i"
      );

      /*
      |--------------------------------------------------------------------------
      | Find students matching search
      |--------------------------------------------------------------------------
      */

      const searchTokens = searchValue
        .split(/\s+/)
        .filter(Boolean);

      let matchingStudents = [];

      /*
      |--------------------------------------------------------------------------
      | Single word search
      |--------------------------------------------------------------------------
      */

      if (searchTokens.length === 1) {
        matchingStudents = await Student.find({
          $or: [
            {
              firstName: regex,
            },
            {
              surname: regex,
            },
            {
              rollNo: regex,
            },
          ],
        })
          .select("_id")
          .lean();
      } else {
        /*
        |--------------------------------------------------------------------------
        | Full name search
        |
        | Example:
        | Rahul Sharma
        |
        | Will match:
        | firstName = Rahul
        | surname = Sharma
        |--------------------------------------------------------------------------
        */

        const tokenConditions = searchTokens.map(
          (token) => {
            const tokenRegex = new RegExp(
              escapeRegex(token),
              "i"
            );

            return {
              $or: [
                {
                  firstName: tokenRegex,
                },
                {
                  surname: tokenRegex,
                },
                {
                  rollNo: tokenRegex,
                },
              ],
            };
          }
        );

        matchingStudents = await Student.find({
          $and: tokenConditions,
        })
          .select("_id")
          .lean();
      }

      const studentIds = matchingStudents.map(
        (student) => student._id
      );

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT:
      | Use query, NOT paymentQuery
      |--------------------------------------------------------------------------
      */

      query.$or = [
        {
          receipt_no: regex,
        },
        {
          notes: regex,
        },
        {
          student_id: {
            $in: studentIds,
          },
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | SORT
    |--------------------------------------------------------------------------
    */

    let sortObject = {
      payment_date: -1,
    };

    if (sort) {
      if (sort.startsWith("-")) {
        sortObject = {
          [sort.substring(1)]: -1,
        };
      } else {
        sortObject = {
          [sort]: 1,
        };
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

    const skip =
      (currentPage - 1) * perPage;

    /*
    |--------------------------------------------------------------------------
    | FETCH PAYMENTS
    |--------------------------------------------------------------------------
    */

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(query)
        .populate({
          path: "student_id",
          select:
            "rollNo firstName surname fatherName profileImage",
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
        .sort(sortObject)
        .skip(skip)
        .limit(perPage)
        .lean(),

      Payment.countDocuments(query),
    ]);

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      data: {
        payments,

        pagination: {
          page: currentPage,
          limit: perPage,
          total,

          totalPages:
            Math.ceil(
              total / perPage
            ) || 1,
        },
      },
    });
  } catch (error) {
    console.error(
      "Get payments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load payments.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET /api/payments/student/:studentId
|--------------------------------------------------------------------------
| Get complete payment history for one student
|--------------------------------------------------------------------------
*/

export const getStudentPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get Student
    |--------------------------------------------------------------------------
    */

    const student = await Student.findById(studentId)
      .select(
        "rollNo firstName surname fatherName mobile email profileImage"
      )
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Student authorization
    |--------------------------------------------------------------------------
    */

    if (req.user?.role === "student") {
      const authenticatedStudentId =
        await getAuthenticatedStudentId(req);

      if (
        !authenticatedStudentId ||
        String(authenticatedStudentId) !==
          String(studentId)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access this student's payment history.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Get Payments
    |--------------------------------------------------------------------------
    */

    const payments = await Payment.find({
      student_id: studentId,
    })
      .populate({
        path: "admission_id",
        select:
          "course_id batch_id course_type course_fee discount_type discount_value gst_amount final_amount paid_amount admission_fee admission_date status",
        populate: [
          {
            path: "course_id",
            select: "courseTitle courseType",
          },
          {
            path: "batch_id",
            select: "batch_name status",
          },
        ],
      })
      .sort({
        payment_date: -1,
        createdAt: -1,
      })
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Calculate summary
    |--------------------------------------------------------------------------
    */

    const verifiedPayments = payments.filter(
      (payment) =>
        payment.status === "Verified"
    );

    const totalPaid = verifiedPayments.reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

    /*
    |--------------------------------------------------------------------------
    | Find latest admission
    |--------------------------------------------------------------------------
    */

    const latestAdmission =
      payments.find(
        (payment) =>
          payment.admission_id
      )?.admission_id || null;

    const totalFee = Number(
      latestAdmission?.final_amount || 0
    );

    const remainingAmount = Math.max(
      totalFee - totalPaid,
      0
    );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      data: {
        student,

        admission: latestAdmission,

        summary: {
          totalFee: Number(
            totalFee.toFixed(2)
          ),

          totalPaid: Number(
            totalPaid.toFixed(2)
          ),

          remainingAmount: Number(
            remainingAmount.toFixed(2)
          ),

          totalPayments: payments.length,
        },

        payments,
      },
    });
  } catch (error) {
    console.error(
      "Get student payment history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Unable to load student payment history.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/payments/:id
|--------------------------------------------------------------------------
*/

export const getPayment =
  async (req, res) => {
    try {
      const payment =
        await Payment.findById(
          req.params.id
        )
          .populate(
            "student_id",
            "rollNo firstName surname mobile email"
          )
          .populate(
            "admission_id",
            "course_type course_fee discount_type discount_value gst_amount final_amount paid_amount admission_date status"
          );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      if (req.user?.role === "student") {
        const ownStudentId =
          await getAuthenticatedStudentId(
            req
          );

        if (
          !ownStudentId ||
          String(
            payment.student_id?._id
          ) !==
            String(ownStudentId)
        ) {
          return res.status(403).json({
            success: false,
            message:
              "You are not authorized to access this payment.",
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error(
        "Get payment error:",
        error
      );

      if (
        error instanceof
          mongoose.Error.CastError
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment ID.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to load payment.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/payments
|--------------------------------------------------------------------------
*/

export const createPayment =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      let createdPayment = null;

      await session.withTransaction(
        async () => {
          const {
            student_id,
            admission_id,
            amount,
            payment_date,
            payment_mode,
            notes,
            status = "Verified",
          } = req.body;

          const numericAmount =
            Number(amount);

          if (
            !Number.isFinite(
              numericAmount
            ) ||
            numericAmount <= 0
          ) {
            const error =
              new Error(
                "Payment amount must be greater than zero."
              );

            error.statusCode = 400;

            throw error;
          }

          const {
            admission,
          } =
            await validateAdmissionAndStudent(
              student_id,
              admission_id,
              session
            );

          const currentPaid =
            await syncAdmissionPaidAmount(
              admission_id,
              session
            );

          if (
            status === "Verified"
          ) {
            const remaining =
              Math.max(
                Number(
                  admission.final_amount ||
                    0
                ) -
                  Number(
                    currentPaid || 0
                  ),
                0
              );

            if (
              numericAmount >
              remaining
            ) {
              const error =
                new Error(
                  `Payment amount cannot exceed remaining amount of ₹${remaining.toFixed(
                    2
                  )}.`
                );

              error.statusCode = 400;

              throw error;
            }
          }

          let receiptNo =
            req.body.receipt_no?.trim();

          if (!receiptNo) {
            receiptNo =
              generateReceiptNumber();
          }

          const duplicate =
            await Payment.findOne({
              receipt_no:
                receiptNo.toUpperCase(),
            }).session(session);

          if (duplicate) {
            const error =
              new Error(
                "Receipt number already exists."
              );

            error.statusCode = 409;

            throw error;
          }

          const [payment] =
            await Payment.create(
              [
                {
                  student_id,
                  admission_id,
                  amount:
                    Number(
                      numericAmount.toFixed(
                        2
                      )
                    ),
                  payment_date:
                    payment_date ||
                    new Date(),
                  payment_mode,
                  receipt_no:
                    receiptNo.toUpperCase(),
                  notes:
                    notes || "",
                  status,
                },
              ],
              {
                session,
              }
            );

          await syncAdmissionPaidAmount(
            admission_id,
            session
          );

          createdPayment =
            payment;
        }
      );

      const populatedPayment =
        await Payment.findById(
          createdPayment._id
        )
          .populate(
            "student_id",
            "rollNo firstName surname mobile email"
          )
          .populate(
            "admission_id",
            "course_type course_fee final_amount paid_amount admission_date status"
          );

      return res.status(201).json({
        success: true,
        message:
          "Payment created successfully.",
        data: populatedPayment,
      });
    } catch (error) {
      console.error(
        "Create payment error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Receipt number already exists.",
        });
      }

      return res
        .status(
          error.statusCode || 500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Unable to create payment.",
        });
    } finally {
      await session.endSession();
    }
  };

/*
|--------------------------------------------------------------------------
| PUT /api/payments/:id
|--------------------------------------------------------------------------
*/

export const updatePayment =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      let updatedPayment = null;

      await session.withTransaction(
        async () => {
          const payment =
            await Payment.findById(
              req.params.id
            ).session(session);

          if (!payment) {
            const error =
              new Error(
                "Payment not found."
              );

            error.statusCode = 404;

            throw error;
          }

          const oldAdmissionId =
            payment.admission_id;

          const oldStudentId =
            payment.student_id;

          const newStudentId =
            req.body.student_id ||
            oldStudentId;

          const newAdmissionId =
            req.body.admission_id ||
            oldAdmissionId;

          await validateAdmissionAndStudent(
            newStudentId,
            newAdmissionId,
            session
          );

          const newAmount =
            req.body.amount !==
            undefined
              ? Number(
                  req.body.amount
                )
              : Number(payment.amount);

          if (
            !Number.isFinite(
              newAmount
            ) ||
            newAmount <= 0
          ) {
            const error =
              new Error(
                "Payment amount must be greater than zero."
              );

            error.statusCode = 400;

            throw error;
          }

          const newStatus =
            req.body.status ||
            payment.status;

          if (
            newStatus ===
            "Verified"
          ) {
            const admission =
              await StudentAdmission.findById(
                newAdmissionId
              ).session(session);

            const otherPayments =
              await Payment.aggregate([
                {
                  $match: {
                    admission_id:
                      new mongoose.Types.ObjectId(
                        newAdmissionId
                      ),
                    status: "Verified",
                    _id: {
                      $ne:
                        payment._id,
                    },
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalPaid: {
                      $sum: "$amount",
                    },
                  },
                },
              ]).session(session);

            const paidByOthers =
              otherPayments[0]
                ?.totalPaid || 0;

            const remaining =
              Math.max(
                Number(
                  admission.final_amount ||
                    0
                ) -
                  Number(
                    paidByOthers || 0
                  ),
                0
              );

            if (
              newAmount >
              remaining
            ) {
              const error =
                new Error(
                  `Payment amount cannot exceed remaining amount of ₹${remaining.toFixed(
                    2
                  )}.`
                );

              error.statusCode = 400;

              throw error;
            }
          }

          if (
            req.body.receipt_no &&
            req.body.receipt_no !==
              payment.receipt_no
          ) {
            const duplicate =
              await Payment.findOne({
                receipt_no:
                  req.body.receipt_no
                    .trim()
                    .toUpperCase(),
                _id: {
                  $ne:
                    payment._id,
                },
              }).session(session);

            if (duplicate) {
              const error =
                new Error(
                  "Receipt number already exists."
                );

              error.statusCode = 409;

              throw error;
            }
          }

          payment.student_id =
            newStudentId;

          payment.admission_id =
            newAdmissionId;

          payment.amount =
            Number(
              newAmount.toFixed(2)
            );

          if (
            req.body.payment_date
          ) {
            payment.payment_date =
              req.body.payment_date;
          }

          if (
            req.body.payment_mode
          ) {
            payment.payment_mode =
              req.body.payment_mode;
          }

          if (
            req.body.receipt_no
          ) {
            payment.receipt_no =
              req.body.receipt_no
                .trim()
                .toUpperCase();
          }

          if (
            req.body.notes !==
            undefined
          ) {
            payment.notes =
              req.body.notes;
          }

          if (
            req.body.status
          ) {
            payment.status =
              req.body.status;
          }

          await payment.save({
            session,
          });

          await syncAdmissionPaidAmount(
            oldAdmissionId,
            session
          );

          if (
            String(oldAdmissionId) !==
            String(newAdmissionId)
          ) {
            await syncAdmissionPaidAmount(
              newAdmissionId,
              session
            );
          }

          updatedPayment =
            payment;
        }
      );

      const populatedPayment =
        await Payment.findById(
          updatedPayment._id
        )
          .populate(
            "student_id",
            "rollNo firstName surname mobile email"
          )
          .populate(
            "admission_id",
            "course_type course_fee final_amount paid_amount admission_date status"
          );

      return res.status(200).json({
        success: true,
        message:
          "Payment updated successfully.",
        data: populatedPayment,
      });
    } catch (error) {
      console.error(
        "Update payment error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Receipt number already exists.",
        });
      }

      return res
        .status(
          error.statusCode || 500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Unable to update payment.",
        });
    } finally {
      await session.endSession();
    }
  };

/*
|--------------------------------------------------------------------------
| DELETE /api/payments/:id
|--------------------------------------------------------------------------
*/

export const deletePayment =
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      await session.withTransaction(
        async () => {
          const payment =
            await Payment.findById(
              req.params.id
            ).session(session);

          if (!payment) {
            const error =
              new Error(
                "Payment not found."
              );

            error.statusCode = 404;

            throw error;
          }

          const admissionId =
            payment.admission_id;

          await Payment.deleteOne(
            {
              _id: payment._id,
            },
            {
              session,
            }
          );

          await syncAdmissionPaidAmount(
            admissionId,
            session
          );
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Payment deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete payment error:",
        error
      );

      return res
        .status(
          error.statusCode || 500
        )
        .json({
          success: false,
          message:
            error.message ||
            "Unable to delete payment.",
        });
    } finally {
      await session.endSession();
    }
  };