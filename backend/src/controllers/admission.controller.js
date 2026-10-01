import mongoose from "mongoose";

import StudentAdmission from "../models/StudentAdmission.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeDiscountType = (value) => {
  if (value === "Percentage") {
    return "Percentage";
  }

  return "Amount";
};

const calculateAdmissionAmounts = ({
  courseFee,
  discountType,
  discountValue,
  isGstTaken,
  gstAmount,
  admissionFee,
}) => {
  const normalizedCourseFee = Math.max(
    Number(courseFee) || 0,
    0
  );

  const normalizedDiscountValue = Math.max(
    Number(discountValue) || 0,
    0
  );

  const normalizedDiscountType =
    normalizeDiscountType(discountType);

  let discountAmount = 0;

  if (normalizedDiscountType === "Percentage") {
    if (normalizedDiscountValue > 100) {
      throw new Error(
        "Percentage discount cannot exceed 100%."
      );
    }

    discountAmount =
      (normalizedCourseFee *
        normalizedDiscountValue) /
      100;
  } else {
    discountAmount = normalizedDiscountValue;
  }

  discountAmount = Math.min(
    discountAmount,
    normalizedCourseFee
  );

  const taxableAmount =
    normalizedCourseFee - discountAmount;

  const normalizedGstAmount = isGstTaken
    ? Math.max(Number(gstAmount) || 0, 0)
    : 0;

  const normalizedAdmissionFee = Math.max(
    Number(admissionFee) || 0,
    0
  );

  const finalAmount =
    taxableAmount +
    normalizedGstAmount +
    normalizedAdmissionFee;

  return {
    courseFee: Number(
      normalizedCourseFee.toFixed(2)
    ),
    discountType: normalizedDiscountType,
    discountValue: Number(
      normalizedDiscountValue.toFixed(2)
    ),
    discountAmount: Number(
      discountAmount.toFixed(2)
    ),
    taxableAmount: Number(
      taxableAmount.toFixed(2)
    ),
    gstAmount: Number(
      normalizedGstAmount.toFixed(2)
    ),
    admissionFee: Number(
      normalizedAdmissionFee.toFixed(2)
    ),
    finalAmount: Number(
      finalAmount.toFixed(2)
    ),
  };
};

const getPopulatedAdmission = async (id) => {
  return StudentAdmission.findById(id)
    .populate(
      "student_id",
      "rollNo firstName surname mobile email profileImage"
    )
    .populate(
      "course_id",
      "courseTitle courseType certificateDiploma price mrp"
    )
    .populate(
      "batch_id",
      "batch_name max_seats available_seats status course_id"
    );
};

/*
|--------------------------------------------------------------------------
| GET /api/admissions
|--------------------------------------------------------------------------
*/

export const getAdmissions = async (
  req,
  res,
  next
) => {
  try {
    const {
      search = "",
      student_id = "",
      course_id = "",
      batch_id = "",
      status = "",
      admittedFrom = "",
      admittedTo = "",
      page = 1,
      limit = 10,
      sortBy = "admission_date",
      sortOrder = "desc",
    } = req.query;

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const filter = {};

    if (student_id) {
      if (!isValidObjectId(student_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student ID.",
        });
      }

      filter.student_id = student_id;
    }

    if (course_id) {
      if (!isValidObjectId(course_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course ID.",
        });
      }

      filter.course_id = course_id;
    }

    if (batch_id) {
      if (!isValidObjectId(batch_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID.",
        });
      }

      filter.batch_id = batch_id;
    }

    if (status) {
      filter.status = status;
    }

    if (admittedFrom || admittedTo) {
      filter.admission_date = {};

      if (admittedFrom) {
        filter.admission_date.$gte =
          new Date(`${admittedFrom}T00:00:00.000Z`);
      }

      if (admittedTo) {
        filter.admission_date.$lte =
          new Date(`${admittedTo}T23:59:59.999Z`);
      }
    }

    const allowedSortFields = [
      "admission_date",
      "createdAt",
      "final_amount",
      "paid_amount",
      "status",
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : "admission_date";

    const safeSortOrder =
      sortOrder === "asc" ? 1 : -1;

    /*
     * Search is handled after population-friendly
     * filtering using aggregation when necessary.
     *
     * For the normal listing, we populate and then
     * filter search terms on the admission-level
     * fields as well as referenced names.
     */

    let admissionsQuery =
      StudentAdmission.find(filter)
        .populate(
          "student_id",
          "rollNo firstName surname mobile email profileImage"
        )
        .populate(
          "course_id",
          "courseTitle courseType certificateDiploma price mrp"
        )
        .populate(
          "batch_id",
          "batch_name max_seats available_seats status course_id"
        )
        .sort({
          [safeSortBy]: safeSortOrder,
        })
        .skip(skip)
        .limit(limitNumber);

    let admissions =
      await admissionsQuery;

    if (search.trim()) {
      const normalizedSearch =
        search.trim().toLowerCase();

      admissions =
        admissions.filter((admission) => {
          const student =
            admission.student_id;

          const course =
            admission.course_id;

          const batch =
            admission.batch_id;

          const values = [
            student?.rollNo,
            student?.firstName,
            student?.surname,
            student?.mobile,
            student?.email,
            course?.courseTitle,
            batch?.batch_name,
            admission.course_type,
            admission.referral_source,
            admission.remark,
          ];

          return values.some((value) =>
            String(value || "")
              .toLowerCase()
              .includes(normalizedSearch)
          );
        });
    }

    const total =
      await StudentAdmission.countDocuments(
        filter
      );

    const totalPages = Math.ceil(
      total / limitNumber
    );

    return res.status(200).json({
      success: true,
      data: {
        admissions,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/admissions/:id
|--------------------------------------------------------------------------
*/

export const getAdmission = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID.",
      });
    }

    const admission =
      await getPopulatedAdmission(id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: admission,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/admissions
|--------------------------------------------------------------------------
*/

export const createAdmission = async (
  req,
  res,
  next
) => {
  try {
    const {
      student_id,
      course_id,
      batch_id,
      course_type = "",
      course_fee,
      discount_type = "Amount",
      discount_value = 0,
      is_gst_taken = false,
      gst_amount = 0,
      admission_fee = 0,
      paid_amount = 0,
      admission_date,
      referral_source = "",
      status = "Active",
      remark = "",
    } = req.body;

    /*
     * Validate IDs
     */

    if (
      !isValidObjectId(student_id) ||
      !isValidObjectId(course_id) ||
      !isValidObjectId(batch_id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid student, course and batch IDs are required.",
      });
    }

    /*
     * Verify Student
     */

    const student =
      await Student.findById(student_id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    /*
     * Verify Course
     */

    const course =
      await Course.findById(course_id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    /*
     * Verify Batch
     */

    const batch =
      await Batch.findById(batch_id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    /*
     * Important:
     * Batch must belong to selected Course.
     */

    if (
      String(batch.course_id) !==
      String(course._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected batch does not belong to the selected course.",
      });
    }

    /*
     * Course fee:
     * use submitted fee if provided,
     * otherwise use Course price.
     */

    const resolvedCourseFee =
      course_fee !== undefined &&
      course_fee !== ""
        ? Number(course_fee)
        : Number(course.price || 0);

    const normalizedIsGstTaken =
      is_gst_taken === true ||
      is_gst_taken === "true";

    /*
     * Calculate all amounts on server.
     */

    const calculations =
      calculateAdmissionAmounts({
        courseFee: resolvedCourseFee,
        discountType: discount_type,
        discountValue: discount_value,
        isGstTaken:
          normalizedIsGstTaken,
        gstAmount: gst_amount,
        admissionFee: admission_fee,
      });

    const normalizedPaidAmount =
      Math.max(
        Number(paid_amount) || 0,
        0
      );

    if (
      normalizedPaidAmount >
      calculations.finalAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be greater than final amount.",
      });
    }

    const admission =
      await StudentAdmission.create({
        student_id,
        course_id,
        batch_id,

        course_type:
          course_type?.trim() ||
          course.courseType ||
          "",

        course_fee:
          calculations.courseFee,

        discount_type:
          calculations.discountType,

        discount_value:
          calculations.discountValue,

        is_gst_taken:
          normalizedIsGstTaken,

        gst_amount:
          calculations.gstAmount,

        final_amount:
          calculations.finalAmount,

        admission_fee:
          calculations.admissionFee,

        paid_amount:
          normalizedPaidAmount,

        admission_date,

        referral_source:
          referral_source?.trim() || "",

        status,

        remark:
          remark?.trim() || "",
      });

    const populatedAdmission =
      await getPopulatedAdmission(
        admission._id
      );

    return res.status(201).json({
      success: true,
      message:
        "Admission created successfully.",
      data: populatedAdmission,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/admissions/:id
|--------------------------------------------------------------------------
*/

export const updateAdmission = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID.",
      });
    }

    const admission =
      await StudentAdmission.findById(id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found.",
      });
    }

    const {
      student_id,
      course_id,
      batch_id,
      course_type,
      course_fee,
      discount_type,
      discount_value,
      is_gst_taken,
      gst_amount,
      admission_fee,
      paid_amount,
      admission_date,
      referral_source,
      status,
      remark,
    } = req.body;

    /*
     * Resolve final relationship IDs.
     */

    const resolvedStudentId =
      student_id || admission.student_id;

    const resolvedCourseId =
      course_id || admission.course_id;

    const resolvedBatchId =
      batch_id || admission.batch_id;

    if (
      !isValidObjectId(
        resolvedStudentId
      ) ||
      !isValidObjectId(
        resolvedCourseId
      ) ||
      !isValidObjectId(
        resolvedBatchId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid student, course and batch IDs are required.",
      });
    }

    const student =
      await Student.findById(
        resolvedStudentId
      );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const course =
      await Course.findById(
        resolvedCourseId
      );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found.",
      });
    }

    const batch =
      await Batch.findById(
        resolvedBatchId
      );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found.",
      });
    }

    if (
      String(batch.course_id) !==
      String(course._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected batch does not belong to the selected course.",
      });
    }

    const resolvedCourseFee =
      course_fee !== undefined
        ? Number(course_fee)
        : admission.course_fee;

    const resolvedDiscountType =
      discount_type ||
      admission.discount_type;

    const resolvedDiscountValue =
      discount_value !== undefined
        ? Number(discount_value)
        : admission.discount_value;

    const resolvedGstTaken =
      is_gst_taken !== undefined
        ? is_gst_taken === true ||
          is_gst_taken === "true"
        : admission.is_gst_taken;

    const resolvedGstAmount =
      gst_amount !== undefined
        ? Number(gst_amount)
        : admission.gst_amount;

    const resolvedAdmissionFee =
      admission_fee !== undefined
        ? Number(admission_fee)
        : admission.admission_fee;

    const calculations =
      calculateAdmissionAmounts({
        courseFee: resolvedCourseFee,
        discountType:
          resolvedDiscountType,
        discountValue:
          resolvedDiscountValue,
        isGstTaken:
          resolvedGstTaken,
        gstAmount:
          resolvedGstAmount,
        admissionFee:
          resolvedAdmissionFee,
      });

    const resolvedPaidAmount =
      paid_amount !== undefined
        ? Math.max(
            Number(paid_amount) || 0,
            0
          )
        : admission.paid_amount;

    if (
      resolvedPaidAmount >
      calculations.finalAmount
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be greater than final amount.",
      });
    }

    admission.student_id =
      resolvedStudentId;

    admission.course_id =
      resolvedCourseId;

    admission.batch_id =
      resolvedBatchId;

    admission.course_type =
      course_type !== undefined
        ? course_type.trim()
        : admission.course_type;

    admission.course_fee =
      calculations.courseFee;

    admission.discount_type =
      calculations.discountType;

    admission.discount_value =
      calculations.discountValue;

    admission.is_gst_taken =
      resolvedGstTaken;

    admission.gst_amount =
      calculations.gstAmount;

    admission.final_amount =
      calculations.finalAmount;

    admission.admission_fee =
      calculations.admissionFee;

    admission.paid_amount =
      resolvedPaidAmount;

    if (admission_date !== undefined) {
      admission.admission_date =
        admission_date;
    }

    if (
      referral_source !== undefined
    ) {
      admission.referral_source =
        referral_source.trim();
    }

    if (status !== undefined) {
      admission.status = status;
    }

    if (remark !== undefined) {
      admission.remark =
        remark.trim();
    }

    await admission.save();

    const populatedAdmission =
      await getPopulatedAdmission(id);

    return res.status(200).json({
      success: true,
      message:
        "Admission updated successfully.",
      data: populatedAdmission,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/admissions/:id
|--------------------------------------------------------------------------
*/

export const deleteAdmission = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission ID.",
      });
    }

    const admission =
      await StudentAdmission.findById(id);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found.",
      });
    }

    await admission.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Admission deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};