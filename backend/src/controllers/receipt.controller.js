import Payment from "../models/Payment.js";
import StudentAdmission from "../models/StudentAdmission.js";

export const verifyReceipt = async (req, res, next) => {
  try {
    const { receiptNo } = req.params;

    if (!receiptNo || !receiptNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "Receipt number is required.",
      });
    }

    const payment = await Payment.findOne({
      receipt_no: receiptNo.trim().toUpperCase(),
    })
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
            select: "courseTitle courseType",
          },
          {
            path: "batch_id",
            select: "batch_name status",
          },
        ],
      })
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Receipt not found.",
      });
    }

    /*
     * Only verified payments are publicly verifiable.
     */
    if (payment.status !== "Verified") {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `This receipt is not verified. Current status: ${payment.status}.`,
      });
    }

    const student = payment.student_id;
    const admission = payment.admission_id;

    if (!student || !admission) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Receipt relationship data is incomplete.",
      });
    }

    const totalFee = Number(admission.final_amount || 0);
    const paidFee = Number(admission.paid_amount || 0);

    const remainingFee = Math.max(
      0,
      totalFee - paidFee
    );

    return res.status(200).json({
      success: true,
      verified: true,
      message: "Receipt verified successfully.",
      data: {
        receipt: {
          receiptNo: payment.receipt_no,
          amount: Number(payment.amount || 0),
          paymentDate: payment.payment_date,
          paymentMode: payment.payment_mode,
          status: payment.status,
          notes: payment.notes || "",
        },

        student: {
          rollNo: student.rollNo || "",
          firstName: student.firstName || "",
          surname: student.surname || "",
          fullName: [
            student.firstName,
            student.surname,
          ]
            .filter(Boolean)
            .join(" "),
        },

        admission: {
          admissionDate: admission.admission_date,
          courseType: admission.course_type || "",
          courseTitle:
            admission.course_id?.courseTitle || "",
          batchName:
            admission.batch_id?.batch_name || "",
          totalFee,
          paidFee,
          remainingFee,
          status: admission.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};