import Course from "../models/Course.js";

export const getCourses = async (
  req,
  res,
  next
) => {
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

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(Number(limit) || 10, 1),
      100
    );

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (courseType) {
      filter.courseType = {
        $regex: courseType.trim(),
        $options: "i",
      };
    }

    if (courseCategory) {
      filter.courseCategory = {
        $regex: courseCategory.trim(),
        $options: "i",
      };
    }

    if (search.trim()) {
      filter.$or = [
        {
          courseTitle: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          courseType: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          courseCategory: {
            $regex: search.trim(),
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

    const safeSortBy = allowedSortFields.includes(
      sortBy
    )
      ? sortBy
      : "displayOrder";

    const sort = {
      [safeSortBy]:
        sortOrder === "desc" ? -1 : 1,
    };

    const skip =
      (currentPage - 1) * perPage;

    const [courses, total] =
      await Promise.all([
        Course.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(perPage)
          .lean(),

        Course.countDocuments(filter),
      ]);

    res.status(200).json({
      success: true,
      data: courses,
      pagination: {
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(
          total / perPage
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCourse = async (
  req,
  res,
  next
) => {
  try {
    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (
  req,
  res,
  next
) => {
  try {
    const {
      courseTitle,
      courseType,
      certificateDiploma,
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
    } = req.body;

    if (!courseTitle?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course title is required",
      });
    }

    if (!courseType?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course type is required",
      });
    }

    const numericMrp = Number(mrp);
    const numericPrice = Number(price);

    if (
      Number.isNaN(numericMrp) ||
      numericMrp < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid MRP is required",
      });
    }

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    if (numericPrice > numericMrp) {
      return res.status(400).json({
        success: false,
        message: "Price cannot be greater than MRP",
      });
    }

    const course = await Course.create({
      courseTitle: courseTitle.trim(),
      courseType: courseType.trim(),
      certificateDiploma:
        certificateDiploma || "",
      courseCategory:
        courseCategory || "",
      mrp: numericMrp,
      price: numericPrice,
      displayOrder:
        Number(displayOrder) || 0,
      duration:
        Number(duration) || 0,
      durationUnit:
        durationUnit || "Months",

      courseImage: req.file
        ? `/uploads/courses/${req.file.filename}`
        : "",

      previewVideo:
        previewVideo || "",

      totalLectures:
        Number(totalLectures) || 0,

      practicalMarks:
        Number(practicalMarks) || 0,

      objectiveMarks:
        Number(objectiveMarks) || 0,

      description:
        description || "",

      syllabus:
        syllabus || "",

      eligibility:
        eligibility || "",

      certificateSubject:
        certificateSubject || "",

      popular:
        popular === true ||
        popular === "true",

      recommended:
        recommended === true ||
        recommended === "true",

      mrpVisible:
        mrpVisible === undefined
          ? true
          : mrpVisible === true ||
            mrpVisible === "true",

      hideExamResult:
        hideExamResult === true ||
        hideExamResult === "true",

      status:
        status || "Draft",
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (
  req,
  res,
  next
) => {
  try {
    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const body = req.body;

    if (body.courseTitle !== undefined) {
      if (!body.courseTitle.trim()) {
        return res.status(400).json({
          success: false,
          message: "Course title is required",
        });
      }

      course.courseTitle =
        body.courseTitle.trim();
    }

    if (body.courseType !== undefined) {
      if (!body.courseType.trim()) {
        return res.status(400).json({
          success: false,
          message: "Course type is required",
        });
      }

      course.courseType =
        body.courseType.trim();
    }

    const numericMrp =
      body.mrp !== undefined
        ? Number(body.mrp)
        : course.mrp;

    const numericPrice =
      body.price !== undefined
        ? Number(body.price)
        : course.price;

    if (
      Number.isNaN(numericMrp) ||
      numericMrp < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid MRP is required",
      });
    }

    if (
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid price is required",
      });
    }

    if (numericPrice > numericMrp) {
      return res.status(400).json({
        success: false,
        message: "Price cannot be greater than MRP",
      });
    }

    course.certificateDiploma =
      body.certificateDiploma ??
      course.certificateDiploma;

    course.courseCategory =
      body.courseCategory ??
      course.courseCategory;

    course.mrp = numericMrp;
    course.price = numericPrice;

    course.displayOrder =
      body.displayOrder !== undefined
        ? Number(body.displayOrder) || 0
        : course.displayOrder;

    course.duration =
      body.duration !== undefined
        ? Number(body.duration) || 0
        : course.duration;

    course.durationUnit =
      body.durationUnit ||
      course.durationUnit;

    course.previewVideo =
      body.previewVideo ??
      course.previewVideo;

    course.totalLectures =
      body.totalLectures !== undefined
        ? Number(body.totalLectures) || 0
        : course.totalLectures;

    course.practicalMarks =
      body.practicalMarks !== undefined
        ? Number(body.practicalMarks) || 0
        : course.practicalMarks;

    course.objectiveMarks =
      body.objectiveMarks !== undefined
        ? Number(body.objectiveMarks) || 0
        : course.objectiveMarks;

    course.description =
      body.description ??
      course.description;

    course.syllabus =
      body.syllabus ??
      course.syllabus;

    course.eligibility =
      body.eligibility ??
      course.eligibility;

    course.certificateSubject =
      body.certificateSubject ??
      course.certificateSubject;

    if (body.popular !== undefined) {
      course.popular =
        body.popular === true ||
        body.popular === "true";
    }

    if (body.recommended !== undefined) {
      course.recommended =
        body.recommended === true ||
        body.recommended === "true";
    }

    if (body.mrpVisible !== undefined) {
      course.mrpVisible =
        body.mrpVisible === true ||
        body.mrpVisible === "true";
    }

    if (body.hideExamResult !== undefined) {
      course.hideExamResult =
        body.hideExamResult === true ||
        body.hideExamResult === "true";
    }

    if (body.status !== undefined) {
      course.status = body.status;
    }

    if (req.file) {
      course.courseImage =
        `/uploads/courses/${req.file.filename}`;
    }

    await course.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCourse = async (
  req,
  res,
  next
) => {
  try {
    const course = await Course.findById(
      req.params.id
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    await course.deleteOne();

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateCourseStatus =
  async (req, res, next) => {
    try {
      const { status } = req.body;

      const validStatuses = [
        "Published",
        "Draft",
        "Archived",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid course status",
        });
      }

      const course =
        await Course.findByIdAndUpdate(
          req.params.id,
          { status },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Course status updated successfully",
        data: course,
      });
    } catch (error) {
      next(error);
    }
  };