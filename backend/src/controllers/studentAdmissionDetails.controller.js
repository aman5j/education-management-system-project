import mongoose from "mongoose";

import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";
import InstituteSettings from "../models/InstituteSettings.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const moneyValue = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
};

const getDiscountAmount = (admission) => {
  const courseFee = Number(admission.course_fee || 0);
  const discountValue = Number(admission.discount_value || 0);

  let discount = 0;

  if (admission.discount_type === "Percentage") {
    discount = (courseFee * discountValue) / 100;
  } else {
    discount = discountValue;
  }

  return Math.min(Math.max(discount, 0), courseFee);
};

export const getMyAdmissionDetails = async (req, res, next) => {
  try {
    if (req.user?.role !== "student") {
      return fail(res, 403, "Student portal access only.");
    }

    const studentId = req.user?.studentRecord;

    if (!mongoose.isValidObjectId(studentId)) {
      return fail(
        res,
        409,
        "Your login is not linked to a valid student record."
      );
    }

    const [student, admissions, institute] = await Promise.all([
      Student.findById(studentId)
        .select(
          "rollNo firstName surname fatherName mobile alternateMobile email address pincode profileImage status"
        )
        .lean(),

      StudentAdmission.find({
        student_id: studentId,
      })
        .populate(
          "course_id",
          "courseTitle courseType duration durationUnit"
        )
        .populate(
          "batch_id",
          "batch_name status"
        )
        .sort({
          admission_date: -1,
          createdAt: -1,
        })
        .lean(),

      InstituteSettings.findOne({ key: "default" })
        .select(
          "instituteName legalName logoUrl email phone alternatePhone website address city state postalCode country"
        )
        .lean(),
    ]);

    if (!student) {
      return fail(res, 404, "Student record not found.");
    }

    const formattedAdmissions = admissions.map((admission) => {
      const course = admission.course_id || {};
      const batch = admission.batch_id || {};

      const courseFee = moneyValue(admission.course_fee);
      const discountAmount = moneyValue(
        getDiscountAmount(admission)
      );
      const gstAmount = moneyValue(admission.gst_amount);
      const admissionFee = moneyValue(admission.admission_fee);
      const finalAmount = moneyValue(admission.final_amount);
      const paidAmount = moneyValue(admission.paid_amount);

      return {
        id: String(admission._id),

        // Display-only reference. No database field is added or modified.
        admissionNumber: `ADM-${String(admission._id)
          .slice(-8)
          .toUpperCase()}`,

        admissionDate: admission.admission_date || null,
        status: admission.status || "Unknown",

        course: {
          id: course._id ? String(course._id) : "",
          name: course.courseTitle || "Course unavailable",
          type: admission.course_type || course.courseType || "",
          duration: course.duration || 0,
          durationUnit: course.durationUnit || "",
        },

        batch: batch.batch_name || "Batch unavailable",
        batchStatus: batch.status || "",

        finance: {
          courseFee,
          discountType: admission.discount_type || "Amount",
          discountValue: moneyValue(admission.discount_value),
          discountAmount,
          gstTaken: Boolean(admission.is_gst_taken),
          gstAmount,
          admissionFee,
          finalAmount,
          paidAmount,
          remainingAmount: moneyValue(
            Math.max(0, finalAmount - paidAmount)
          ),
        },
      };
    });

    const instituteAddress = [
      institute?.address,
      institute?.city,
      institute?.state,
      institute?.postalCode,
      institute?.country,
    ]
      .filter(Boolean)
      .join(", ");

    return res.status(200).json({
      success: true,
      data: {
        student: {
          id: String(student._id),
          name: [student.firstName, student.surname]
            .filter(Boolean)
            .join(" "),
          firstName: student.firstName || "",
          surname: student.surname || "",
          rollNo: student.rollNo || "",
          fatherName: student.fatherName || "",
          mobile: student.mobile || "",
          alternateMobile: student.alternateMobile || "",
          email: student.email || "",
          address: student.address || "",
          pincode: student.pincode || "",
          profileImage: student.profileImage || "",
          status: student.status || "",
        },

        institute: {
          name:
            institute?.instituteName ||
            institute?.legalName ||
            "Institute",
          logoUrl: institute?.logoUrl || "",
          address: instituteAddress,
          email: institute?.email || "",
          phone: institute?.phone || "",
          alternatePhone: institute?.alternatePhone || "",
          website: institute?.website || "",
        },

        totalAdmissions: formattedAdmissions.length,
        admissions: formattedAdmissions,
      },
    });
  } catch (error) {
    next(error);
  }
};