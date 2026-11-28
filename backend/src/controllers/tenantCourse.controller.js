import mongoose from "mongoose";

const sendError = (res, status, message, errorCode) =>
  res.status(status).json({
    success: false,
    message,
    ...(errorCode ? { errorCode } : {}),
  });

const getModel = (req, name) => {
  if (typeof req.getTenantModel !== "function") {
    throw new Error("TENANT_MODEL_ACCESSOR_UNAVAILABLE");
  }
  return req.getTenantModel(name);
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeCourseType = (value) => {
  if (typeof value !== "string") return null;
  const type = value.trim().toLowerCase();
  if (type === "online") return "Online";
  if (type === "offline") return "Offline";
  return null;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value === true || value === "true";
};

const parseSubjectIds = (value) => {
  if (value === undefined || value === null || value === "") {
    return { ids: [] };
  }

  let ids = value;

  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      return { error: "Subjects must be a valid JSON array of subject IDs." };
    }
  }

  if (!Array.isArray(ids)) {
    return { error: "Subjects must be an array." };
  }

  ids = [...new Set(ids.map(String))];

  if (!ids.every((id) => mongoose.isValidObjectId(id))) {
    return { error: "One or more subject IDs are invalid." };
  }

  return { ids };
};

const validateCategory = async (Category, value) => {
  const name = typeof value === "string" ? value.trim() : "";

  if (!name) {
    return { error: "Course category is required. Select an active category." };
  }

  const category = await Category.findOne({
    categoryName: {
      $regex: `^${escapeRegex(name)}$`,
      $options: "i",
    },
  }).select("categoryName status");

  if (!category) {
    return { error: "The selected course category does not exist." };
  }

  if (category.status !== "Active") {
    return { error: "This category is inactive. Select an active category." };
  }

  return { categoryName: category.categoryName };
};

const validateSubjects = async (Subject, ids) => {
  if (!ids.length) return null;

  const count = await Subject.countDocuments({
    _id: { $in: ids },
    status: "Active",
  });

  return count === ids.length
    ? null
    : "One or more selected subjects do not exist or are inactive.";
};

const populateSubjects = (query) =>
  query.populate("subjects", "subjectName subjectCode status");

const validateCourseId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    sendError(res, 400, "Invalid course ID.", "INVALID_COURSE_ID");
    return false;
  }
  return true;
};

export const getTenantCourses = async (req, res, next) => {
  try {
    const Course = getModel(req, "Course");
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
    const perPage = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const filter = {};

    if (status) {
      if (!["Published", "Draft", "Archived"].includes(status)) {
        return sendError(res, 400, "Invalid course status.");
      }
      filter.status = status;
    }

    if (String(courseType).trim()) {
      const type = normalizeCourseType(courseType);
      if (!type) {
        return sendError(res, 400, "Course type filter must be Online or Offline.");
      }
      filter.courseType = type;
    }

    if (String(courseCategory).trim()) {
      filter.courseCategory = {
        $regex: escapeRegex(String(courseCategory).trim().slice(0, 100)),
        $options: "i",
      };
    }

    const safeSearch = String(search).trim().slice(0, 100);
    if (safeSearch) {
      const regex = { $regex: escapeRegex(safeSearch), $options: "i" };
      filter.$or = [
        { courseTitle: regex },
        { courseType: regex },
        { courseCategory: regex },
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

    const sort = { [safeSortBy]: sortOrder === "desc" ? -1 : 1 };
    const skip = (currentPage - 1) * perPage;

    const [courses, total] = await Promise.all([
      populateSubjects(
        Course.find(filter).sort(sort).skip(skip).limit(perPage)
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

export const getTenantCourse = async (req, res, next) => {
  try {
    if (!validateCourseId(req, res)) return;

    const Course = getModel(req, "Course");
    const course = await populateSubjects(
      Course.findById(req.params.id)
    );

    if (!course) {
      return sendError(res, 404, "Course not found.", "COURSE_NOT_FOUND");
    }

    return res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

export const createTenantCourse = async (req, res, next) => {
  try {
    const Course = getModel(req, "Course");
    const Category = getModel(req, "Category");
    const Subject = getModel(req, "Subject");

    const body = req.body || {};
    const {
      courseTitle,
      courseType,
      courseCategory,
      mrp,
      price,
      subjects,
    } = body;

    if (typeof courseTitle !== "string" || !courseTitle.trim()) {
      return sendError(res, 400, "Course title is required.");
    }

    const normalizedType = normalizeCourseType(courseType);
    if (!normalizedType) {
      return sendError(res, 400, "Course type must be Online or Offline.");
    }

    const category = await validateCategory(Category, courseCategory);
    if (category.error) return sendError(res, 400, category.error);

    const numericMrp = Number(mrp);
    const numericPrice = Number(price);

    if (!Number.isFinite(numericMrp) || numericMrp < 0) {
      return sendError(res, 400, "Valid MRP is required.");
    }
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return sendError(res, 400, "Valid price is required.");
    }
    if (numericPrice > numericMrp) {
      return sendError(res, 400, "Price cannot be greater than MRP.");
    }

    const parsedSubjects = parseSubjectIds(subjects);
    if (parsedSubjects.error) {
      return sendError(res, 400, parsedSubjects.error, "INVALID_SUBJECTS");
    }

    const subjectError = await validateSubjects(Subject, parsedSubjects.ids);
    if (subjectError) {
      return sendError(res, 400, subjectError, "INVALID_SUBJECTS");
    }

    const course = await Course.create({
      courseTitle: courseTitle.trim(),
      courseType: normalizedType,
      courseCategory: category.categoryName,
      mrp: numericMrp,
      price: numericPrice,
      displayOrder: Number(body.displayOrder) || 0,
      duration: Number(body.duration) || 0,
      durationUnit: body.durationUnit || "Months",
      // Tenant course images are intentionally handled in Batch 2D.
      courseImage: "",
      previewVideo: body.previewVideo || "",
      totalLectures: Number(body.totalLectures) || 0,
      practicalMarks: Number(body.practicalMarks) || 0,
      objectiveMarks: Number(body.objectiveMarks) || 0,
      description: body.description || "",
      syllabus: body.syllabus || "",
      eligibility: body.eligibility || "",
      certificateSubject: body.certificateSubject || "",
      popular: parseBoolean(body.popular),
      recommended: parseBoolean(body.recommended),
      mrpVisible: parseBoolean(body.mrpVisible, true),
      hideExamResult: parseBoolean(body.hideExamResult),
      status: body.status || "Draft",
      subjects: parsedSubjects.ids,
    });

    const populated = await populateSubjects(
      Course.findById(course._id)
    );

    return res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantCourse = async (req, res, next) => {
  try {
    if (!validateCourseId(req, res)) return;

    const Course = getModel(req, "Course");
    const Category = getModel(req, "Category");
    const Subject = getModel(req, "Subject");

    const course = await Course.findById(req.params.id);
    if (!course) {
      return sendError(res, 404, "Course not found.", "COURSE_NOT_FOUND");
    }

    const body = req.body || {};

    if (body.courseTitle !== undefined) {
      if (typeof body.courseTitle !== "string" || !body.courseTitle.trim()) {
        return sendError(res, 400, "Course title is required.");
      }
      course.courseTitle = body.courseTitle.trim();
    }

    if (body.courseType !== undefined) {
      const type = normalizeCourseType(body.courseType);
      if (!type) {
        return sendError(res, 400, "Course type must be Online or Offline.");
      }
      course.courseType = type;
    }

    if (body.courseCategory !== undefined) {
      const category = await validateCategory(Category, body.courseCategory);
      if (category.error) return sendError(res, 400, category.error);
      course.courseCategory = category.categoryName;
    }

    const nextMrp = body.mrp !== undefined ? Number(body.mrp) : course.mrp;
    const nextPrice = body.price !== undefined ? Number(body.price) : course.price;

    if (!Number.isFinite(nextMrp) || nextMrp < 0) {
      return sendError(res, 400, "Valid MRP is required.");
    }
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      return sendError(res, 400, "Valid price is required.");
    }
    if (nextPrice > nextMrp) {
      return sendError(res, 400, "Price cannot be greater than MRP.");
    }

    course.mrp = nextMrp;
    course.price = nextPrice;

    if (Object.prototype.hasOwnProperty.call(body, "subjects")) {
      const parsed = parseSubjectIds(body.subjects);
      if (parsed.error) {
        return sendError(res, 400, parsed.error, "INVALID_SUBJECTS");
      }
      const subjectError = await validateSubjects(Subject, parsed.ids);
      if (subjectError) {
        return sendError(res, 400, subjectError, "INVALID_SUBJECTS");
      }
      course.subjects = parsed.ids;
    }

    const numericFields = [
      "displayOrder",
      "duration",
      "totalLectures",
      "practicalMarks",
      "objectiveMarks",
    ];

    for (const field of numericFields) {
      if (body[field] !== undefined) {
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) {
          return sendError(res, 400, `${field} must be a valid non-negative number.`);
        }
        course[field] = value;
      }
    }

    const textFields = [
      "durationUnit",
      "previewVideo",
      "description",
      "syllabus",
      "eligibility",
      "certificateSubject",
    ];

    for (const field of textFields) {
      if (body[field] !== undefined) course[field] = body[field];
    }

    const booleanFields = [
      "popular",
      "recommended",
      "mrpVisible",
      "hideExamResult",
    ];

    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        course[field] = parseBoolean(body[field]);
      }
    }

    if (body.status !== undefined) {
      if (!["Published", "Draft", "Archived"].includes(body.status)) {
        return sendError(res, 400, "Invalid course status.");
      }
      course.status = body.status;
    }

    // Do not accept a browser-provided courseImage URL.
    await course.save();

    const populated = await populateSubjects(
      Course.findById(course._id)
    );

    return res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: populated,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTenantCourseStatus = async (req, res, next) => {
  try {
    if (!validateCourseId(req, res)) return;

    const { status } = req.body || {};
    if (!["Published", "Draft", "Archived"].includes(status)) {
      return sendError(res, 400, "Invalid course status.");
    }

    const Course = getModel(req, "Course");
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!course) {
      return sendError(res, 404, "Course not found.", "COURSE_NOT_FOUND");
    }

    return res.status(200).json({
      success: true,
      message: "Course status updated successfully.",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTenantCourse = async (req, res, next) => {
  try {
    if (!validateCourseId(req, res)) return;

    const Course = getModel(req, "Course");
    const course = await Course.findById(req.params.id);

    if (!course) {
      return sendError(res, 404, "Course not found.", "COURSE_NOT_FOUND");
    }

    // Preserve all eight legacy dependency protections, but query
    // only this institute's tenant collections.
    const dependencyModels = [
      ["StudentAdmission", "student admission(s)"],
      ["Batch", "batch(es)"],
      ["Attendance", "attendance record(s)"],
      ["Exam", "exam(s)"],
      ["Certificate", "certificate(s)"],
      ["PracticeTest", "practice test(s)"],
      ["Assignment", "assignment(s)"],
      ["HallTicket", "hall ticket(s)"],
    ];

    const counts = await Promise.all(
      dependencyModels.map(async ([modelName]) => {
        const Model = getModel(req, modelName);
        return Model.countDocuments({ course_id: course._id });
      })
    );

    const dependencies = counts.reduce((items, count, index) => {
      if (count > 0) {
        items.push(`${count} ${dependencyModels[index][1]}`);
      }
      return items;
    }, []);

    if (dependencies.length) {
      return res.status(409).json({
        success: false,
        errorCode: "COURSE_IN_USE",
        message:
          "This course cannot be deleted because it is already in use. Please review its related records before attempting deletion.",
        dependencies,
      });
    }

    await course.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
      data: { id: course._id },
    });
  } catch (error) {
    next(error);
  }
};