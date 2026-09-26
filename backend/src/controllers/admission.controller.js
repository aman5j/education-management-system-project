import Admission from "../models/Admission.js";
import Student from "../models/Student.js";
import { calculateAdmissionAmount } from "../utils/admissionCalculation.js";

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

// ==========================================
// GET ADMISSIONS
// ==========================================

export const getAdmissions = async (
  req,
  res,
  next
) => {
  try {
    const {
      search = "",
      batch = "",
      course = "",
      status = "",
      remark = "",
      admittedFrom = "",
      admittedTo = "",
      page = 1,
      limit = 10,
      sortBy = "admissionDate",
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

    if (batch.trim()) {
      filter.batch = new RegExp(
        escapeRegex(batch.trim()),
        "i"
      );
    }

    if (course.trim()) {
      filter.course = new RegExp(
        escapeRegex(course.trim()),
        "i"
      );
    }

    if (status.trim()) {
      filter.status = status.trim();
    }

    if (remark.trim()) {
      filter.remark = new RegExp(
        escapeRegex(remark.trim()),
        "i"
      );
    }

    if (admittedFrom || admittedTo) {
      filter.admissionDate = {};

      if (admittedFrom) {
        const fromDate = normalizeDate(
          admittedFrom
        );

        if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);

          filter.admissionDate.$gte =
            fromDate;
        }
      }

      if (admittedTo) {
        const toDate = normalizeDate(
          admittedTo
        );

        if (toDate) {
          toDate.setHours(
            23,
            59,
            59,
            999
          );

          filter.admissionDate.$lte =
            toDate;
        }
      }
    }

    if (search.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      const students = await Student.find({
        $or: [
          {
            firstName: searchRegex,
          },
          {
            surname: searchRegex,
          },
          {
            rollNo: searchRegex,
          },
          {
            mobile: searchRegex,
          },
          {
            email: searchRegex,
          },
        ],
      })
        .select("_id")
        .lean();

      const studentIds = students.map(
        (student) => student._id
      );

      filter.$or = [
        {
          rollNo: searchRegex,
        },
        {
          course: searchRegex,
        },
        {
          batch: searchRegex,
        },
        {
          referralBy: searchRegex,
        },
        {
          student: {
            $in: studentIds,
          },
        },
      ];
    }

    const allowedSortFields = [
      "createdAt",
      "admissionDate",
      "rollNo",
      "course",
      "batch",
      "finalAmount",
      "status",
    ];

    const safeSortBy =
      allowedSortFields.includes(sortBy)
        ? sortBy
        : "admissionDate";

    const safeSortOrder =
      sortOrder === "asc" ? 1 : -1;

    const [
      admissions,
      total,
    ] = await Promise.all([
      Admission.find(filter)
        .populate(
          "student",
          "rollNo firstName surname fatherName mobile email profileImage"
        )
        .sort({
          [safeSortBy]: safeSortOrder,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Admission.countDocuments(filter),
    ]);

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

// ==========================================
// GET SINGLE ADMISSION
// ==========================================

export const getAdmission = async (
  req,
  res,
  next
) => {
  try {
    const admission =
      await Admission.findById(
        req.params.id
      )
        .populate(
          "student",
          "rollNo firstName surname fatherName motherName mobile email address profileImage"
        )
        .lean();

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

// ==========================================
// CREATE ADMISSION
// ==========================================

export const createAdmission = async (
  req,
  res,
  next
) => {
  try {
    const {
      student,
      courseType,
      course,
      courseFee,
      discountType,
      discountValue,
      gstRate,
      admissionFee,
      admissionDate,
      batch,
      availableSeats,
      referralBy,
      status,
      remark,
    } = req.body;

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Student is required.",
      });
    }

    const studentRecord =
      await Student.findById(student);

    if (!studentRecord) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    if (!course?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course is required.",
      });
    }

    const parsedCourseFee =
      Number(courseFee) || 0;

    if (parsedCourseFee < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Course fee cannot be negative.",
      });
    }

    const calculations =
      calculateAdmissionAmount({
        courseFee: parsedCourseFee,
        discountType,
        discountValue,
        gstRate,
        admissionFee,
      });

    const parsedAdmissionDate =
      admissionDate
        ? normalizeDate(admissionDate)
        : new Date();

    if (!parsedAdmissionDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid admission date.",
      });
    }

    const admission =
      await Admission.create({
        student: studentRecord._id,

        // Use the student's manually assigned
        // immutable roll number.
        rollNo: studentRecord.rollNo,

        courseType:
          courseType?.trim() || "",

        course: course.trim(),

        courseFee:
          calculations.courseFee,

        discountType:
          discountType === "percentage"
            ? "percentage"
            : "amount",

        discountValue:
          Number(discountValue) || 0,

        discountAmount:
          calculations.discountAmount,

        gstRate:
          Number(gstRate) || 0,

        gstAmount:
          calculations.gstAmount,

        admissionFee:
          calculations.admissionFee,

        finalAmount:
          calculations.finalAmount,

        admissionDate:
          parsedAdmissionDate,

        batch:
          batch?.trim() || "",

        availableSeats:
          Math.max(
            Number(availableSeats) || 0,
            0
          ),

        referralBy:
          referralBy?.trim() || "",

        status:
          status || "active",

        remark:
          remark?.trim() || "",
      });

    const populatedAdmission =
      await Admission.findById(
        admission._id
      ).populate(
        "student",
        "rollNo firstName surname fatherName mobile email profileImage"
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

// ==========================================
// UPDATE ADMISSION
// ==========================================

export const updateAdmission = async (
  req,
  res,
  next
) => {
  try {
    const admission =
      await Admission.findById(
        req.params.id
      );

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission not found.",
      });
    }

    const {
      student,
      courseType,
      course,
      courseFee,
      discountType,
      discountValue,
      gstRate,
      admissionFee,
      admissionDate,
      batch,
      availableSeats,
      referralBy,
      status,
      remark,
    } = req.body;

    if (student !== undefined) {
      const studentRecord =
        await Student.findById(student);

      if (!studentRecord) {
        return res.status(404).json({
          success: false,
          message: "Student not found.",
        });
      }

      admission.student =
        studentRecord._id;

      // Always keep admission Roll No
      // synchronized with the student's
      // immutable Roll No.
      admission.rollNo =
        studentRecord.rollNo;
    }

    const effectiveCourseFee =
      courseFee !== undefined
        ? Number(courseFee) || 0
        : admission.courseFee;

    const effectiveDiscountType =
      discountType !== undefined
        ? discountType
        : admission.discountType;

    const effectiveDiscountValue =
      discountValue !== undefined
        ? Number(discountValue) || 0
        : admission.discountValue;

    const effectiveGstRate =
      gstRate !== undefined
        ? Number(gstRate) || 0
        : admission.gstRate;

    const effectiveAdmissionFee =
      admissionFee !== undefined
        ? Number(admissionFee) || 0
        : admission.admissionFee;

    const calculations =
      calculateAdmissionAmount({
        courseFee:
          effectiveCourseFee,

        discountType:
          effectiveDiscountType,

        discountValue:
          effectiveDiscountValue,

        gstRate:
          effectiveGstRate,

        admissionFee:
          effectiveAdmissionFee,
      });

    if (courseType !== undefined) {
      admission.courseType =
        courseType.trim();
    }

    if (course !== undefined) {
      if (!course.trim()) {
        return res.status(400).json({
          success: false,
          message: "Course is required.",
        });
      }

      admission.course =
        course.trim();
    }

    admission.courseFee =
      calculations.courseFee;

    admission.discountType =
      effectiveDiscountType ===
      "percentage"
        ? "percentage"
        : "amount";

    admission.discountValue =
      effectiveDiscountValue;

    admission.discountAmount =
      calculations.discountAmount;

    admission.gstRate =
      effectiveGstRate;

    admission.gstAmount =
      calculations.gstAmount;

    admission.admissionFee =
      calculations.admissionFee;

    admission.finalAmount =
      calculations.finalAmount;

    if (admissionDate !== undefined) {
      const parsedDate =
        normalizeDate(admissionDate);

      if (!parsedDate) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission date.",
        });
      }

      admission.admissionDate =
        parsedDate;
    }

    if (batch !== undefined) {
      admission.batch =
        batch.trim();
    }

    if (
      availableSeats !== undefined
    ) {
      admission.availableSeats =
        Math.max(
          Number(availableSeats) || 0,
          0
        );
    }

    if (referralBy !== undefined) {
      admission.referralBy =
        referralBy.trim();
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
      await Admission.findById(
        admission._id
      ).populate(
        "student",
        "rollNo firstName surname fatherName mobile email profileImage"
      );

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

// ==========================================
// DELETE ADMISSION
// ==========================================

export const deleteAdmission = async (
  req,
  res,
  next
) => {
  try {
    const admission =
      await Admission.findById(
        req.params.id
      );

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

// ==========================================
// STATUS
// ==========================================

export const updateAdmissionStatus =
  async (req, res, next) => {
    try {
      const {
        status,
      } = req.body;

      const allowedStatuses = [
        "active",
        "inactive",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid admission status.",
        });
      }

      const admission =
        await Admission.findByIdAndUpdate(
          req.params.id,
          { status },
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          "student",
          "rollNo firstName surname mobile email"
        );

      if (!admission) {
        return res.status(404).json({
          success: false,
          message:
            "Admission not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Admission status updated successfully.",
        data: admission,
      });
    } catch (error) {
      next(error);
    }
  };

// ==========================================
// ADD REMARK
// ==========================================

export const addAdmissionRemark =
  async (req, res, next) => {
    try {
      const { remark } = req.body;

      if (!remark?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Remark is required.",
        });
      }

      const admission =
        await Admission.findByIdAndUpdate(
          req.params.id,
          {
            remark: remark.trim(),
          },
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          "student",
          "rollNo firstName surname mobile email"
        );

      if (!admission) {
        return res.status(404).json({
          success: false,
          message:
            "Admission not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Admission remark added successfully.",
        data: admission,
      });
    } catch (error) {
      next(error);
    }
  };