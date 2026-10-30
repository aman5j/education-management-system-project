import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import HallTicket from "../models/HallTicket.js";
import ExamResult from "../models/ExamResult.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import ExamAccessRequest from "../models/ExamAccessRequest.js";
import { getStudentExamFeeStatus } from "../utils/examFeeEligibility.js";

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

const validId = (value) => mongoose.isValidObjectId(value);

// The current EMS exam schedule is displayed in India Standard Time.
const IST_OFFSET = "+05:30";

function getScheduledTime(dateValue, timeValue) {
  if (!dateValue || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeValue || "")) {
    return null;
  }

  const datePart = new Date(dateValue).toISOString().slice(0, 10);
  const result = new Date(`${datePart}T${timeValue}:00${IST_OFFSET}`);

  return Number.isNaN(result.getTime()) ? null : result;
}

async function getLinkedStudent(req) {
  const studentId = req.user?.studentRecord;

  if (!studentId || !validId(String(studentId))) {
    return { error: { status: 409, message: "Your login is not linked to a student record. Contact your institute administrator." } };
  }

  const student = await Student.findById(studentId)
    .select("_id firstName surname rollNo status")
    .lean();

  if (!student) {
    return { error: { status: 404, message: "Your linked student record could not be found." } };
  }

  return { student };
}

async function getOwnedTicket(studentId, ticketId) {
  if (!validId(ticketId)) return null;

  return HallTicket.findOne({
    _id: ticketId,
    student_id: studentId,
    status: "Active",
  })
    .populate("course_id", "courseTitle courseType")
    .populate("exam_id", "course_id totalQuestions totalMarks marksPerQuestion selectedQuestions")
    .lean();
}

function serializeTicket(ticket, result) {
  const exam = ticket.exam_id || {};
  const startAt = getScheduledTime(ticket.examDate, ticket.startTime);
  const endAt = getScheduledTime(ticket.examDate, ticket.endTime);
  const now = Date.now();

  let scheduleStatus = "Past";
  if (startAt && endAt && now >= startAt.getTime() && now < endAt.getTime()) {
    scheduleStatus = "In progress";
  } else if (startAt && now < startAt.getTime()) {
    scheduleStatus = "Upcoming";
  }

  return {
    ticketId: String(ticket._id),
    hallTicketNo: ticket.hallTicketNo,
    examId: String(exam._id || ""),
    courseId: String(ticket.course_id?._id || ticket.course_id || ""),
    course: ticket.course_id?.courseTitle || "Course unavailable",
    courseType: ticket.course_id?.courseType || "",
    examDate: ticket.examDate,
    startTime: ticket.startTime,
    endTime: ticket.endTime,
    reportingTime: ticket.reportingTime,
    totalQuestions: exam.totalQuestions || 0,
    totalMarks: exam.totalMarks || 0,
    marksPerQuestion: exam.marksPerQuestion || 0,
    scheduleStatus,
    attemptStatus: result?.attemptStatus || "NotStarted",
    resultStatus: result?.resultStatus || null,
    resultId: result ? String(result._id) : null,
    startedAt: result?.startedAt || null,
    submittedAt: result?.submittedAt || null,
  };
}


async function getQuestionPayload(exam, savedAnswers = []) {
  const selected = exam.selectedQuestions || [];

  const subjectIds = [
    ...new Set(selected.map((item) => String(item.subject_id))),
  ];

  const subjects = await Subject.find({
    _id: { $in: subjectIds },
  })
    .select("subjectName questionBank")
    .lean();

  const subjectMap = new Map(
    subjects.map((item) => [String(item._id), item])
  );

  const savedMap = new Map(
    savedAnswers.map((item) => [
      `${String(item.subject_id)}:${String(item.question_id)}`,
      item,
    ])
  );

  return selected.map((item, index) => {
    const key = `${String(item.subject_id)}:${String(item.question_id)}`;

    const saved = savedMap.get(key);

    const subject = subjectMap.get(String(item.subject_id));

    const liveQuestion = (subject?.questionBank || []).find(
      (entry) => String(entry._id) === String(item.question_id)
    );

    // Prefer the original snapshot for an already-started attempt.
    const hasSnapshot = Boolean(saved?.questionTextSnapshot);

    const source = hasSnapshot ? saved : liveQuestion;

    if (!source) {
      throw Object.assign(
        new Error(
          `Question ${index + 1} is unavailable. Contact your institute administrator.`
        ),
        { status: 409 }
      );
    }

    const subjectName =
      saved?.subjectNameSnapshot ||
      subject?.subjectName ||
      "Subject";

    const snapshot = {
      subject_id: item.subject_id,
      question_id: item.question_id,
      subjectNameSnapshot: subjectName,
      questionTextSnapshot:
        saved?.questionTextSnapshot || source.questionText || "",
      optionASnapshot:
        saved?.optionASnapshot || source.optionASnapshot || source.optionA || "",
      optionBSnapshot:
        saved?.optionBSnapshot || source.optionBSnapshot || source.optionB || "",
      optionCSnapshot:
        saved?.optionCSnapshot || source.optionCSnapshot || source.optionC || "",
      optionDSnapshot:
        saved?.optionDSnapshot || source.optionDSnapshot || source.optionD || "",
      correctAnswerSnapshot:
        saved?.correctAnswerSnapshot ||
        source.correctAnswer ||
        "",
      answer: saved?.answer || "",
      isCorrect: Boolean(saved?.isCorrect),
      marksAwarded: Number(saved?.marksAwarded || 0),
      marksOverridden: Boolean(saved?.marksOverridden),
      overrideReason: saved?.overrideReason || "",
    };

    return {
      snapshot,

      question: {
        number: index + 1,
        subjectId: String(item.subject_id),
        subjectName,
        questionId: String(item.question_id),
        questionText: snapshot.questionTextSnapshot,
        options: [
          { key: "A", text: snapshot.optionASnapshot },
          { key: "B", text: snapshot.optionBSnapshot },
          { key: "C", text: snapshot.optionCSnapshot },
          { key: "D", text: snapshot.optionDSnapshot },
        ],
      },
    };
  });
}


export const getMyExams = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);
    if (linked.error) return fail(res, linked.error.status, linked.error.message);

    const tickets = await HallTicket.find({
      student_id: linked.student._id,
      status: "Active",
    })
      .populate("course_id", "courseTitle courseType")
      .populate("exam_id", "course_id totalQuestions totalMarks marksPerQuestion")
      .sort({ examDate: -1 })
      .lean();

    const examIds = tickets.map((ticket) => ticket.exam_id?._id).filter(Boolean);

    const results = await ExamResult.find({
      student_id: linked.student._id,
      exam_id: { $in: examIds },
    })
      .select("exam_id resultStatus attemptStatus startedAt submittedAt publishedAt obtainedMarks totalMarks percentage grade passStatus")
      .lean();

    const resultMap = new Map(results.map((item) => [String(item.exam_id), item]));

    const exams = tickets.map((ticket) =>
      serializeTicket(ticket, resultMap.get(String(ticket.exam_id?._id)))
    );

    return res.json({
      success: true,
      data: {
        exams,
        summary: {
          total: exams.length,
          upcoming: exams.filter((item) => item.scheduleStatus === "Upcoming").length,
          inProgress: exams.filter((item) => item.scheduleStatus === "In progress").length,
          submitted: exams.filter((item) => item.attemptStatus === "Submitted").length,
          publishedResults: exams.filter((item) => item.resultStatus === "Published").length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyExamInstructions = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);
    if (linked.error) return fail(res, linked.error.status, linked.error.message);

    const ticket = await getOwnedTicket(linked.student._id, req.params.ticketId);
    if (!ticket) return fail(res, 404, "Active hall ticket not found.");

    const exam = ticket.exam_id;
    if (!exam?._id) return fail(res, 404, "The exam linked to this hall ticket was not found.");

    const result = await ExamResult.findOne({
      exam_id: exam._id,
      student_id: linked.student._id,
    }).lean();

    const feeStatus = await getStudentExamFeeStatus(
    linked.student._id,
    ticket.course_id?._id || ticket.course_id
    );

    const startAt = getScheduledTime(ticket.examDate, ticket.startTime);
    const endAt = getScheduledTime(ticket.examDate, ticket.endTime);
    const now = Date.now();

    const accessRequest = await ExamAccessRequest.findOne({
    exam_id: exam._id,
    student_id: linked.student._id,
    }).select("status rejectionReason requestedAt reviewedAt").lean();

    const accessApproved = accessRequest?.status === "Approved";

    return res.json({
      success: true,
      data: {
        exam: serializeTicket(ticket, result),
        instructions: [
          "Read each question carefully before selecting an answer.",
          "You can navigate between questions and review your selections.",
          "Unanswered questions receive no marks.",
          "Do not refresh or close the browser during the exam.",
          "Your answers are evaluated by the server after submission.",
          "Once submitted, an attempt cannot be restarted.",
        ],
        feeClearance: {
        eligible: feeStatus.eligible,
        outstanding: feeStatus.outstanding,
        message: feeStatus.message,
        },
        canStart: Boolean(
          startAt &&
          endAt &&
          now >= startAt.getTime() &&
          now < endAt.getTime() &&
          ticket.status === "Active" &&
          (
            accessApproved ||
            result?.attemptStatus === "InProgress"
          ) &&
          result?.attemptStatus !== "Submitted" &&
          result?.resultStatus !== "Published"
        ),
        canRequestAccess: Boolean(
        startAt &&
        endAt &&
        now >= startAt.getTime() &&
        now < endAt.getTime() &&
        ticket.status === "Active" &&
        feeStatus.eligible &&
        result?.attemptStatus !== "Submitted" &&
        result?.resultStatus !== "Published"
        ),

        startsAt: startAt,
        endsAt: endAt,
        alreadyStarted: result?.attemptStatus === "InProgress",
        accessRequestStatus: accessRequest?.status || "NotRequested",
        accessRequestReason: accessRequest?.rejectionReason || "",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const startMyExam = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);
    if (linked.error) return fail(res, linked.error.status, linked.error.message);

    const ticket = await getOwnedTicket(linked.student._id, req.params.ticketId);
    if (!ticket) return fail(res, 404, "Active hall ticket not found.");

    const exam = ticket.exam_id;
    if (!exam?._id) return fail(res, 404, "Exam not found.");

    const now = new Date();
    const startAt = getScheduledTime(ticket.examDate, ticket.startTime);
    const endAt = getScheduledTime(ticket.examDate, ticket.endTime);

    if (!startAt || !endAt || endAt <= startAt) {
      return fail(res, 409, "The exam schedule is invalid. Contact your institute administrator.");
    }

    if (now < startAt) {
      return fail(res, 409, "The exam has not started yet. Please return at the scheduled start time.");
    }

    if (now >= endAt) {
      return fail(res, 409, "The scheduled exam window has ended.");
    }

    let result = await ExamResult.findOne({
      exam_id: exam._id,
      student_id: linked.student._id,
    });

    if (result?.attemptStatus !== "InProgress") {
    const feeStatus = await getStudentExamFeeStatus(
        linked.student._id,
        ticket.course_id?._id || ticket.course_id
    );

    if (!feeStatus.eligible) {
        return fail(res, 403, feeStatus.message);
    }
    }


    // A new attempt requires Admin approval.
    // An existing InProgress attempt can resume without a new request.
    if (result?.attemptStatus !== "InProgress") {
    const approvedRequest = await ExamAccessRequest.findOne({
        exam_id: exam._id,
        student_id: linked.student._id,
        ticket_id: ticket._id,
        status: "Approved",
    }).lean();

    if (!approvedRequest) {
        return fail(
        res,
        403,
        "Admin approval is required before you can start this exam."
        );
    }
    }

    if (result?.resultStatus === "Published" || result?.attemptStatus === "Submitted") {
      return fail(res, 409, "This exam attempt has already been submitted.");
    }

    if (result?.attemptStatus !== "InProgress") {
      if (!result) {
        result = new ExamResult({
          exam_id: exam._id,
          course_id: exam.course_id,
          student_id: linked.student._id,
          totalQuestions: exam.totalQuestions,
          totalMarks: exam.totalMarks,
          obtainedMarks: 0,
          percentage: 0,
          grade: "F",
          passStatus: "Fail",
          resultStatus: "Draft",
          attemptStatus: "InProgress",
          startedAt: now,
          expiresAt: endAt,
          answers: [],
        });
      } else {
        result.attemptStatus = "InProgress";
        result.startedAt = now;
        result.expiresAt = endAt;
      }
    }

    // Load original question data, preferring snapshots already saved.
    const questionRecords = await getQuestionPayload(
      exam,
      result.answers || []
    );

    // Save the original question and answer-key snapshots at exam start.
    result.answers = questionRecords.map((item) => item.snapshot);

    await result.save();

    const questions = questionRecords.map((item) => item.question);
    const expiresAt = result.expiresAt || endAt;

    return res.json({
      success: true,
      data: {
        exam: serializeTicket(ticket, result),
        questions,
        startedAt: result.startedAt,
        expiresAt,
        serverTime: new Date(),
        savedAnswers: (result.answers || []).map((answer) => ({
          subjectId: String(answer.subject_id),
          questionId: String(answer.question_id),
          answer: answer.answer || "",
        })),
      },
    });
  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    if (error.code === 11000) return fail(res, 409, "An attempt already exists for this exam.");
    next(error);
  }
};

export const submitMyExam = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);
    if (linked.error) return fail(res, linked.error.status, linked.error.message);

    const ticket = await getOwnedTicket(linked.student._id, req.params.ticketId);
    if (!ticket) return fail(res, 404, "Active hall ticket not found.");

    const exam = ticket.exam_id;
    if (!exam?._id) return fail(res, 404, "Exam not found.");

    const result = await ExamResult.findOne({
      exam_id: exam._id,
      student_id: linked.student._id,
    });

    if (!result || result.attemptStatus !== "InProgress") {
      return fail(res, 409, "No active exam attempt was found. Start the exam first.");
    }

    if (result.resultStatus === "Published" || result.attemptStatus === "Submitted") {
      return fail(res, 409, "This exam has already been submitted.");
    }

    const now = new Date();

    const scheduledEnd = getScheduledTime(
    ticket.examDate,
    ticket.endTime
    );

    if (!scheduledEnd) {
    return fail(res, 409, "The exam end time is invalid.");
    }

    const storedExpiry = result.expiresAt
    ? new Date(result.expiresAt).getTime()
    : scheduledEnd.getTime();

    const deadlineMs = Math.min(
    storedExpiry,
    scheduledEnd.getTime()
    );

    // Allow a small 60-second network grace period for automatic submission.
    const submissionGraceMs = 60 * 1000;

    if (now.getTime() > deadlineMs + submissionGraceMs) {
    return fail(
        res,
        409,
        "The exam submission window has ended. Contact your institute administrator."
    );
    }
    

    const submitted = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const selected = exam.selectedQuestions || [];
    const answerMap = new Map();

    for (const item of submitted) {
      const subjectId = String(item?.subjectId || "");
      const questionId = String(item?.questionId || "");
      const answer = item?.answer ?? "";

      if (!validId(subjectId) || !validId(questionId)) {
        return fail(res, 400, "An answer contains an invalid question reference.");
      }
      if (!["A", "B", "C", "D", ""].includes(answer)) {
        return fail(res, 400, "Answer must be A, B, C, D, or empty.");
      }

      const key = `${subjectId}:${questionId}`;
      if (answerMap.has(key)) return fail(res, 400, "Duplicate answer entries are not allowed.");
      answerMap.set(key, answer);
    }

    const allowed = new Set(
      selected.map((item) => `${String(item.subject_id)}:${String(item.question_id)}`)
    );

    for (const key of answerMap.keys()) {
      if (!allowed.has(key)) return fail(res, 400, "An answer references a question outside this exam.");
    }

    // const subjectIds = [...new Set(selected.map((item) => String(item.subject_id)))];

    
    const savedSnapshotMap = new Map(
    (result.answers || []).map((item) => [
        `${String(item.subject_id)}:${String(item.question_id)}`,
        item,
    ])
    );

    // Fetch current Question Bank records only as a fallback for
    // older attempts that do not yet contain snapshots.
    const missingSnapshots = selected.filter((item) => {
    const saved = savedSnapshotMap.get(
        `${String(item.subject_id)}:${String(item.question_id)}`
    );

    return !saved?.questionTextSnapshot;
    });

    const subjectIds = [
    ...new Set(missingSnapshots.map((item) => String(item.subject_id))),
    ];

    const subjects = subjectIds.length
    ? await Subject.find({ _id: { $in: subjectIds } })
        .select("subjectName questionBank")
        .lean()
    : [];

    const liveQuestionMap = new Map();

    for (const subject of subjects) {
    for (const question of subject.questionBank || []) {
        liveQuestionMap.set(
        `${String(subject._id)}:${String(question._id)}`,
        {
            ...question,
            subjectName: subject.subjectName,
        }
        );
    }
    }

    let obtainedMarks = 0;
    const marksPerQuestion = Number(exam.marksPerQuestion || 0);

    const calculatedAnswers = selected.map((item) => {
    const key = `${String(item.subject_id)}:${String(item.question_id)}`;

    const saved = savedSnapshotMap.get(key);
    const live = liveQuestionMap.get(key);

    if (!saved?.questionTextSnapshot && !live) {
        throw Object.assign(
        new Error(
            "An exam question is unavailable and its original snapshot could not be found."
        ),
        { status: 409 }
        );
    }

    const questionText =
        saved?.questionTextSnapshot || live?.questionText || "";

    const optionA =
        saved?.questionTextSnapshot
        ? saved.optionASnapshot
        : live?.optionA || "";

    const optionB =
        saved?.questionTextSnapshot
        ? saved.optionBSnapshot
        : live?.optionB || "";

    const optionC =
        saved?.questionTextSnapshot
        ? saved.optionCSnapshot
        : live?.optionC || "";

    const optionD =
        saved?.questionTextSnapshot
        ? saved.optionDSnapshot
        : live?.optionD || "";

    const correctAnswer =
        saved?.correctAnswerSnapshot || live?.correctAnswer || "";

    const answer = answerMap.get(key) || "";

    const isCorrect = Boolean(
        answer && correctAnswer && answer === correctAnswer
    );

    const marksAwarded = isCorrect ? marksPerQuestion : 0;

    obtainedMarks += marksAwarded;

    return {
        subject_id: item.subject_id,
        question_id: item.question_id,
        answer,
        isCorrect,
        marksAwarded,

        subjectNameSnapshot:
        saved?.subjectNameSnapshot || live?.subjectName || "Subject",

        questionTextSnapshot: questionText,
        optionASnapshot: optionA,
        optionBSnapshot: optionB,
        optionCSnapshot: optionC,
        optionDSnapshot: optionD,
        correctAnswerSnapshot: correctAnswer,
    };
    });

    obtainedMarks = Number(obtainedMarks.toFixed(4));
    const totalMarks = Number(exam.totalMarks || 0);
    const percentage = totalMarks > 0
      ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2))
      : 0;

    result.answers = calculatedAnswers;
    result.totalQuestions = exam.totalQuestions;
    result.totalMarks = totalMarks;
    result.obtainedMarks = obtainedMarks;
    result.percentage = percentage;
    result.grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : percentage >= 40 ? "E" : "F";
    result.passStatus = percentage >= 40 ? "Pass" : "Fail";
    result.attemptStatus = "Submitted";
    result.submittedAt = now;
    result.resultStatus = "Draft";
    result.publishedAt = null;

    await result.save();

    
    return res.status(200).json({
    success: true,
    message: "Exam submitted successfully. Your provisional result is ready.",
    data: {
        resultId: String(result._id),
        attemptStatus: result.attemptStatus,
        resultStatus: result.resultStatus,
        submittedAt: result.submittedAt,
        obtainedMarks: result.obtainedMarks,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
    },
    });

  } catch (error) {
    if (error.status) return fail(res, error.status, error.message);
    next(error);
  }
};

export const getMyExamResults = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);

    if (linked.error) {
      return fail(res, linked.error.status, linked.error.message);
    }

    const results = await ExamResult.find({
      student_id: linked.student._id,
      attemptStatus: "Submitted",
    })
      .populate("course_id", "courseTitle")
      .populate("exam_id", "totalQuestions totalMarks")
      .sort({ submittedAt: -1, updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: {
        results: results.map((result) => ({
          id: String(result._id),
          course: result.course_id?.courseTitle || "Course unavailable",

          totalQuestions: result.totalQuestions,
          totalMarks: result.totalMarks,
          obtainedMarks: result.obtainedMarks,
          percentage: result.percentage,
          grade: result.grade,
          passStatus: result.passStatus,

          resultStatus: result.resultStatus,
          isProvisional: result.resultStatus !== "Published",

          submittedAt: result.submittedAt,
          publishedAt: result.publishedAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyExamResultById = async (req, res, next) => {
  try {
    const linked = await getLinkedStudent(req);

    if (linked.error) {
      return fail(res, linked.error.status, linked.error.message);
    }

    if (!validId(req.params.resultId)) {
      return fail(res, 400, "Invalid result ID.");
    }

    const result = await ExamResult.findOne({
      _id: req.params.resultId,
      student_id: linked.student._id,
      attemptStatus: "Submitted",
    })
      .populate("course_id", "courseTitle")
      .populate("exam_id", "totalQuestions totalMarks")
      .lean();

    if (!result) {
      return fail(res, 404, "Submitted exam result not found.");
    }

    const answers = result.answers || [];
    const isPublished = result.resultStatus === "Published";

    const answeredCount = answers.filter(
      (answer) => Boolean(answer.answer)
    ).length;

    const skippedCount = Math.max(
      0,
      Number(result.totalQuestions || 0) - answeredCount
    );

    const timeTakenMs =
      result.startedAt && result.submittedAt
        ? Math.max(
            0,
            new Date(result.submittedAt).getTime() -
              new Date(result.startedAt).getTime()
          )
        : 0;

    let answerSheet = [];

    if (isPublished) {
      const subjectIds = [
        ...new Set(answers.map((item) => String(item.subject_id))),
      ];

      const subjects = await Subject.find({
        _id: { $in: subjectIds },
      })
        .select("subjectName questionBank")
        .lean();

      const questionMap = new Map();

      for (const subject of subjects) {
        for (const question of subject.questionBank || []) {
          questionMap.set(
            `${String(subject._id)}:${String(question._id)}`,
            {
              subjectName: subject.subjectName,
              questionText: question.questionText,
              correctAnswer: question.correctAnswer,
              optionA: question.optionA,
              optionB: question.optionB,
              optionC: question.optionC,
              optionD: question.optionD,
            }
          );
        }
      }

      answerSheet = answers.map((answer, index) => {
        const key =
          `${String(answer.subject_id)}:${String(answer.question_id)}`;

        const question = questionMap.get(key) || {};

        const correctAnswer =
          answer.correctAnswerSnapshot ||
          question.correctAnswer ||
          "";

        return {
          number: index + 1,

          subjectName: question.subjectName || "Subject",

          questionText:
            answer.questionTextSnapshot ||
            question.questionText ||
            "Question unavailable",

          options: [
            {
              key: "A",
              text: answer.optionASnapshot || question.optionA || "",
            },
            {
              key: "B",
              text: answer.optionBSnapshot || question.optionB || "",
            },
            {
              key: "C",
              text: answer.optionCSnapshot || question.optionC || "",
            },
            {
              key: "D",
              text: answer.optionDSnapshot || question.optionD || "",
            },
          ],

          selectedAnswer: answer.answer || "",
          correctAnswer,
          isCorrect: Boolean(answer.isCorrect),
          marksAwarded: Number(answer.marksAwarded || 0),
        };
      });
    }

    return res.json({
      success: true,
      data: {
        id: String(result._id),

        course:
          result.course_id?.courseTitle || "Course unavailable",

        totalQuestions: result.totalQuestions,
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,

        resultStatus: result.resultStatus,
        isProvisional: !isPublished,

        answeredCount,
        skippedCount,
        timeTakenMs,

        startedAt: result.startedAt,
        submittedAt: result.submittedAt,
        publishedAt: result.publishedAt,

        answers: answerSheet,
      },
    });
  } catch (error) {
    next(error);
  }
};