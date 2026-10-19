import mongoose from "mongoose";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";
import Category from "../models/Category.js";


const sendError = (res, status, message, errorCode) =>
  res.status(status).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });


const validateActiveCourseCategory = async (value) => {
  const categoryName =
    typeof value === "string" ? value.trim() : "";

  // Preserve the existing behavior if category is optional.
  if (!categoryName) {
    return { categoryName: "" };
  }

  const category = await Category.findOne({
    categoryName: {
      $regex: `^${categoryName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}$`,
      $options: "i",
    },
  }).select("categoryName status");

  if (!category) {
    return {
      error: "The selected course category does not exist.",
    };
  }

  if (category.status !== "Active") {
    return {
      error:
        "This category is inactive. Select an active category.",
    };
  }

  return { categoryName: category.categoryName };
};


const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return value === true || value === "true";
};

const normalizeCourseType = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "online") return "Online";
  if (normalized === "offline") return "Offline";

  return null;
};

const parseSubjectIds = (value) => {
  if (value === undefined || value === null || value === "") {
    return { ids: [] };
  }

  let ids = value;

  // FormData sends arrays as strings, so parse JSON arrays.
  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      return {
        error: "Subjects must be a valid JSON array of subject IDs.",
      };
    }
  }

  if (!Array.isArray(ids)) {
    return { error: "Subjects must be an array." };
  }

  const normalizedIds = [
    ...new Set(ids.map((id) => String(id))),
  ];

  if (
    !normalizedIds.every((id) =>
      mongoose.isValidObjectId(id)
    )
  ) {
    return {
      error: "One or more subject IDs are invalid.",
    };
  }

  return { ids: normalizedIds };
};

const validateSubjectIds = async (ids) => {
  if (!ids.length) return null;

  const count = await Subject.countDocuments({
    _id: { $in: ids },
    status: "Active",
  });

  if (count !== ids.length) {
    return "One or more selected subjects do not exist or are inactive.";
  }

  return null;
};

const populateCourseSubjects = (query) =>
  query.populate(
    "subjects",
    "subjectName subjectCode status syllabus"
  );

// =====================================================
// GET COURSES
// GET /api/courses
// Supports search, filters, sorting and pagination.
// =====================================================
export const getCourses = async (req, res, next) => {
  try {
    const {
      search = "",
      status = "",
      courseType = "",
      courseCategory = "",
      page = 1,
      limit = 10,
      sortBy = "displayOrder",
      sortOrder = "asc",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const perPage = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {};

    if (status) {
      filter.status = status;
    }

    // Course Type filter accepts only Online or Offline.
    if (String(courseType).trim()) {
      const normalizedType = normalizeCourseType(
        String(courseType)
      );

      if (!normalizedType) {
        return sendError(
          res,
          400,
          "Course type filter must be Online or Offline."
        );
      }

      filter.courseType = normalizedType;
    }

    if (String(courseCategory).trim()) {
      filter.courseCategory = {
        $regex: String(courseCategory).trim(),
        $options: "i",
      };
    }

    const safeSearch = String(search)
      .trim()
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (safeSearch) {
      filter.$or = [
        {
          courseTitle: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          courseType: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          courseCategory: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    const allowedSortFields = [
      "courseTitle",
      "courseType",
      "courseCategory",
      "mrp",
      "price",
      "displayOrder",
      "duration",
      "createdAt",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "displayOrder";

    const sort = {
      [safeSortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const skip = (currentPage - 1) * perPage;

    const [courses, total] = await Promise.all([
      populateCourseSubjects(
        Course.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(perPage)
      ).lean(),
      Course.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET COURSE BY ID
// GET /api/courses/:id
// =====================================================
export const getCourse = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(
        res,
        400,
        "Invalid course ID.",
        "INVALID_COURSE_ID"
      );
    }

    const course = await populateCourseSubjects(
      Course.findById(req.params.id)
    );

    if (!course) {
      return sendError(
        res,
        404,
        "Course not found.",
        "COURSE_NOT_FOUND"
      );
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// CREATE COURSE
// POST /api/courses
// =====================================================
export const createCourse = async (req, res, next) => {
  try {
    const {
      courseTitle,
      courseType,
      courseCategory,
      mrp,
      price,
      displayOrder,
      duration,
      durationUnit,
      previewVideo,
      totalLectures,
      practicalMarks,
      objectiveMarks,
      description,
      syllabus,
      eligibility,
      certificateSubject,
      popular,
      recommended,
      mrpVisible,
      hideExamResult,
      status,
      subjects,
    } = req.body;

    if (
      typeof courseTitle !== "string" ||
      !courseTitle.trim()
    ) {
      return sendError(
        res,
        400,
        "Course title is required."
      );
    }

    const normalizedCourseType =
      normalizeCourseType(courseType);

    if (!normalizedCourseType) {
      return sendError(
        res,
        400,
        "Course type must be Online or Offline."
      );
    }

    
    const validatedCategory = await validateActiveCourseCategory(
      courseCategory
    );

    if (validatedCategory.error) {
      return sendError(res, 400, validatedCategory.error);
    }


    const numericMrp = Number(mrp);
    const numericPrice = Number(price);

    if (!Number.isFinite(numericMrp) || numericMrp < 0) {
      return sendError(
        res,
        400,
        "Valid MRP is required."
      );
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return sendError(
        res,
        400,
        "Valid price is required."
      );
    }

    if (numericPrice > numericMrp) {
      return sendError(
        res,
        400,
        "Price cannot be greater than MRP."
      );
    }

    const parsedSubjects = parseSubjectIds(subjects);

    if (parsedSubjects.error) {
      return sendError(
        res,
        400,
        parsedSubjects.error,
        "INVALID_SUBJECTS"
      );
    }

    const subjectError = await validateSubjectIds(
      parsedSubjects.ids
    );

    if (subjectError) {
      return sendError(
        res,
        400,
        subjectError,
        "INVALID_SUBJECTS"
      );
    }

    const course = await Course.create({
      courseTitle: courseTitle.trim(),
      courseType: normalizedCourseType,
      courseCategory: validatedCategory.categoryName,
      mrp: numericMrp,
      price: numericPrice,
      displayOrder: Number(displayOrder) || 0,
      duration: Number(duration) || 0,
      durationUnit: durationUnit || "Months",

      courseImage: req.file
        ? `/uploads/courses/${req.file.filename}`
        : "",

      previewVideo: previewVideo || "",
      totalLectures: Number(totalLectures) || 0,
      practicalMarks: Number(practicalMarks) || 0,
      objectiveMarks: Number(objectiveMarks) || 0,
      description: description || "",
      syllabus: syllabus || "",
      eligibility: eligibility || "",
      certificateSubject: certificateSubject || "",

      popular: parseBoolean(popular),
      recommended: parseBoolean(recommended),
      mrpVisible: parseBoolean(mrpVisible, true),
      hideExamResult: parseBoolean(hideExamResult),
      status: status || "Draft",

      // References existing subjects without duplicating them.
      subjects: parsedSubjects.ids,
    });

    const populatedCourse = await populateCourseSubjects(
      Course.findById(course._id)
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: populatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// UPDATE COURSE
// PUT /api/courses/:id
// Omitted subjects = keep existing assignments.
// subjects: [] = remove all subject assignments.
// =====================================================
export const updateCourse = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(
        res,
        400,
        "Invalid course ID.",
        "INVALID_COURSE_ID"
      );
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return sendError(
        res,
        404,
        "Course not found.",
        "COURSE_NOT_FOUND"
      );
    }

    const body = req.body;

    if (body.courseTitle !== undefined) {
      if (
        typeof body.courseTitle !== "string" ||
        !body.courseTitle.trim()
      ) {
        return sendError(
          res,
          400,
          "Course title is required."
        );
      }

      course.courseTitle = body.courseTitle.trim();
    }

    if (body.courseType !== undefined) {
      const normalizedCourseType =
        normalizeCourseType(body.courseType);

      if (!normalizedCourseType) {
        return sendError(
          res,
          400,
          "Course type must be Online or Offline."
        );
      }

      course.courseType = normalizedCourseType;
    }

    const numericMrp =
      body.mrp !== undefined
        ? Number(body.mrp)
        : course.mrp;

    const numericPrice =
      body.price !== undefined
        ? Number(body.price)
        : course.price;

    if (!Number.isFinite(numericMrp) || numericMrp < 0) {
      return sendError(
        res,
        400,
        "Valid MRP is required."
      );
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return sendError(
        res,
        400,
        "Valid price is required."
      );
    }

    if (numericPrice > numericMrp) {
      return sendError(
        res,
        400,
        "Price cannot be greater than MRP."
      );
    }

    // Update subject assignments only when supplied.
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "subjects"
      )
    ) {
      const parsedSubjects = parseSubjectIds(
        body.subjects
      );

      if (parsedSubjects.error) {
        return sendError(
          res,
          400,
          parsedSubjects.error,
          "INVALID_SUBJECTS"
        );
      }

      const subjectError = await validateSubjectIds(
        parsedSubjects.ids
      );

      if (subjectError) {
        return sendError(
          res,
          400,
          subjectError,
          "INVALID_SUBJECTS"
        );
      }

      course.subjects = parsedSubjects.ids;
    }

    // certificateDiploma is intentionally not accepted or updated.
    
    if (body.courseCategory !== undefined) {
      const validatedCategory = await validateActiveCourseCategory(
        body.courseCategory
      );

      if (validatedCategory.error) {
        return sendError(res, 400, validatedCategory.error);
      }

      course.courseCategory = validatedCategory.categoryName;
    }


    course.mrp = numericMrp;
    course.price = numericPrice;

    if (body.displayOrder !== undefined) {
      course.displayOrder =
        Number(body.displayOrder) || 0;
    }

    if (body.duration !== undefined) {
      course.duration = Number(body.duration) || 0;
    }

    if (
      body.durationUnit !== undefined &&
      body.durationUnit
    ) {
      course.durationUnit = body.durationUnit;
    }

    course.previewVideo =
      body.previewVideo ?? course.previewVideo;

    if (body.totalLectures !== undefined) {
      course.totalLectures =
        Number(body.totalLectures) || 0;
    }

    if (body.practicalMarks !== undefined) {
      course.practicalMarks =
        Number(body.practicalMarks) || 0;
    }

    if (body.objectiveMarks !== undefined) {
      course.objectiveMarks =
        Number(body.objectiveMarks) || 0;
    }

    course.description =
      body.description ?? course.description;

    course.syllabus =
      body.syllabus ?? course.syllabus;

    course.eligibility =
      body.eligibility ?? course.eligibility;

    course.certificateSubject =
      body.certificateSubject ?? course.certificateSubject;

    if (body.popular !== undefined) {
      course.popular = parseBoolean(body.popular);
    }

    if (body.recommended !== undefined) {
      course.recommended = parseBoolean(body.recommended);
    }

    if (body.mrpVisible !== undefined) {
      course.mrpVisible = parseBoolean(body.mrpVisible);
    }

    if (body.hideExamResult !== undefined) {
      course.hideExamResult = parseBoolean(
        body.hideExamResult
      );
    }

    if (body.status !== undefined) {
      const validStatuses = [
        "Published",
        "Draft",
        "Archived",
      ];

      if (!validStatuses.includes(body.status)) {
        return sendError(
          res,
          400,
          "Invalid course status."
        );
      }

      course.status = body.status;
    }

    if (req.file) {
      course.courseImage =
        `/uploads/courses/${req.file.filename}`;
    }

    await course.save();

    const populatedCourse = await populateCourseSubjects(
      Course.findById(course._id)
    );

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: populatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// DELETE COURSE
// DELETE /api/courses/:id
// =====================================================
export const deleteCourse = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(
        res,
        400,
        "Invalid course ID.",
        "INVALID_COURSE_ID"
      );
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return sendError(
        res,
        404,
        "Course not found.",
        "COURSE_NOT_FOUND"
      );
    }

    await course.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// UPDATE COURSE STATUS
// PATCH /api/courses/:id/status
// =====================================================
export const updateCourseStatus = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return sendError(
        res,
        400,
        "Invalid course ID.",
        "INVALID_COURSE_ID"
      );
    }

    const { status } = req.body;

    const validStatuses = [
      "Published",
      "Draft",
      "Archived",
    ];

    if (!validStatuses.includes(status)) {
      return sendError(
        res,
        400,
        "Invalid course status."
      );
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!course) {
      return sendError(
        res,
        404,
        "Course not found.",
        "COURSE_NOT_FOUND"
      );
    }

    const populatedCourse = await populateCourseSubjects(
      Course.findById(course._id)
    );

    return res.status(200).json({
      success: true,
      message: "Course status updated successfully.",
      data: populatedCourse,
    });
  } catch (error) {
    next(error);
  }
};
