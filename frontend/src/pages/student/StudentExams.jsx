
import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiShield,
  FiTarget,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentExams.css";

const dateText = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const timeText = (value) => {
  if (!value) return "—";

  const [hours, minutes] = String(value).split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const clockText = (milliseconds) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const remaining = String(seconds % 60).padStart(2, "0");

  return `${hours}:${minutes}:${remaining}`;
};

const durationText = (milliseconds) => {
  const totalSeconds = Math.floor(
    Math.max(0, Number(milliseconds || 0)) / 1000
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m ${seconds}s`;
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

function ExamStat({ icon: Icon, title, value, note, tone }) {
  return (
    <article className={`se-stat se-stat--${tone}`}>
      <span className="se-stat__icon">
        <Icon />
      </span>

      <div>
        <span className="se-stat__title">{title}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function StatePanel({
  title,
  message,
  onRetry,
  loading = false,
}) {
  return (
    <section className="se-state">
      {loading ? (
        <FiRefreshCw className="se-spin" />
      ) : (
        <FiAlertCircle />
      )}

      <h2>{title}</h2>
      <p>{message}</p>

      {onRetry && (
        <button
          type="button"
          className="se-button se-button--primary"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </section>
  );
}

export default function StudentExams() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ticketId, resultId } = useParams();

  const isInstructions = location.pathname.endsWith("/instructions");
  const isTakingExam = location.pathname.endsWith("/take");
  const isResultDetail = location.pathname.includes("/results/");

  // Main data
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [examInfo, setExamInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [resultDetail, setResultDetail] = useState(null);

  // Exam answers
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [marked, setMarked] = useState([]);
  const [remainingMs, setRemainingMs] = useState(0);

  // Approval popup
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("Pending");
  const [approvalReason, setApprovalReason] = useState("");

  // UI state
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // --------------------------------------------------
  // Load exam list and results
  // --------------------------------------------------

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [examResponse, resultResponse] = await Promise.all([
        studentPortalService.getMyExams(),
        studentPortalService.getMyExamResults(),
      ]);

      setExams(examResponse?.data?.exams || []);
      setResults(resultResponse?.data?.results || []);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load your exams.")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // Load exam instructions
  // --------------------------------------------------

  const loadInstructions = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError("");

    try {
      const response =
        await studentPortalService.getExamInstructions(ticketId);

      setExamInfo(response?.data || null);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load the exam instructions."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // --------------------------------------------------
  // Load / resume an exam attempt
  // --------------------------------------------------

  const loadAttempt = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError("");

    try {
      const response =
        await studentPortalService.startMyExam(ticketId);

      const data = response?.data || {};

      setExamInfo(data);
      setQuestions(data.questions || []);

      const restored = {};

      (data.savedAnswers || []).forEach((item) => {
        restored[item.questionId] = item.answer || "";
      });

      setAnswers(restored);
      setCurrentQuestion(0);
      setMarked([]);

      const expiresAt = new Date(data.expiresAt).getTime();

      setRemainingMs(
        Number.isFinite(expiresAt)
          ? Math.max(0, expiresAt - Date.now())
          : 0
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to start this exam. Check your hall ticket and schedule."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // --------------------------------------------------
  // Load result details
  // --------------------------------------------------

  const loadResult = useCallback(async () => {
    if (!resultId) return;

    setLoading(true);
    setError("");

    try {
      const response =
        await studentPortalService.getMyExamResult(resultId);

      setResultDetail(response?.data || null);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "This result is not available."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  // --------------------------------------------------
  // Route-based loading
  // --------------------------------------------------

  useEffect(() => {
    if (isTakingExam) {
      loadAttempt();
    } else if (isInstructions) {
      loadInstructions();
    } else if (isResultDetail) {
      loadResult();
    } else {
      loadList();
    }
  }, [
    isTakingExam,
    isInstructions,
    isResultDetail,
    loadAttempt,
    loadInstructions,
    loadResult,
    loadList,
  ]);

  // --------------------------------------------------
  // Start exam: fee check + Admin approval
  // --------------------------------------------------

  const handleStartExam = async () => {
    if (busy || !ticketId) return;

    if (examInfo?.feeClearance?.eligible === false) {
      setError(
        examInfo.feeClearance.message ||
          "Your fee is due. Please complete your fee payment before starting the exam."
      );
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      // Resume an already-started attempt.
      if (examInfo?.alreadyStarted) {
        await studentPortalService.startMyExam(ticketId);

        navigate(`/student/exams/${ticketId}/take`);
        return;
      }

      // Check the existing access request first.
      const existing =
        await studentPortalService.getMyExamAccessRequest(ticketId);

      let status = existing?.data?.status || "NotRequested";

      let reason =
        existing?.data?.request?.rejectionReason || "";

      // Create a request only when no Pending or Approved request exists.
      if (status !== "Pending" && status !== "Approved") {
        const submitted =
          await studentPortalService.requestMyExamAccess(ticketId);

        status =
          submitted?.data?.status || "Pending";

        reason =
          submitted?.data?.rejectionReason || "";
      }

      // If already approved, start immediately.
      if (status === "Approved") {
        const instructions =
          await studentPortalService.getExamInstructions(ticketId);

        if (!instructions?.data?.canStart) {
          setError(
            instructions?.data?.feeClearance?.message ||
              "The exam cannot be started at this time."
          );
          return;
        }

        await studentPortalService.startMyExam(ticketId);

        navigate(`/student/exams/${ticketId}/take`);
        return;
      }

      setApprovalStatus(status);
      setApprovalReason(reason);
      setApprovalModalOpen(true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to request exam access. Please try again."
        )
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // Poll Admin approval while popup is open
  // --------------------------------------------------

  useEffect(() => {
    if (
      !approvalModalOpen ||
      approvalStatus !== "Pending" ||
      !ticketId
    ) {
      return undefined;
    }

    let active = true;
    let checking = false;

    const checkApproval = async () => {
      if (checking || !active) return;

      checking = true;

      try {
        const response =
          await studentPortalService.getMyExamAccessRequest(ticketId);

        if (!active) return;

        const data = response?.data || {};
        const status = data.status || "Pending";

        setApprovalStatus(status);

        setApprovalReason(
          data.request?.rejectionReason || ""
        );

        if (status === "Approved") {
          const instructionResponse =
            await studentPortalService.getExamInstructions(ticketId);

          if (!active) return;

          if (!instructionResponse?.data?.canStart) {
            setError(
              instructionResponse?.data?.feeClearance?.message ||
                "Your request is approved, but the exam is not currently available."
            );
            return;
          }

          setBusy(true);

          try {
            await studentPortalService.startMyExam(ticketId);

            if (!active) return;

            setApprovalModalOpen(false);

            navigate(`/student/exams/${ticketId}/take`);
          } catch (err) {
            setError(
              getErrorMessage(
                err,
                "Approval received, but the exam could not be started."
              )
            );
          } finally {
            if (active) setBusy(false);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            getErrorMessage(
              err,
              "Unable to check your approval status."
            )
          );
        }
      } finally {
        checking = false;
      }
    };

    const timer = window.setInterval(checkApproval, 3000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [
    approvalModalOpen,
    approvalStatus,
    ticketId,
    navigate,
  ]);

  // --------------------------------------------------
  // Manual start after approval
  // --------------------------------------------------

  const startApprovedExam = async () => {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response =
        await studentPortalService.getExamInstructions(ticketId);

      if (!response?.data?.canStart) {
        setError(
          response?.data?.feeClearance?.message ||
            "The exam schedule is not currently available."
        );
        return;
      }

      await studentPortalService.startMyExam(ticketId);

      setApprovalModalOpen(false);

      navigate(`/student/exams/${ticketId}/take`);
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to start the exam.")
      );
    } finally {
      setBusy(false);
    }
  };

  // --------------------------------------------------
  // Submit exam
  // --------------------------------------------------

  const submitAttempt = useCallback(
    async (automatic = false) => {
      if (busy) return;

      if (
        !automatic &&
        !window.confirm(
          "Submit your exam now? You cannot restart this attempt."
        )
      ) {
        return;
      }

      setBusy(true);
      setError("");
      setNotice("");

      try {
        const payload = questions.map((question) => ({
          subjectId: question.subjectId,
          questionId: question.questionId,
          answer: answers[question.questionId] || "",
        }));

        const response =
          await studentPortalService.submitMyExam(ticketId, payload);

        const submittedResultId =
          response?.data?.resultId;

        if (!submittedResultId) {
          throw new Error(
            "Exam was submitted, but the result ID was not returned. Please refresh your exam results."
          );
        }

        navigate(
          `/student/exams/results/${submittedResultId}`,
          { replace: true }
        );
      } catch (err) {
        setError(
          getErrorMessage(
            err,
            "Unable to submit the exam. Please contact your institute administrator."
          )
        );
      } finally {
        setBusy(false);
      }
    },
    [answers, busy, navigate, questions, ticketId]
  );

  // --------------------------------------------------
  // Server expiry countdown
  // --------------------------------------------------

  useEffect(() => {
    if (
      !isTakingExam ||
      loading ||
      !examInfo?.expiresAt
    ) {
      return undefined;
    }

    const updateClock = () => {
      const expiry = new Date(examInfo.expiresAt).getTime();

      setRemainingMs(
        Number.isFinite(expiry)
          ? Math.max(0, expiry - Date.now())
          : 0
      );
    };

    updateClock();

    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  }, [
    isTakingExam,
    loading,
    examInfo?.expiresAt,
  ]);

  // Automatically submit when the server expiry time is reached.
  useEffect(() => {
    if (
      isTakingExam &&
      !loading &&
      questions.length > 0 &&
      remainingMs <= 0 &&
      !busy
    ) {
      submitAttempt(true);
    }
  }, [
    isTakingExam,
    loading,
    questions.length,
    remainingMs,
    busy,
    submitAttempt,
  ]);

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------

  if (loading) {
    return (
      <main className="student-exams">
        <StatePanel
          loading
          title="Loading"
          message="Getting your exam information…"
        />
      </main>
    );
  }

  // --------------------------------------------------
  // List error
  // --------------------------------------------------

  if (
    error &&
    !isTakingExam &&
    !isInstructions &&
    !isResultDetail
  ) {
    return (
      <main className="student-exams">
        <StatePanel
          title="Exams unavailable"
          message={error}
          onRetry={loadList}
        />
      </main>
    );
  }

  // --------------------------------------------------
  // Detail page error
  // --------------------------------------------------

  if (
    error &&
    (isTakingExam || isInstructions || isResultDetail) &&
    !examInfo &&
    !resultDetail
  ) {
    return (
      <main className="student-exams">
        <button
          type="button"
          className="se-back"
          onClick={() => navigate("/student/exams")}
        >
          <FiArrowLeft /> Back to Exams
        </button>

        <StatePanel
          title="Unable to open this page"
          message={error}
          onRetry={
            isTakingExam
              ? loadAttempt
              : isInstructions
                ? loadInstructions
                : loadResult
          }
        />
      </main>
    );
  }

  // --------------------------------------------------
  // Exam instructions page
  // --------------------------------------------------

  if (isInstructions && examInfo) {
    const exam = examInfo.exam || {};

    const canStart =
      Boolean(examInfo.canRequestAccess) ||
      Boolean(examInfo.alreadyStarted);

    return (
      <main className="student-exams">
        <button
          type="button"
          className="se-back"
          onClick={() => navigate("/student/exams")}
        >
          <FiArrowLeft /> Back to Exams
        </button>

        <header className="se-heading">
          <span className="se-eyebrow">
            EXAM / BEFORE YOU BEGIN
          </span>

          <h1>Exam Instructions</h1>

          <p>
            Review your schedule and instructions before starting.
          </p>
        </header>

        <section className="se-instruction-layout">
          <article className="se-panel se-exam-info">
            <div className="se-panel-heading">
              <div>
                <span className="se-eyebrow">
                  HALL TICKET {exam.hallTicketNo}
                </span>

                <h2>{exam.course}</h2>
              </div>

              <span
                className={`se-badge se-badge--${String(
                  exam.scheduleStatus
                )
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {exam.scheduleStatus}
              </span>
            </div>

            <div className="se-detail-grid">
              <div>
                <span>Exam date</span>
                <strong>{dateText(exam.examDate)}</strong>
              </div>

              <div>
                <span>Reporting time</span>
                <strong>{timeText(exam.reportingTime)}</strong>
              </div>

              <div>
                <span>Start time</span>
                <strong>{timeText(exam.startTime)}</strong>
              </div>

              <div>
                <span>End time</span>
                <strong>{timeText(exam.endTime)}</strong>
              </div>

              <div>
                <span>Total questions</span>
                <strong>{exam.totalQuestions}</strong>
              </div>

              <div>
                <span>Total marks</span>
                <strong>{exam.totalMarks}</strong>
              </div>
            </div>
          </article>

          <article className="se-panel se-instructions-panel">
            <div className="se-panel-heading">
              <div>
                <span className="se-eyebrow">PLEASE READ</span>
                <h2>Important instructions</h2>
              </div>

              <FiShield />
            </div>

            <ul className="se-instruction-list">
              {(examInfo.instructions || []).map((item, index) => (
                <li key={`${index}-${item}`}>
                  <span>{index + 1}</span>
                  {item}
                </li>
              ))}
            </ul>

            {examInfo.feeClearance?.eligible === false && (
              <div className="se-error" role="alert">
                <FiAlertCircle />
                <span>
                  {examInfo.feeClearance.message ||
                    "Your fee is due. Please complete your fee payment before starting the exam."}
                </span>
              </div>
            )}

            {error && (
              <div className="se-error" role="alert">
                <FiAlertCircle />
                {error}
              </div>
            )}

            <button
              type="button"
              className="se-button se-button--primary se-button--wide"
              disabled={!canStart || busy}
              onClick={handleStartExam}
            >
              {busy
                ? "Processing..."
                : examInfo.alreadyStarted
                  ? "Resume Exam"
                  : "Start Exam"}

              <FiArrowRight />
            </button>

            {!canStart && (
              <p className="se-help">
                {examInfo.feeClearance?.eligible === false
                  ? "Please clear your outstanding course fees before requesting exam access."
                  : "This exam cannot be started right now. Confirm the schedule and hall-ticket status with your institute."}
              </p>
            )}

            {approvalModalOpen && (
              <div className="se-approval-backdrop">
                <section
                  className="se-approval-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="se-approval-title"
                >
                  <div className="se-approval-icon">
                    {approvalStatus === "Approved" ? (
                      <FiCheckCircle />
                    ) : approvalStatus === "Rejected" ? (
                      <FiAlertCircle />
                    ) : (
                      <FiClock />
                    )}
                  </div>

                  <h2 id="se-approval-title">
                    {approvalStatus === "Approved"
                      ? "Exam Access Approved"
                      : approvalStatus === "Rejected"
                        ? "Request Rejected"
                        : "Awaiting Admin Approval"}
                  </h2>

                  <p>
                    {approvalStatus === "Approved"
                      ? "Your exam access has been approved."
                      : approvalStatus === "Rejected"
                        ? approvalReason ||
                          "Please contact your institute administrator."
                        : "Your request has been sent to the institute administrator. This screen will update automatically after approval."}
                  </p>

                  {approvalStatus === "Pending" && (
                    <div className="se-approval-wait">
                      <span />
                      Waiting for administrator...
                    </div>
                  )}

                  {approvalStatus === "Approved" && (
                    <button
                      type="button"
                      className="se-button se-button--primary"
                      onClick={startApprovedExam}
                      disabled={busy}
                    >
                      {busy ? "Starting..." : "Start Exam"}
                      <FiArrowRight />
                    </button>
                  )}

                  {approvalStatus === "Rejected" && (
                    <button
                      type="button"
                      className="se-button se-button--primary"
                      onClick={() => {
                        setApprovalModalOpen(false);
                        setApprovalStatus("Pending");
                        handleStartExam();
                      }}
                      disabled={busy}
                    >
                      Request Again
                    </button>
                  )}

                  <button
                    type="button"
                    className="se-approval-close"
                    onClick={() => setApprovalModalOpen(false)}
                  >
                    Close
                  </button>
                </section>
              </div>
            )}
          </article>
        </section>
      </main>
    );
  }

  // --------------------------------------------------
  // Exam taking page
  // --------------------------------------------------

  if (isTakingExam && examInfo) {
    const exam = examInfo.exam || {};
    const question = questions[currentQuestion];

    if (!questions.length) {
      return (
        <main className="student-exams">
          <StatePanel
            title="No questions available"
            message="The exam does not contain any available questions."
            onRetry={loadAttempt}
          />
        </main>
      );
    }

    const answeredCount = questions.filter((item) =>
      Boolean(answers[item.questionId])
    ).length;

    return (
      <main className="student-exams">
        <header className="se-take-header">
          <div>
            <span className="se-eyebrow">ONLINE EXAM</span>
            <h1>{exam.course || "Exam"}</h1>
            <p>Hall ticket: {exam.hallTicketNo}</p>
          </div>

          <div
            className={`se-timer ${
              remainingMs < 5 * 60 * 1000
                ? "se-timer--warning"
                : ""
            }`}
          >
            <FiClock />
            <span>Time left</span>
            <strong>{clockText(remainingMs)}</strong>
          </div>
        </header>

        {error && (
          <div className="se-error" role="alert">
            {error}
          </div>
        )}

        <div className="se-take-layout">
          <aside className="se-panel se-question-nav">
            <div className="se-panel-heading">
              <h2>Question navigator</h2>
              <span>
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="se-question-grid">
              {questions.map((item, index) => {
                const isAnswered = Boolean(
                  answers[item.questionId]
                );

                const isMarked = marked.includes(
                  item.questionId
                );

                return (
                  <button
                    type="button"
                    key={item.questionId}
                    className={[
                      "se-question-number",
                      index === currentQuestion ? "is-current" : "",
                      isAnswered ? "is-answered" : "",
                      isMarked ? "is-marked" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setCurrentQuestion(index)}
                    aria-label={`Question ${index + 1}${
                      isAnswered ? ", answered" : ", unanswered"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="se-legend">
              <span><i className="is-current" /> Current</span>
              <span><i className="is-answered" /> Answered</span>
              <span><i className="is-marked" /> Review</span>
              <span><i /> Unanswered</span>
            </div>

            <p className="se-help">
              Your attempt is submitted to the server for evaluation.
            </p>
          </aside>

          <section className="se-panel se-question-panel">
            <div className="se-question-meta">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>

              <span>{exam.totalMarks} total marks</span>
            </div>

            <div className="se-progress">
              <span
                style={{
                  width: `${
                    ((currentQuestion + 1) / questions.length) * 100
                  }%`,
                }}
              />
            </div>

            <span className="se-subject-label">
              {question.subjectName}
            </span>

            <h2 className="se-question-text">
              {question.questionText}
            </h2>

            <div className="se-options">
              {(question.options || []).map((option) => (
                <label
                  key={option.key}
                  className={`se-option ${
                    answers[question.questionId] === option.key
                      ? "is-selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={question.questionId}
                    value={option.key}
                    checked={
                      answers[question.questionId] === option.key
                    }
                    onChange={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.questionId]: option.key,
                      }))
                    }
                  />

                  <span className="se-option__key">
                    {option.key}
                  </span>

                  <span>{option.text}</span>
                </label>
              ))}
            </div>

            <div className="se-question-actions">
              <button
                type="button"
                className="se-button se-button--secondary"
                onClick={() =>
                  setMarked((previous) =>
                    previous.includes(question.questionId)
                      ? previous.filter(
                          (id) => id !== question.questionId
                        )
                      : [...previous, question.questionId]
                  )
                }
              >
                <FiTarget />
                {marked.includes(question.questionId)
                  ? "Remove review mark"
                  : "Mark for review"}
              </button>

              <button
                type="button"
                className="se-button se-button--secondary"
                onClick={() =>
                  setAnswers((previous) => ({
                    ...previous,
                    [question.questionId]: "",
                  }))
                }
              >
                Clear answer
              </button>
            </div>

            <div className="se-exam-footer">
              <button
                type="button"
                className="se-button se-button--secondary"
                disabled={currentQuestion === 0 || busy}
                onClick={() =>
                  setCurrentQuestion((value) => value - 1)
                }
              >
                <FiArrowLeft /> Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  className="se-button se-button--primary"
                  disabled={busy}
                  onClick={() =>
                    setCurrentQuestion((value) => value + 1)
                  }
                >
                  Next <FiArrowRight />
                </button>
              ) : (
                <button
                  type="button"
                  className="se-button se-button--primary"
                  disabled={busy}
                  onClick={() => submitAttempt(false)}
                >
                  {busy ? "Submitting…" : "Submit Exam"}
                  <FiCheckCircle />
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Exam result detail page
  // --------------------------------------------------

  if (isResultDetail && resultDetail) {
    const provisional = Boolean(resultDetail.isProvisional);
    const percentage = Number(resultDetail.percentage || 0);
    const passed = resultDetail.passStatus === "Pass";

    return (
      <main className="student-exams se-completion-page">
        <section className="se-completion-hero">
          <div className="se-completion-trophy">
            <FiAward />
          </div>

          <span className="se-eyebrow">EXAM COMPLETION</span>

          <h1>Exam Completed!</h1>

          <p>Your exam has been successfully submitted.</p>

          <span
            className={`se-badge ${
              provisional
                ? "se-badge--upcoming"
                : passed
                  ? "se-badge--pass"
                  : "se-badge--fail"
            }`}
          >
            {provisional
              ? "Provisional Result"
              : resultDetail.passStatus}
          </span>
        </section>

        <section className="se-completion-stats">
          <article className="se-completion-stat">
            <span>Total Questions</span>
            <strong>{resultDetail.totalQuestions}</strong>
          </article>

          <article className="se-completion-stat">
            <span>Answered</span>
            <strong>{resultDetail.answeredCount}</strong>
          </article>

          <article className="se-completion-stat">
            <span>Skipped</span>
            <strong>{resultDetail.skippedCount}</strong>
          </article>

          <article className="se-completion-stat">
            <span>Time Taken</span>
            <strong>
              {durationText(resultDetail.timeTakenMs)}
            </strong>
          </article>
        </section>

        <section className="se-completion-score-grid">
          <article className="se-completion-score se-score-blue">
            <span>Your Score</span>

            <strong>
              {money(resultDetail.obtainedMarks)} /{" "}
              {money(resultDetail.totalMarks)}
            </strong>

            <small>
              {provisional ? "Provisional marks" : "Official marks"}
            </small>
          </article>

          <article className="se-completion-score se-score-green">
            <span>Percentage</span>
            <strong>{percentage.toFixed(2)}%</strong>
            <small>Overall performance</small>
          </article>

          <article className="se-completion-score se-score-orange">
            <span>Grade</span>
            <strong>{resultDetail.grade || "—"}</strong>
            <small>{resultDetail.passStatus || "Result pending"}</small>
          </article>
        </section>

        <section className="se-completion-message">
          <FiCheckCircle />

          <div>
            <strong>
              {provisional
                ? "Your exam has been submitted successfully!"
                : passed
                  ? "Great effort!"
                  : "Keep learning and improving!"}
            </strong>

            <p>
              {provisional
                ? "Your marks and percentage are available now. The institute may verify or correct marks before publishing the official result."
                : "Your official exam result is available."}
            </p>
          </div>
        </section>

        {provisional ? (
          <section className="se-provisional-note">
            <FiShield />

            <div>
              <strong>Awaiting institute verification</strong>

              <p>
                Your current score is provisional. The institute can
                review your answer sheet and update marks before
                publishing the final result.
              </p>
            </div>
          </section>
        ) : (
          <section className="se-panel se-answer-sheet">
            <div className="se-panel-heading">
              <div>
                <h2>Answer sheet</h2>
                <p>
                  Review your submitted answers and correct options.
                </p>
              </div>

              <span>
                {resultDetail.answers?.length || 0} questions
              </span>
            </div>

            {(resultDetail.answers || []).map((answer) => (
              <article
                className="se-review-question"
                key={`${answer.number}-${answer.questionText}`}
              >
                <div className="se-review-heading">
                  <strong>
                    Q{answer.number}. {answer.questionText}
                  </strong>

                  <span
                    className={`se-badge ${
                      answer.isCorrect
                        ? "se-badge--pass"
                        : "se-badge--fail"
                    }`}
                  >
                    {answer.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>

                <div className="se-review-options">
                  {(answer.options || []).map((option) => (
                    <div
                      key={option.key}
                      className={[
                        "se-review-option",
                        option.key === answer.correctAnswer
                          ? "is-correct"
                          : "",
                        option.key === answer.selectedAnswer &&
                        !answer.isCorrect
                          ? "is-wrong"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <strong>{option.key}</strong> {option.text}

                      {option.key === answer.correctAnswer &&
                        " — Correct answer"}

                      {option.key === answer.selectedAnswer &&
                        " — Your answer"}
                    </div>
                  ))}
                </div>

                <small>
                  Marks awarded: {money(answer.marksAwarded)}
                </small>
              </article>
            ))}
          </section>
        )}

        <div className="se-completion-actions">
          <button
            type="button"
            className="se-button se-button--primary"
            onClick={() => navigate("/student/exams")}
          >
            <FiArrowLeft /> Return to Exams &amp; Results
          </button>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // Exam list page
  // --------------------------------------------------

  const upcoming = exams.filter(
    (item) =>
      ["Upcoming", "In progress"].includes(item.scheduleStatus) &&
      item.attemptStatus !== "Submitted" &&
      item.resultStatus !== "Published"
  );

  const previous = exams.filter(
    (item) =>
      !upcoming.some(
        (upcomingItem) =>
          upcomingItem.ticketId === item.ticketId
      )
  );

  const pendingResults = results.filter(
    (item) => item.isProvisional
  ).length;

  const publishedResults = results.filter(
    (item) => item.resultStatus === "Published"
  ).length;

  return (
    <main className="student-exams">
      <header className="se-page-header">
        <div>
          <span className="se-eyebrow">ASSESSMENT CENTRE</span>

          <h1>Exams &amp; Results</h1>

          <p>
            View your exam schedule, start an available exam, and
            review your results.
          </p>
        </div>

        <button
          type="button"
          className="se-button se-button--secondary"
          onClick={loadList}
          disabled={loading}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {notice && (
        <div className="se-success" role="status">
          <FiCheckCircle /> {notice}
        </div>
      )}

      {error && (
        <div className="se-error" role="alert">
          <FiAlertCircle /> {error}
        </div>
      )}

      <section className="se-stat-grid">
        <ExamStat
          icon={FiCalendar}
          title="Upcoming Exams"
          value={upcoming.length}
          note="Scheduled for you"
          tone="blue"
        />

        <ExamStat
          icon={FiClock}
          title="In Progress"
          value={
            exams.filter(
              (item) => item.attemptStatus === "InProgress"
            ).length
          }
          note="Active attempts"
          tone="orange"
        />

        <ExamStat
          icon={FiFileText}
          title="Submitted"
          value={
            exams.filter(
              (item) => item.attemptStatus === "Submitted"
            ).length
          }
          note={`${pendingResults} awaiting verification`}
          tone="purple"
        />

        <ExamStat
          icon={FiAward}
          title="Published Results"
          value={publishedResults}
          note="Official results"
          tone="green"
        />
      </section>

      <section className="se-panel se-list-panel">
        <div className="se-tabs">
          <button
            type="button"
            className={tab === "upcoming" ? "is-active" : ""}
            onClick={() => setTab("upcoming")}
          >
            Upcoming &amp; Available
            <span>{upcoming.length}</span>
          </button>

          <button
            type="button"
            className={tab === "previous" ? "is-active" : ""}
            onClick={() => setTab("previous")}
          >
            Past &amp; Submitted
            <span>{previous.length}</span>
          </button>

          <button
            type="button"
            className={tab === "results" ? "is-active" : ""}
            onClick={() => setTab("results")}
          >
            Results
            <span>{results.length}</span>
          </button>
        </div>

        {tab === "results" ? (
          results.length ? (
            <div className="se-result-list">
              {results.map((result) => (
                <article
                  className="se-result-row"
                  key={result.id}
                >
                  <div className="se-list-icon se-list-icon--purple">
                    <FiAward />
                  </div>

                  <div className="se-row-main">
                    <strong>{result.course}</strong>

                    <span>
                      {result.isProvisional
                        ? `Submitted ${dateText(result.submittedAt)} · Provisional`
                        : `Published ${dateText(result.publishedAt)} · Official`}
                      {" · "}Grade {result.grade || "—"}
                    </span>
                  </div>

                  <div className="se-row-score">
                    <strong>
                      {money(result.obtainedMarks)} /{" "}
                      {money(result.totalMarks)}
                    </strong>

                    <span>
                      {Number(result.percentage || 0).toFixed(2)}% ·{" "}
                      {result.passStatus || "Pending"}
                    </span>
                  </div>

                  <Link
                    className="se-button se-button--secondary"
                    to={`/student/exams/results/${result.id}`}
                  >
                    View Result <FiArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="se-empty">
              <FiAward />
              <h2>No results available yet</h2>
              <p>
                Your submitted exam results will appear here.
              </p>
            </div>
          )
        ) : (
          (() => {
            const list =
              tab === "upcoming" ? upcoming : previous;

            return list.length ? (
              <div className="se-exam-list">
                {list.map((exam) => {
                  const canOpen =
                    exam.attemptStatus !== "Submitted" &&
                    exam.resultStatus !== "Published";

                  return (
                    <article
                      className="se-exam-row"
                      key={exam.ticketId}
                    >
                      <div className="se-list-icon">
                        <FiFileText />
                      </div>

                      <div className="se-row-main">
                        <strong>{exam.course}</strong>

                        <span>
                          Hall ticket: {exam.hallTicketNo}
                        </span>

                        <span>
                          {dateText(exam.examDate)} ·{" "}
                          {timeText(exam.startTime)} –{" "}
                          {timeText(exam.endTime)}
                        </span>

                        <span>
                          {exam.totalQuestions} questions ·{" "}
                          {exam.totalMarks} marks
                        </span>
                      </div>

                      <div className="se-row-status">
                        <span
                          className={`se-badge se-badge--${String(
                            exam.scheduleStatus
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {exam.scheduleStatus}
                        </span>

                        {exam.attemptStatus === "Submitted" && (
                          <small>
                            Submitted ·{" "}
                            {exam.resultStatus === "Published"
                              ? "Result published"
                              : "Awaiting verification"}
                          </small>
                        )}
                      </div>

                      {canOpen ? (
                        <Link
                          className="se-button se-button--primary"
                          to={`/student/exams/${exam.ticketId}/instructions`}
                        >
                          {exam.attemptStatus === "InProgress"
                            ? "Resume Exam"
                            : "View Instructions"}
                          <FiArrowRight />
                        </Link>
                      ) : (
                        <span className="se-muted">
                          Attempt submitted
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="se-empty">
                <FiCalendar />

                <h2>
                  {tab === "upcoming"
                    ? "No upcoming exams"
                    : "No past exams"}
                </h2>

                <p>
                  When an exam is assigned to your active hall
                  ticket, it will appear here.
                </p>
              </div>
            );
          })()
        )}
      </section>

      <p className="se-security-note">
        Exam access is linked to your account and active hall ticket.
        Provisional results are subject to institute verification.
      </p>
    </main>
  );
}
