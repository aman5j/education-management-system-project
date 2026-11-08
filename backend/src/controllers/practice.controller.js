
import mongoose from "mongoose";

import PracticeTest from "../models/PracticeTest.js";
import PracticeAttempt from "../models/PracticeAttempt.js";
import Course from "../models/Course.js";
import Subject from "../models/Subject.js";
import Student from "../models/Student.js";
import StudentAdmission from "../models/StudentAdmission.js";

const fail = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const validId = (id) => mongoose.isValidObjectId(id);

const getStudentId = (req) => req.user?.studentRecord;

const shuffle = (items) => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const safeQuestion = (question) => ({
  question_id: question.question_id,
  questionText: question.questionText,
  optionA: question.optionA,
  optionB: question.optionB,
  optionC: question.optionC,
  optionD: question.optionD,
  selectedAnswer: question.selectedAnswer || "",
});

const getTestInput = (body = {}) => {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const course_id = String(body.course_id || "").trim();
  const subject_id = String(body.subject_id || "").trim();
  const totalQuestions = Number(body.totalQuestions);
  const durationMinutes = Number(body.durationMinutes);
  const marksPerQuestion = Number(body.marksPerQuestion ?? 1);

  if (!title || title.length > 150) {
    return { error: "Test title is required (maximum 150 characters)." };
  }

  if (description.length > 1000) {
    return { error: "Description cannot exceed 1000 characters." };
  }

  if (!validId(course_id) || !validId(subject_id)) {
    return { error: "Please select a valid course and subject." };
  }

  if (
    !Number.isInteger(totalQuestions) ||
    totalQuestions < 1 ||
    totalQuestions > 500
  ) {
    return { error: "Questions must be between 1 and 500." };
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 300
  ) {
    return { error: "Duration must be between 1 and 300 minutes." };
  }

  if (
    !Number.isFinite(marksPerQuestion) ||
    marksPerQuestion <= 0 ||
    marksPerQuestion > 1000
  ) {
    return { error: "Marks per question must be greater than zero." };
  }

  return {
    data: {
      title,
      description,
      course_id,
      subject_id,
      totalQuestions,
      durationMinutes,
      marksPerQuestion,
      totalMarks: Number(
        (totalQuestions * marksPerQuestion).toFixed(2)
      ),
    },
  };
};

const validateCourseSubject = async (courseId, subjectId) => {
  const [course, subject] = await Promise.all([
    Course.findById(courseId)
      .select("courseTitle subjects status")
      .lean(),
    Subject.findById(subjectId)
      .select("subjectName status questionBank")
      .lean(),
  ]);

  if (!course) return { error: "Course not found.", status: 404 };
  if (!subject) return { error: "Subject not found.", status: 404 };

  const belongsToCourse = (course.subjects || []).some(
    (id) => String(id) === String(subject._id)
  );

  if (!belongsToCourse) {
    return {
      error: "Selected subject is not linked to this course.",
      status: 400,
    };
  }

  if (subject.status !== "Active") {
    return { error: "Selected subject is inactive.", status: 400 };
  }

  return { course, subject };
};

const populateTest = (query) =>
  query
    .populate("course_id", "courseTitle")
    .populate("subject_id", "subjectName");

const populateAttempt = (query) =>
  query
    .populate("student_id", "firstName surname rollNo")
    .populate("practiceTest_id", "title")
    .populate("course_id", "courseTitle")
    .populate("subject_id", "subjectName");

// =========================================================
// ADMIN: LIST PRACTICE TESTS
// GET /api/practice/admin/tests
// =========================================================
// export const adminGetPracticeTests = async (req, res, next) => {
//   try {
//     const page = Math.max(Number(req.query.page) || 1, 1);
//     const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
//     const filter = {};

//     if (req.query.status) {
//       if (!["Draft", "Published", "Archived"].includes(req.query.status)) {
//         return fail(res, 400, "Invalid test status.");
//       }
//       filter.status = req.query.status;
//     }

//     if (req.query.course_id) {
//       if (!validId(req.query.course_id)) {
//         return fail(res, 400, "Invalid course ID.");
//       }
//       filter.course_id = req.query.course_id;
//     }

//     const [tests, total] = await Promise.all([
//       populateTest(
//         PracticeTest.find(filter)
//           .sort({ createdAt: -1 })
//           .skip((page - 1) * limit)
//           .limit(limit)
//       ).lean(),
//       PracticeTest.countDocuments(filter),
//     ]);

//     return res.json({
//       success: true,
//       data: {
//         tests,
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages: Math.ceil(total / limit),
//         },
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// =========================================================
// ADMIN: LIST PRACTICE TESTS
// GET /api/practice/admin/tests
// Supports database pagination, search, filters and global stats.
// =========================================================
export const adminGetPracticeTests = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const filter = {};

    if (req.query.status) {
      if (!["Draft", "Published", "Archived"].includes(req.query.status)) {
        return fail(res, 400, "Invalid test status.");
      }

      filter.status = req.query.status;
    }

    if (req.query.course_id) {
      if (!validId(req.query.course_id)) {
        return fail(res, 400, "Invalid course ID.");
      }

      filter.course_id = req.query.course_id;
    }

    const search = String(req.query.search || "").trim();

    if (search) {
      // Escape regex characters so user input is treated as plain text.
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      const [matchingCourses, matchingSubjects] = await Promise.all([
        Course.find({ courseTitle: searchRegex })
          .select("_id")
          .lean(),

        Subject.find({ subjectName: searchRegex })
          .select("_id")
          .lean(),
      ]);

      const matchingCourseIds = matchingCourses.map((item) => item._id);
      const matchingSubjectIds = matchingSubjects.map((item) => item._id);

      const searchConditions = [
        { title: searchRegex },
      ];

      if (matchingCourseIds.length) {
        searchConditions.push({
          course_id: { $in: matchingCourseIds },
        });
      }

      if (matchingSubjectIds.length) {
        searchConditions.push({
          subject_id: { $in: matchingSubjectIds },
        });
      }

      filter.$or = searchConditions;
    }

    const skip = (page - 1) * limit;

    const [
      tests,
      total,
      totalTests,
      published,
      draft,
      archived,
    ] = await Promise.all([
      populateTest(
        PracticeTest.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ).lean(),

      PracticeTest.countDocuments(filter),

      // These counts are global and are not affected by the current
      // search term, status filter, course filter or page.
      PracticeTest.countDocuments({}),

      PracticeTest.countDocuments({ status: "Published" }),
      PracticeTest.countDocuments({ status: "Draft" }),
      PracticeTest.countDocuments({ status: "Archived" }),
    ]);

    return res.json({
      success: true,
      data: {
        tests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          total: totalTests,
          published,
          draft,
          archived,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: CREATE PRACTICE TEST
// POST /api/practice/admin/tests
// =========================================================
export const adminCreatePracticeTest = async (req, res, next) => {
  try {
    const normalized = getTestInput(req.body);
    if (normalized.error) return fail(res, 400, normalized.error);

    const data = normalized.data;

    const relation = await validateCourseSubject(
      data.course_id,
      data.subject_id
    );

    if (relation.error) {
      return fail(res, relation.status, relation.error);
    }

    const availableQuestions = relation.subject.questionBank || [];

    if (availableQuestions.length < data.totalQuestions) {
      return fail(
        res,
        400,
        `This subject has only ${availableQuestions.length} MCQs. Add enough questions before creating this test.`
      );
    }

    const test = await PracticeTest.create({
      ...data,
      status: "Draft",
      createdBy: req.user._id,
    });

    const result = await populateTest(
      PracticeTest.findById(test._id)
    ).lean();

    return res.status(201).json({
      success: true,
      message: "Practice test created successfully as Draft.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: VIEW ONE TEST
// GET /api/practice/admin/tests/:id
// =========================================================
export const adminGetPracticeTest = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid practice test ID.");
    }

    const test = await populateTest(
      PracticeTest.findById(req.params.id)
    ).lean();

    if (!test) return fail(res, 404, "Practice test not found.");

    return res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: UPDATE TEST
// PATCH /api/practice/admin/tests/:id
// =========================================================
export const adminUpdatePracticeTest = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid practice test ID.");
    }

    const test = await PracticeTest.findById(req.params.id);
    if (!test) return fail(res, 404, "Practice test not found.");

    const attemptsExist = await PracticeAttempt.exists({
      practiceTest_id: test._id,
    });

    if (attemptsExist) {
      return fail(
        res,
        409,
        "This test already has attempts. Editing is disabled to protect previous results."
      );
    }

    const normalized = getTestInput(req.body);
    if (normalized.error) return fail(res, 400, normalized.error);

    const relation = await validateCourseSubject(
      normalized.data.course_id,
      normalized.data.subject_id
    );

    if (relation.error) {
      return fail(res, relation.status, relation.error);
    }

    const available = relation.subject.questionBank || [];

    if (available.length < normalized.data.totalQuestions) {
      return fail(
        res,
        400,
        `This subject has only ${available.length} MCQs.`
      );
    }

    Object.assign(test, normalized.data);
    await test.save();

    const result = await populateTest(
      PracticeTest.findById(test._id)
    ).lean();

    return res.json({
      success: true,
      message: "Practice test updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: CHANGE TEST STATUS
// PATCH /api/practice/admin/tests/:id/status
// =========================================================
export const adminUpdatePracticeTestStatus = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid practice test ID.");
    }

    const { status } = req.body;

    if (!["Draft", "Published", "Archived"].includes(status)) {
      return fail(res, 400, "Status must be Draft, Published, or Archived.");
    }

    const test = await PracticeTest.findById(req.params.id);
    if (!test) return fail(res, 404, "Practice test not found.");

    if (status === "Published") {
      const relation = await validateCourseSubject(
        test.course_id,
        test.subject_id
      );

      if (relation.error) {
        return fail(res, relation.status, relation.error);
      }

      const available = relation.subject.questionBank || [];

      if (available.length < test.totalQuestions) {
        return fail(
          res,
          400,
          `Cannot publish. The subject has only ${available.length} MCQs, but this test needs ${test.totalQuestions}.`
        );
      }
    }

    test.status = status;
    await test.save();

    return res.json({
      success: true,
      message: `Practice test ${status.toLowerCase()} successfully.`,
      data: test,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: DELETE TEST (ONLY IF NO ATTEMPTS)
// DELETE /api/practice/admin/tests/:id
// =========================================================
export const adminDeletePracticeTest = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid practice test ID.");
    }

    const test = await PracticeTest.findById(req.params.id);
    if (!test) return fail(res, 404, "Practice test not found.");

    const attemptsExist = await PracticeAttempt.exists({
      practiceTest_id: test._id,
    });

    if (attemptsExist) {
      return fail(
        res,
        409,
        "This test has student attempts and cannot be deleted. Archive it instead."
      );
    }

    await test.deleteOne();

    return res.json({
      success: true,
      message: "Practice test deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: VIEW ALL ATTEMPTS
// GET /api/practice/admin/attempts
// =========================================================
export const adminGetPracticeAttempts = async (req, res, next) => {
  try {
    const filter = {};

    for (const key of ["test_id", "course_id", "subject_id", "student_id"]) {
      if (req.query[key]) {
        if (!validId(req.query[key])) {
          return fail(res, 400, `Invalid ${key}.`);
        }

        filter[
          key === "test_id"
            ? "practiceTest_id"
            : key
        ] = req.query[key];
      }
    }

    if (req.query.status) {
      if (!["In Progress", "Submitted", "Timed Out"].includes(req.query.status)) {
        return fail(res, 400, "Invalid attempt status.");
      }
      filter.status = req.query.status;
    }

    const attempts = await populateAttempt(
      PracticeAttempt.find(filter)
        .select("-questions.correctAnswer")
        .sort({ createdAt: -1 })
        .limit(500)
    ).lean();

    return res.json({
      success: true,
      data: attempts,
      total: attempts.length,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// ADMIN: VIEW ATTEMPT RESULT
// GET /api/practice/admin/attempts/:id
// =========================================================
export const adminGetPracticeAttempt = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid attempt ID.");
    }

    const attempt = await populateAttempt(
      PracticeAttempt.findById(req.params.id)
        .select("+questions.correctAnswer")
    ).lean();

    if (!attempt) return fail(res, 404, "Attempt not found.");

    if (attempt.status === "In Progress") {
      return fail(res, 409, "This attempt has not been submitted.");
    }

    return res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// STUDENT: AVAILABLE TESTS
// GET /api/practice/student/tests
// =========================================================
export const studentGetPracticeTests = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Your login is not linked to a student record.");
    }

    const studentExists = await Student.exists({ _id: studentId });

    if (!studentExists) {
      return fail(res, 404, "Linked student record not found.");
    }

    const admissions = await StudentAdmission.find({
      student_id: studentId,
      status: "Active",
    }).select("course_id");

    const courseIds = [
      ...new Set(admissions.map((item) => String(item.course_id))),
    ];

    if (!courseIds.length) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const tests = await populateTest(
      PracticeTest.find({
        course_id: { $in: courseIds },
        status: "Published",
      }).sort({ createdAt: -1 })
    ).lean();

    return res.json({
      success: true,
      data: tests,
      total: tests.length,
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// STUDENT: TEST INSTRUCTIONS
// GET /api/practice/student/tests/:id
// =========================================================
export const studentGetPracticeInstructions = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Student account is not linked.");
    }

    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid practice test ID.");
    }

    const test = await populateTest(
      PracticeTest.findOne({
        _id: req.params.id,
        status: "Published",
      })
    ).lean();

    if (!test) return fail(res, 404, "Published test not found.");

    const admission = await StudentAdmission.exists({
      student_id: studentId,
      course_id: test.course_id._id,
      status: "Active",
    });

    if (!admission) {
      return fail(res, 403, "You are not enrolled in this course.");
    }

    const attemptsCompleted = await PracticeAttempt.countDocuments({
      practiceTest_id: test._id,
      student_id: studentId,
      status: { $in: ["Submitted", "Timed Out"] },
    });

    return res.json({
      success: true,
      data: {
        id: test._id,
        title: test.title,
        description: test.description,
        course: test.course_id.courseTitle,
        subject: test.subject_id.subjectName,
        totalQuestions: test.totalQuestions,
        durationMinutes: test.durationMinutes,
        marksPerQuestion: test.marksPerQuestion,
        totalMarks: test.totalMarks,
        attemptsCompleted,
        attemptsAllowed: "Unlimited",
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// STUDENT: START TEST
// POST /api/practice/student/tests/:id/start
// =========================================================
export const studentStartPracticeTest = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Student account is not linked.");
    }

    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid practice test ID.");
    }

    const test = await PracticeTest.findOne({
      _id: req.params.id,
      status: "Published",
    });

    if (!test) return fail(res, 404, "Published test not found.");

    const admission = await StudentAdmission.exists({
      student_id: studentId,
      course_id: test.course_id,
      status: "Active",
    });

    if (!admission) {
      return fail(res, 403, "You are not enrolled in this course.");
    }

    const subject = await Subject.findOne({
      _id: test.subject_id,
      status: "Active",
    }).select("questionBank");

    if (!subject) return fail(res, 404, "Subject not found or inactive.");

    const bank = subject.questionBank || [];

    if (bank.length < test.totalQuestions) {
      return fail(res, 409, "Not enough questions are available.");
    }

    // Randomly choose questions without duplicates within this attempt.
    const selected = shuffle(bank).slice(0, test.totalQuestions);

    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + test.durationMinutes * 60 * 1000
    );

    const attempt = await PracticeAttempt.create({
      practiceTest_id: test._id,
      student_id: studentId,
      course_id: test.course_id,
      subject_id: test.subject_id,
      totalQuestions: test.totalQuestions,
      marksPerQuestion: test.marksPerQuestion,
      totalMarks: test.totalMarks,
      startedAt,
      expiresAt,
      questions: selected.map((question) => ({
        question_id: question._id,
        questionText: question.questionText,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        correctAnswer: question.correctAnswer,
        selectedAnswer: "",
      })),
    });

    return res.status(201).json({
      success: true,
      message: "Practice test started.",
      data: {
        attemptId: attempt._id,
        title: test.title,
        questions: attempt.questions.map(safeQuestion),
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        totalQuestions: attempt.totalQuestions,
        durationMinutes: test.durationMinutes,
        totalMarks: attempt.totalMarks,
        marksPerQuestion: attempt.marksPerQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// STUDENT: RESUME OWN ATTEMPT
// GET /api/practice/student/attempts/:id
// =========================================================
// export const studentGetPracticeAttempt = async (req, res, next) => {
//   try {
//     const studentId = getStudentId(req);

//     if (!studentId || !validId(String(studentId))) {
//       return fail(res, 409, "Student account is not linked.");
//     }

//     if (!validId(req.params.id)) {
//       return fail(res, 400, "Invalid attempt ID.");
//     }

//     const attempt = await PracticeAttempt.findOne({
//       _id: req.params.id,
//       student_id: studentId,
//     })
//       .select("-questions.correctAnswer")
//       .lean();

//     if (!attempt) return fail(res, 404, "Attempt not found.");

//     if (attempt.status === "In Progress" && new Date() >= attempt.expiresAt) {
//       return fail(
//         res,
//         410,
//         "This attempt has expired. Submit it to view your result."
//       );
//     }

//     return res.json({
//       success: true,
//       data: {
//         ...attempt,
//         questions: attempt.questions.map(safeQuestion),
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };



export const studentGetPracticeAttempt = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Student account is not linked.");
    }

    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid attempt ID.");
    }

    const attempt = await PracticeAttempt.findOne({
      _id: req.params.id,
      student_id: studentId,
    })
      .select("+questions.correctAnswer")
      .populate("practiceTest_id", "title")
      .populate("course_id", "courseTitle")
      .populate("subject_id", "subjectName")
      .lean();

    if (!attempt) {
      return fail(res, 404, "Attempt not found.");
    }

    if (
      attempt.status === "In Progress" &&
      new Date() >= new Date(attempt.expiresAt)
    ) {
      return fail(
        res,
        410,
        "This attempt has expired. Submit it to view your result."
      );
    }

    const questions = (attempt.questions || []).map((question) => {
      const safe = safeQuestion(question);

      // Never reveal correct answers while the attempt is active.
      if (attempt.status === "In Progress") {
        return safe;
      }

      return {
        ...safe,
        correctAnswer: question.correctAnswer,
        isCorrect:
          Boolean(question.selectedAnswer) &&
          question.selectedAnswer === question.correctAnswer,
      };
    });

    return res.json({
      success: true,
      data: {
        ...attempt,
        questions,
      },
    });
  } catch (error) {
    next(error);
  }
};



// =========================================================
// STUDENT: SAVE ANSWERS
// PATCH /api/practice/student/attempts/:id/answers
// =========================================================
export const studentSavePracticeAnswers = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Student account is not linked.");
    }

    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid attempt ID.");
    }

    if (!Array.isArray(req.body.answers)) {
      return fail(res, 400, "Answers must be an array.");
    }

    const attempt = await PracticeAttempt.findOne({
      _id: req.params.id,
      student_id: studentId,
    }).select("questions.question_id status expiresAt");

    if (!attempt) {
      return fail(res, 404, "Attempt not found.");
    }

    if (attempt.status !== "In Progress") {
      return fail(res, 409, "This attempt is already submitted.");
    }

    const now = new Date();

    if (now >= attempt.expiresAt) {
      return fail(res, 410, "Time has expired. Submit the test.");
    }

    const updates = {};
    const updatedAnswers = new Set();

    for (const answer of req.body.answers) {
      const questionIndex = attempt.questions.findIndex(
        (question) =>
          String(question.question_id) === String(answer.question_id)
      );

      if (questionIndex === -1) {
        return fail(res, 400, "An answer contains an invalid question ID.");
      }

      const questionId = String(answer.question_id);

      if (updatedAnswers.has(questionId)) {
        return fail(res, 400, "Duplicate question answers are not allowed.");
      }

      updatedAnswers.add(questionId);

      const selected = String(answer.selectedAnswer || "").toUpperCase();

      if (!["", "A", "B", "C", "D"].includes(selected)) {
        return fail(res, 400, "Answer must be A, B, C, or D.");
      }

      updates[`questions.${questionIndex}.selectedAnswer`] = selected;
    }

    // Atomic update: an attempt cannot be saved after submission or expiry.
    const result = await PracticeAttempt.updateOne(
      {
        _id: req.params.id,
        student_id: studentId,
        status: "In Progress",
        expiresAt: { $gt: now },
      },
      { $set: updates }
    );

    if (!result.matchedCount) {
      const latest = await PracticeAttempt.findOne({
        _id: req.params.id,
        student_id: studentId,
      }).select("status expiresAt");

      if (!latest) {
        return fail(res, 404, "Attempt not found.");
      }

      if (latest.status !== "In Progress") {
        return fail(res, 409, "This attempt is already submitted.");
      }

      return fail(res, 410, "Time has expired. Submit the test.");
    }

    const savedCount = attempt.questions.filter((question, index) => {
      const key = `questions.${index}.selectedAnswer`;
      const selected = updates[key];

      return selected !== undefined
        ? Boolean(selected)
        : false;
    }).length;

    return res.json({
      success: true,
      message: "Answers saved successfully.",
      data: {
        savedCount,
        expiresAt: attempt.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// STUDENT: SUBMIT TEST
// POST /api/practice/student/attempts/:id/submit
// =========================================================
export const studentSubmitPracticeTest = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Student account is not linked.");
    }

    if (!validId(req.params.id)) {
      return fail(res, 400, "Invalid attempt ID.");
    }

    const attempt = await PracticeAttempt.findOne({
      _id: req.params.id,
      student_id: studentId,
    }).select("+questions.correctAnswer");

    if (!attempt) {
      return fail(res, 404, "Attempt not found.");
    }

    if (attempt.status !== "In Progress") {
      return fail(res, 409, "This attempt has already been submitted.");
    }

    const now = new Date();
    const isExpired = now >= attempt.expiresAt;

    // Before expiry, accept the final answer snapshot.
    // After expiry, ignore all client-supplied answers.
    if (!isExpired && req.body.answers !== undefined) {
      if (!Array.isArray(req.body.answers)) {
        return fail(res, 400, "Answers must be an array.");
      }

      const updatedAnswers = new Set();

      for (const answer of req.body.answers) {
        const question = attempt.questions.find(
          (item) =>
            String(item.question_id) === String(answer.question_id)
        );

        if (!question) {
          return fail(res, 400, "An answer contains an invalid question ID.");
        }

        const questionId = String(answer.question_id);

        if (updatedAnswers.has(questionId)) {
          return fail(res, 400, "Duplicate question answers are not allowed.");
        }

        updatedAnswers.add(questionId);

        const selected = String(answer.selectedAnswer || "").toUpperCase();

        if (!["", "A", "B", "C", "D"].includes(selected)) {
          return fail(res, 400, "Answer must be A, B, C, or D.");
        }

        question.selectedAnswer = selected;
      }
    }

    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;

    for (const question of attempt.questions) {
      if (!question.selectedAnswer) {
        unanswered += 1;
      } else if (question.selectedAnswer === question.correctAnswer) {
        correct += 1;
      } else {
        incorrect += 1;
      }
    }

    const marksObtained = Number(
      (correct * attempt.marksPerQuestion).toFixed(2)
    );

    const percentage = attempt.totalMarks
      ? Number(((marksObtained / attempt.totalMarks) * 100).toFixed(2))
      : 0;

    const maxDurationSeconds = Math.floor(
      (attempt.expiresAt.getTime() - attempt.startedAt.getTime()) / 1000
    );

    const elapsedSeconds = Math.max(
      0,
      Math.floor((now.getTime() - attempt.startedAt.getTime()) / 1000)
    );

    const timeTakenSeconds = Math.min(
      elapsedSeconds,
      maxDurationSeconds
    );

    const finalStatus = isExpired ? "Timed Out" : "Submitted";

    // Atomic final update: subsequent autosaves cannot modify this attempt.
    const submittedAttempt = await PracticeAttempt.findOneAndUpdate(
      {
        _id: req.params.id,
        student_id: studentId,
        status: "In Progress",
      },
      {
        $set: {
          questions: attempt.questions,
          correctCount: correct,
          incorrectCount: incorrect,
          unansweredCount: unanswered,
          marksObtained,
          percentage,
          timeTakenSeconds,
          submittedAt: now,
          status: finalStatus,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).select("+questions.correctAnswer");

    if (!submittedAttempt) {
      return fail(res, 409, "This attempt has already been submitted.");
    }

    return res.json({
      success: true,
      message: "Practice test submitted successfully.",
      data: {
        attemptId: submittedAttempt._id,
        status: submittedAttempt.status,
        totalQuestions: submittedAttempt.totalQuestions,
        correctCount: submittedAttempt.correctCount,
        incorrectCount: submittedAttempt.incorrectCount,
        unansweredCount: submittedAttempt.unansweredCount,
        marksObtained: submittedAttempt.marksObtained,
        totalMarks: submittedAttempt.totalMarks,
        percentage: submittedAttempt.percentage,
        timeTakenSeconds: submittedAttempt.timeTakenSeconds,
        questions: submittedAttempt.questions.map((question) => ({
          ...safeQuestion(question),
          correctAnswer: question.correctAnswer,
          isCorrect:
            Boolean(question.selectedAnswer) &&
            question.selectedAnswer === question.correctAnswer,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// =========================================================
// STUDENT: ATTEMPT HISTORY
// GET /api/practice/student/attempts
// =========================================================
export const studentGetPracticeAttempts = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);

    if (!studentId || !validId(String(studentId))) {
      return fail(res, 409, "Student account is not linked.");
    }

    const attempts = await populateAttempt(
      PracticeAttempt.find({ student_id: studentId })
        .select("-questions.correctAnswer")
        .sort({ createdAt: -1 })
        .limit(100)
    ).lean();

    return res.json({
      success: true,
      data: attempts,
      total: attempts.length,
    });
  } catch (error) {
    next(error);
  }
};
