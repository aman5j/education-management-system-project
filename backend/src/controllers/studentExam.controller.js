import mongoose from "mongoose";
import Exam from "../models/Exam.js";
import HallTicket from "../models/HallTicket.js";
import ExamResult from "../models/ExamResult.js";
import Student from "../models/Student.js";
import Subject from "../models/Subject.js";
import ExamAccessRequest from "../models/ExamAccessRequest.js";

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

async function getQuestionPayload(exam) {
  const selected = exam.selectedQuestions || [];
  const subjectIds = [...new Set(selected.map((item) => String(item.subject_id)))];

  const subjects = await Subject.find({ _id: { $in: subjectIds } })
    .select("subjectName questionBank")
    .lean();

  const subjectMap = new Map(subjects.map((item) => [String(item._id), item]));

  return selected.map((item, index) => {
    const subject = subjectMap.get(String(item.subject_id));
    const question = (subject?.questionBank || []).find(
      (entry) => String(entry._id) === String(item.question_id)
    );

    if (!question) {
      throw Object.assign(
        new Error("An exam question is no longer available. Contact your institute administrator."),
        { status: 409 }
      );
    }

    // IMPORTANT: Never include correctAnswer in a student question payload.
    return {
      number: index + 1,
      subjectId: String(item.subject_id),
      subjectName: subject.subjectName || "Subject",
      questionId: String(item.question_id),
      questionText: question.questionText,
      options: [
        { key: "A", text: question.optionA },
        { key: "B", text: question.optionB },
        { key: "C", text: question.optionC },
        { key: "D", text: question.optionD },
      ],
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

      await result.save();
    }

    const questions = await getQuestionPayload(exam);
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
    const scheduledEnd = getScheduledTime(ticket.examDate, ticket.endTime);
    const deadline = result.expiresAt
      ? new Date(Math.min(new Date(result.expiresAt).getTime(), scheduledEnd.getTime()))
      : scheduledEnd;

    if (now > deadline) {
      // Allow the deadline-triggered submission but never extend the timer.
      // Continue to evaluate the answers already sent by the client.
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

    const subjectIds = [...new Set(selected.map((item) => String(item.subject_id)))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } })
      .select("questionBank")
      .lean();

    const questionMap = new Map();
    for (const subject of subjects) {
      for (const question of subject.questionBank || []) {
        questionMap.set(`${String(subject._id)}:${String(question._id)}`, question);
      }
    }

    let obtainedMarks = 0;
    const marksPerQuestion = Number(exam.marksPerQuestion || 0);

    const calculatedAnswers = selected.map((item) => {
      const key = `${String(item.subject_id)}:${String(item.question_id)}`;
      const question = questionMap.get(key);
      if (!question) {
        throw Object.assign(new Error("An exam question no longer exists in the question bank."), { status: 409 });
      }

      const answer = answerMap.get(key) || "";
      const isCorrect = Boolean(answer && answer === question.correctAnswer);
      const marksAwarded = isCorrect ? marksPerQuestion : 0;
      obtainedMarks += marksAwarded;

      return {
        subject_id: item.subject_id,
        question_id: item.question_id,
        answer,
        isCorrect,
        marksAwarded,
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

    return res.json({
      success: true,
      message: "Exam submitted successfully. Your result will be available after the institute publishes it.",
      data: {
        resultId: String(result._id),
        attemptStatus: result.attemptStatus,
        resultStatus: result.resultStatus,
        submittedAt: result.submittedAt,
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
    if (linked.error) return fail(res, linked.error.status, linked.error.message);

    const results = await ExamResult.find({
      student_id: linked.student._id,
      resultStatus: "Published",
    })
      .populate("course_id", "courseTitle")
      .populate("exam_id", "totalQuestions totalMarks")
      .sort({ publishedAt: -1, updatedAt: -1 })
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
    if (linked.error) return fail(res, linked.error.status, linked.error.message);

    if (!validId(req.params.resultId)) return fail(res, 400, "Invalid result ID.");

    const result = await ExamResult.findOne({
      _id: req.params.resultId,
      student_id: linked.student._id,
      resultStatus: "Published",
    })
      .populate("course_id", "courseTitle")
      .populate("exam_id", "totalQuestions totalMarks")
      .lean();

    if (!result) return fail(res, 404, "Published result not found.");

    const selected = result.answers || [];
    const subjectIds = [...new Set(selected.map((item) => String(item.subject_id)))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } })
      .select("subjectName questionBank")
      .lean();

    const questionMap = new Map();
    for (const subject of subjects) {
      for (const question of subject.questionBank || []) {
        questionMap.set(`${String(subject._id)}:${String(question._id)}`, {
          subjectName: subject.subjectName,
          questionText: question.questionText,
          correctAnswer: question.correctAnswer,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        id: String(result._id),
        course: result.course_id?.courseTitle || "Course unavailable",
        totalQuestions: result.totalQuestions,
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        grade: result.grade,
        passStatus: result.passStatus,
        publishedAt: result.publishedAt,
        answers: selected.map((answer, index) => {
          const question = questionMap.get(`${String(answer.subject_id)}:${String(answer.question_id)}`) || {};
          return {
            number: index + 1,
            subjectName: question.subjectName || "Subject",
            questionText: question.questionText || "Question unavailable",
            options: [
              { key: "A", text: question.optionA || "" },
              { key: "B", text: question.optionB || "" },
              { key: "C", text: question.optionC || "" },
              { key: "D", text: question.optionD || "" },
            ],
            selectedAnswer: answer.answer || "",
            correctAnswer: question.correctAnswer || "",
            isCorrect: Boolean(answer.isCorrect),
            marksAwarded: Number(answer.marksAwarded || 0),
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};