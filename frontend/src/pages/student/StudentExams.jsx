import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { getAssetUrl } from "../../utils/assetUrl";
import { GoDotFill } from "react-icons/go";

import {
   FiXCircle,
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
    FiEye,
     FiBarChart2,
FiLayers,
FiPlay,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

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
  getApiErrorMessage(error) ||
  fallback ||
  "Something went wrong. Please try again.";

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
  // !!!!! INSERTION START: INSTRUCTIONS LIVE CLOCK STATE !!!!!
  const [instructionNow, setInstructionNow] = useState(() => Date.now());
  // !!!!! INSERTION END: INSTRUCTIONS LIVE CLOCK STATE !!!!!


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

  const autoSubmitAttempted = useRef(false);

  useEffect(() => {
    autoSubmitAttempted.current = false;
  }, [ticketId]);

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
      const message = getErrorMessage(err, "Unable to load your exams.");
      setError(message);
      notification.error(message);
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
      const message = getErrorMessage(
        err,
        "Unable to load the exam instructions."
      );
      setError(message);
      notification.error(message);
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
      const message = getErrorMessage(
        err,
        "Unable to start this exam. Check your hall ticket and schedule."
      );
      setError(message);
      notification.error(message);
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
      const message = getErrorMessage(err, "This result is not available.");
      setError(message);
      notification.error(message);
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


  // !!!!! INSERTION START: LIVE CLOCK FOR EXAM INSTRUCTIONS !!!!!
  useEffect(() => {
    if (!isInstructions) {
      return undefined;
    }

    // Synchronize immediately whenever the instructions page opens.
    setInstructionNow(Date.now());

    const timer = window.setInterval(() => {
      setInstructionNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isInstructions, ticketId]);
  // !!!!! INSERTION END: LIVE CLOCK FOR EXAM INSTRUCTIONS !!!!!


  // --------------------------------------------------
  // Start exam: fee check + Admin approval
  // --------------------------------------------------

  const handleStartExam = async () => {
    if (busy || !ticketId) return;

    if (examInfo?.feeClearance?.eligible === false) {
      const message =
        examInfo.feeClearance.message ||
        "Your fee is due. Please complete your fee payment before starting the exam.";
      setError(message);
      notification.warning(message);
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
        notification.success("Exam access request sent to your administrator.");
      }

      // If already approved, start immediately.
      if (status === "Approved") {
        const instructions =
          await studentPortalService.getExamInstructions(ticketId);

        if (!instructions?.data?.canStart) {
          const message =
            instructions?.data?.feeClearance?.message ||
            "The exam cannot be started at this time.";
          setError(message);
          notification.warning(message);
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
      const message = getErrorMessage(
        err,
        "Unable to request exam access. Please try again."
      );
      setError(message);
      notification.error(message);
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
            const message =
              instructionResponse?.data?.feeClearance?.message ||
              "Your request is approved, but the exam is not currently available.";
            setError(message);
            notification.warning(message, { id: "student-exam-approval-status" });
            return;
          }

          setBusy(true);

          try {
            await studentPortalService.startMyExam(ticketId);

            if (!active) return;

            setApprovalModalOpen(false);
            notification.success("Your exam access has been approved.");

            navigate(`/student/exams/${ticketId}/take`);
          } catch (err) {
            const message = getErrorMessage(
              err,
              "Approval received, but the exam could not be started."
            );
            setError(message);
            notification.error(message, { id: "student-exam-approval-error" });
          } finally {
            if (active) setBusy(false);
          }
        }
      } catch (err) {
        if (active) {
          const message = getErrorMessage(
            err,
            "Unable to check your approval status."
          );
          setError(message);
          notification.error(message, { id: "student-exam-approval-error" });
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
        const message =
          response?.data?.feeClearance?.message ||
          "The exam schedule is not currently available.";
        setError(message);
        notification.warning(message);
        return;
      }

      await studentPortalService.startMyExam(ticketId);

      setApprovalModalOpen(false);

      navigate(`/student/exams/${ticketId}/take`);
    } catch (err) {
      const message = getErrorMessage(err, "Unable to start the exam.");
      setError(message);
      notification.error(message);
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

      if (!automatic) {
        const confirmed = await notification.confirm({
          title: "Submit Exam?",
          text: "Are you sure you want to submit your exam? You cannot restart this attempt after submission.",
          icon: "warning",
          confirmText: "Yes, Submit Exam",
          cancelText: "Continue Exam",
          confirmButtonColor: "#2563eb",
        });

        if (!confirmed) return;
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

        notification.success(
          automatic
            ? "Your exam time has ended. Your exam was submitted automatically."
            : "Exam submitted successfully."
        );

        navigate(
          `/student/exams/results/${submittedResultId}`,
          { replace: true }
        );
      } catch (err) {
        const message = getErrorMessage(
          err,
          "Unable to submit the exam. Please contact your institute administrator."
        );
        setError(message);
        notification.error(message);
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
        !busy &&
        !autoSubmitAttempted.current
    ) {
        autoSubmitAttempted.current = true;
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

  // if (isInstructions && examInfo) {
  //   const exam = examInfo.exam || {};

  //   const canStart =
  //     Boolean(examInfo.canRequestAccess) ||
  //     Boolean(examInfo.alreadyStarted);

  // !!!!! INSERTION START: EXAM INSTRUCTIONS COUNTDOWN CALCULATION !!!!!
  if (isInstructions && examInfo) {
    const exam = examInfo.exam || {};

    const canStart =
      Boolean(examInfo.canRequestAccess) ||
      Boolean(examInfo.alreadyStarted);

    const startsAtMs = examInfo.startsAt
      ? new Date(examInfo.startsAt).getTime()
      : NaN;

    const endsAtMs = examInfo.endsAt
      ? new Date(examInfo.endsAt).getTime()
      : NaN;

    const validExamSchedule =
      Number.isFinite(startsAtMs) &&
      Number.isFinite(endsAtMs) &&
      endsAtMs > startsAtMs;

    let countdownStatus = "unavailable";
    let countdownRemainingMs = 0;

    if (validExamSchedule) {
      if (instructionNow < startsAtMs) {
        countdownStatus = "upcoming";
        countdownRemainingMs = startsAtMs - instructionNow;
      } else if (instructionNow < endsAtMs) {
        countdownStatus = "running";
        countdownRemainingMs = endsAtMs - instructionNow;
      } else {
        countdownStatus = "ended";
      }
    }
  // !!!!! INSERTION END: EXAM INSTRUCTIONS COUNTDOWN CALCULATION !!!!!

    return (
     <main className="student-exams student-exam-instructions">

<div class="page-header"><div><h1>Exam Instructions</h1>
<p>Review your schedule and instructions before starting.</p>
</div>
 <button
    type="button"
    className="themebtn"
    onClick={() => navigate("/student/exams")}
  >
    <FiArrowLeft /> Back to Exams
  </button>
  </div>

 

  {/* Hero Banner */}
  {/* <section className="se-instruction-hero">
    <div className="se-hero-content">
      <span className="se-hero-label">
        <FiAward /> EXAM / BEFORE YOU BEGIN
      </span>

      <h1>Exam Instructions</h1>
      <p>Review your schedule and instructions before starting.</p>
    </div>

    <div className="se-hero-art" aria-hidden="true">
      <div className="se-hero-books">📚</div>
      <div className="se-hero-paper">
        <FiFileText />
        <strong>EXAM</strong>
        <span><FiCheckCircle /> Ready</span>
        <span><FiCheckCircle /> Focus</span>
      </div>
      <div className="se-hero-hourglass">⌛</div>
      <div className="se-hero-student">🎓</div>
    </div>
  </section> */}

  {/* Main Two Column Layout */}
  <section className="se-instruction-layout">

    {/* Left Column */}
    <div className="se-instruction-left">

      {/* Hall Ticket */}
      <article className="se-hall-ticket common-card">
        {/* <div className="se-hall-icon">
          <FiAward />
        </div> */}

        <div className="se-hall-content">
          <span>HALL TICKET</span>
          <h2>{exam.hallTicketNo}</h2>
          <p>{exam.course}</p>
        </div>

        <span
          className={`se-badge se-badge--${String(
            exam.scheduleStatus
          ).toLowerCase().replace(/\s+/g, "-")}`}
        >
          {exam.scheduleStatus}
        </span>
      </article>

      {/* Exam Schedule */}
      <div className="se-schedule-heading">
       
        <h2>Exam Schedule &amp; Details</h2>
        <span />
      </div>

      <div className="se-detail-grid">

        <article className="se-detail-card common-card se-detail-card--purple">
          <div className="se-detail-icon">
            <FiCalendar />
          </div>
          <span>Exam Date</span>
          <strong>{dateText(exam.examDate)}</strong>
        </article>

        <article className="se-detail-card common-card se-detail-card--blue">
          <div className="se-detail-icon">
            <FiClock />
          </div>
          <span>Reporting Time</span>
          <strong>{timeText(exam.reportingTime)}</strong>
        </article>

        <article className="se-detail-card common-card se-detail-card--green">
          <div className="se-detail-icon">
            <FiPlay />
          </div>
          <span>Start Time</span>
          <strong>{timeText(exam.startTime)}</strong>
        </article>

        <article className="se-detail-card common-card se-detail-card--red">
          <div className="se-detail-icon">
            <FiClock />
          </div>
          <span>End Time</span>
          <strong>{timeText(exam.endTime)}</strong>
        </article>

        <article className="se-detail-card common-card se-detail-card--violet">
          <div className="se-detail-icon">
            <FiFileText />
          </div>
          <span>Total Questions</span>
          <strong>{exam.totalQuestions}</strong>
        </article>

        <article className="se-detail-card common-card se-detail-card--orange">
          <div className="se-detail-icon">
            <FiAward />
          </div>
          <span>Total Marks</span>
          <strong>{exam.totalMarks}</strong>
        </article>

            </div>

      {/* !!!!! INSERTION START: LIVE EXAM COUNTDOWN CARD !!!!! */}
      <article
        className={`se-countdown-card common-card se-countdown-card--${countdownStatus}`}
        aria-live="off"
      >
        <div className="se-countdown-card__icon">
          <FiClock />
        </div>

        <div className="se-countdown-card__content">
          <span className="se-countdown-card__label">
            {countdownStatus === "upcoming"
              ? "EXAM STARTS IN"
              : countdownStatus === "running"
                ? "TIME REMAINING"
                : countdownStatus === "ended"
                  ? "EXAM WINDOW"
                  : "EXAM SCHEDULE"}
          </span>

          <h3>
            {countdownStatus === "upcoming"
              ? "Your exam will start soon"
              : countdownStatus === "running"
                ? "Your exam is currently running"
                : countdownStatus === "ended"
                  ? "Exam time has ended"
                  : "Schedule unavailable"}
          </h3>

          <strong className="se-countdown-card__timer">
            {countdownStatus === "ended"
              ? "00:00:00"
              : countdownStatus === "unavailable"
                ? "--:--:--"
                : clockText(countdownRemainingMs)}
          </strong>

          <p>
            {countdownStatus === "upcoming"
              ? "The countdown is based on your scheduled exam start time."
              : countdownStatus === "running"
                ? "Please complete and submit your exam before the scheduled end time."
                : countdownStatus === "ended"
                  ? "The scheduled examination window is over. Contact your institute if you need assistance."
                  : "Please contact your institute administrator to confirm the exam schedule."}
          </p>
        </div>
      </article>
      {/* !!!!! INSERTION END: LIVE EXAM COUNTDOWN CARD !!!!! */}

    </div>

    {/* Right Column */}

    
    <article className="se-instructions-panel  nospace" >

      <div className="common-card">
        <div class="panel-header"><div><h3>EXAM ACCESS</h3>
      </div><div class="sc-recommendations__heading"></div></div>
        <div className="cardbody">
           <button
        type="button"
        className="themebtn"
        disabled={!canStart || busy}
        onClick={handleStartExam}
      >
        <span className="se-start-icon">
          <FiPlay />
        </span>

        {busy
          ? "Processing..."
          : examInfo.alreadyStarted
            ? "Resume Exam"
            : "Start Exam"}

       
      </button>

       {examInfo.feeClearance?.eligible === false && (
        <div className="se-fee-warning" role="alert">
          <div className="se-fee-warning-icon">
            <FiAlertCircle />
          </div>

          <div>
            <strong>
              Your course fee is due. Outstanding amount:{" "}
              {examInfo.feeClearance.message || "Please clear your pending fees."}
            </strong>
            
          </div>
        </div>
      )}

     

      {!canStart && (
        <p className="se-start-help">
          <FiAlertCircle />
          {examInfo.feeClearance?.eligible === false
            ? "Please clear your outstanding course fees before requesting exam access."
            : "This exam cannot be started right now. Confirm the schedule and hall-ticket status with your institute."}
        </p>
      )}
      </div>
    </div>

        <div className="common-card">
          <div class="panel-header"><div><h3>Important Instructions </h3>
      </div><div class="sc-recommendations__heading"></div></div>


          <div className="cardbody">
            <ul className="se-instruction-list">
        {(examInfo.instructions || []).map((item, index) => (
          <li key={`${index}-${item}`}>
            <span className="se-instruction-number"> <GoDotFill />
</span>
            <p>{item}</p>
          </li>
        ))}
      </ul>

     
          </div>
        </div>

    </article>
  </section>

  {/* Approval Modal */}
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
      
<main className="student-exams se-exam-page">

  {/* Exam Hero */}
  {/* <section className="se-exam-hero">
    <div className="se-exam-hero-content">
      <span className="se-exam-label">
        <FiMonitor /> ONLINE EXAM
      </span>

      <h1>{exam.course || "Exam"}</h1>
      <p>Hall ticket: {exam.hallTicketNo}</p>
    </div>

    <div className="se-exam-hero-art">
      <div className="se-laptop-art">
        <div className="se-laptop-screen">
          <FiMonitor />
          <strong>EXAM</strong>
          <span>Focus. Learn. Achieve.</span>
        </div>
        <div className="se-laptop-base" />
      </div>
      <div className="se-hero-orb se-hero-orb--one" />
      <div className="se-hero-orb se-hero-orb--two" />
    </div>
  </section> */}

  {/* Exam Overview */}
  <section className="se-exam-overview common-card">

    <article className="se-overview-item">
      <div className="se-overview-icon se-overview-icon--purple">
        <FiFileText />
      </div>
      <div className="se-overview-info">
        <span>Total Questions</span>
        <strong>{questions.length}</strong>
      </div>
    </article>

    <article className="se-overview-item">
      <div className="se-overview-icon se-overview-icon--blue">
        <FiLayers />
      </div>
      <div className="se-overview-info">
        <span>Total Marks</span>
        <strong>{exam.totalMarks}</strong>
      </div>
    </article>

    <article className="se-overview-item se-overview-timer">
      <div className="se-overview-icon se-overview-icon--pink">
        <FiClock />
      </div>
      <div className="se-overview-info">
        <span>Time Left</span>
        <strong
          className={
            remainingMs < 5 * 60 * 1000
              ? "se-time-warning"
              : ""
          }
        >
          {clockText(remainingMs)}
        </strong>
      </div>
    </article>

    <article className="se-overview-progress">
      <div className="se-overview-progress-heading">
        <strong>Overall Progress</strong>
        <span>
          Question {currentQuestion + 1} of {questions.length}
        </span>
      </div>
      <div className="se-progress se-progress--overview">
        <span
          style={{
            width: `${
              questions.length
                ? ((currentQuestion + 1) / questions.length) * 100
                : 0
            }%`,
          }}
        />
      </div>
    </article>

  </section>

  {/* Main Exam Layout */}
  <div className="se-take-layout">

    {/* Question Navigator */}
    <aside className="se-panel se-question-nav common-card">

      {/* <div className="se-panel-heading">
        <div className="se-nav-title">
          <FiGrid />
          <h2>Question Navigator</h2>
        </div>
        <span>
          {answeredCount}/{questions.length}
        </span>
      </div> */}

      <div class="panel-header">
        <div>
          <h3>Question Navigator </h3>
          </div>
         <span>
          {answeredCount}/{questions.length}
        </span>
          </div>



        <div className="cardbody">
           <div className="se-question-grid">
        {questions.map((item, index) => {
          const isAnswered = Boolean(answers[item.questionId]);
          const isMarked = marked.includes(item.questionId);

          return (
            <button
              type="button"
              key={item.questionId}
              className={[
                "se-question-number",
                index === currentQuestion ? "is-current" : "",
                isAnswered ? "is-answered" : "",
                isMarked ? "is-marked" : "",
              ].filter(Boolean).join(" ")}
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

     
        </div>

    </aside>

    {/* Question Panel */}
    <section className="se-panel se-question-panel common-card">

     
        <div className="cardbody">
           <div className="se-question-content">
        <h2 className="se-question-text">
          {question.questionText}
        </h2>
      </div>

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

            <span className="se-option__radio" />
            <span className="se-option__key">{option.key}</span>
            <span className="se-option__text">{option.text}</span>
          </label>
        ))}
      </div>

     
        </div>

      <div className="se-exam-footer">
 <button
          type="button"
          className="themebtn themebtnline" 
          onClick={() =>
            setAnswers((previous) => ({
              ...previous,
              [question.questionId]: "",
            }))
          }
        >
          <FiRefreshCw /> 
          Clear answer
        </button> 

<button
          type="button" 
          className={`themebtn themebtnline se-button--secondary ${
            marked.includes(question.questionId)
              ? "is-review-active"
              : ""
          }`}
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
          className="themebtn"
          disabled={currentQuestion === 0 || busy}
          onClick={() =>
            setCurrentQuestion((value) => value - 1)
          }
        >
          Previous
        </button>

        {currentQuestion < questions.length - 1 ? (
          <button
            type="button"
            className="themebtn"
            disabled={busy}
            onClick={() =>
              setCurrentQuestion((value) => value + 1)
            }
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="themebtn"
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

  {/* Page Heading */}
  {/* <div className="se-result-page-heading">
    <div>
      <span className="se-result-eyebrow">STUDENT PERFORMANCE REPORT</span>
      <h1>Exam Result Details</h1>
    </div>
    <div className="se-result-heading-icon">
      <FiAward />
    </div>
  </div> */}


<div class="page-header"><div><h1>Exam Result Details</h1>
      <p>Your complete exam performance report with detailed analysis.</p>

</div>
  <button
      type="button"
      className="themebtn"
      onClick={() => navigate("/student/exams")}
    >
      <FiArrowLeft /> Back to Results
    </button>
</div>


  {/* Result Hero */}
  {/* <section className="se-completion-hero">
    <div className="se-completion-hero-content">
      <div className="se-completion-trophy">
        <FiAward />
      </div>

      <div className="se-completion-hero-text">
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
      </div>
    </div>

    <div className="se-hero-decoration">
      <div className="se-hero-circle se-hero-circle--one"></div>
      <div className="se-hero-circle se-hero-circle--two"></div>
      <FiAward />
    </div>
  </section> */}

  {/* Performance Stats */}
  <section className="se-completion-stats">
    <article className="se-completion-stat">
      <div className="se-stat-icon se-stat-icon--blue">
        <FiFileText />
      </div>
      <div>
        <span>Total Questions</span>
        <strong>{resultDetail.totalQuestions}</strong>
      </div>
    </article>

    <article className="se-completion-stat">
      <div className="se-stat-icon se-stat-icon--green">
        <FiCheckCircle />
      </div>
      <div>
        <span>Answered</span>
        <strong>{resultDetail.answeredCount}</strong>
      </div>
    </article>

    <article className="se-completion-stat">
      <div className="se-stat-icon se-stat-icon--red">
        <FiXCircle />
      </div>
      <div>
        <span>Skipped</span>
        <strong>{resultDetail.skippedCount}</strong>
      </div>
    </article>

    <article className="se-completion-stat">
      <div className="se-stat-icon se-stat-icon--orange">
        <FiClock />
      </div>
      <div>
        <span>Time Taken</span>
        <strong>{durationText(resultDetail.timeTakenMs)}</strong>
      </div>
    </article>
  </section>

  {/* Score Summary */}
  <section className="se-completion-score-grid">
    <article className="se-completion-score se-score-blue">
      <div className="se-score-icon"><FiAward /></div>
      <div>
        <span>Your Score</span>
        <strong>
          {money(resultDetail.obtainedMarks)} / {money(resultDetail.totalMarks)}
        </strong>
        <small>{provisional ? "Provisional marks" : "Official marks"}</small>
      </div>
    </article>

    <article className="se-completion-score se-score-green">
      <div className="se-score-icon"><FiBarChart2 /></div>
      <div>
        <span>Percentage</span>
        <strong>{percentage.toFixed(2)}%</strong>
        <small>Overall performance</small>
      </div>
    </article>

    <article className="se-completion-score se-score-orange">
      <div className="se-score-icon"><FiAward /></div>
      <div>
        <span>Grade</span>
        <strong>{resultDetail.grade || "—"}</strong>
        <small>{resultDetail.passStatus || "Result pending"}</small>
      </div>
    </article>

    <article className="se-completion-score se-score-purple">
      <div className="se-score-icon"><FiCheckCircle /></div>
      <div>
        <span>Result Status</span>
        <strong>{provisional ? "Pending" : resultDetail.passStatus || "—"}</strong>
        <small>{provisional ? "Awaiting verification" : "Final result"}</small>
      </div>
    </article>
  </section>

  {/* Completion Message */}
  <section className="se-completion-message">
    <div className="se-message-icon">
      {provisional ? <FiClock /> : <FiCheckCircle />}
    </div>

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
          Your current score is provisional. The institute can review
          your answer sheet and update marks before publishing the final result.
        </p>
      </div>
    </section>
  ) : (
    <section className=" common-card">

      

      <div class="panel-header">
        <div><h3>Question-wise Review</h3><p>Review your submitted answers and correct options.</p>
        </div>
        <span className="se-question-count">
          {resultDetail.answers?.length || 0} Questions
        </span>
      </div>


     <div className="cardbody">
       <div className="se-review-list">
        {(resultDetail.answers || []).map((answer) => (
          <article
            className="se-review-question"
            key={`${answer.number}-${answer.questionText}`}
          >
            <div className="se-review-heading">
              <div className="se-question-title">
                <span className="se-question-number">
                  Q{answer.number}
                </span>
                <strong>{answer.questionText}</strong>
              </div>

              <span
                className={`se-badge ${
                  answer.isCorrect
                    ? "se-badge--pass"
                    : "se-badge--fail"
                }`}
              >
                {answer.isCorrect ? <FiCheckCircle /> : <FiXCircle />}
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
                  ].filter(Boolean).join(" ")}
                >
                  <strong>{option.key}</strong>
                  <span>{option.text}</span>

                  {/* {option.key === answer.correctAnswer && (
                    <small>Correct Answer</small>
                  )} */}

                  {option.key === answer.selectedAnswer && (
                    <small>Your Answer</small>
                  )}
                </div>
              ))}
            </div>

            <div className="se-question-marks">
              <span>Marks awarded</span>
              <strong>{money(answer.marksAwarded)}</strong>
            </div>
          </article>
        ))}
      </div>
     </div>

    </section>
  )}

  

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
<div className="page-header">
  <div>
    <h1>Exams & Results</h1>
     <p>
            View your exam schedule, start an available exam, and
            review your results.
          </p>
    </div>
    </div>


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

      {/* <section className="se-stat-grid">
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
      </section> */}

<div className="student-profile__tabs">
          <button
            type="button"
            className={tab === "upcoming" ? "active" : ""}
            onClick={() => setTab("upcoming")}
          >
            Upcoming &amp; Available
            <span>{upcoming.length}</span>
          </button>

          <button
            type="button"
            className={tab === "previous" ? "active" : ""}
            onClick={() => setTab("previous")}
          >
            Past &amp; Submitted
            <span>{previous.length}</span>
          </button>

          <button
            type="button"
            className={tab === "results" ? "active" : ""}
            onClick={() => setTab("results")}
          >
            Results
            <span>{results.length}</span>
          </button>
        </div>

      <section className="se-panel se-list-panel">


        {tab === "results" ? (
          results.length ? (
           
<div className="se-result-list">
  {results.map((result) => {
    const passStatus = String(result.passStatus || "Pending").toLowerCase();

    const isPass = passStatus === "pass";
    const isFail = passStatus === "fail";

    return (
      <article
        className="se-result-row common-card"
        key={result.id}
      >
        {/* Course Image */}
        <div className="se-result-image">
          {result.courseImage ? (
            <img
              src={getAssetUrl(result.courseImage)}
              alt={result.course}
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <FiAward />
          )}
        </div>

        {/* Course Details */}
        <div className="se-result-info">
          <strong>{result.course}</strong>

          <span className="se-result-label">
            {result.isProvisional
              ? `Provisional Result · Submitted ${dateText(result.submittedAt)}`
              : `Official Result · Published ${dateText(result.publishedAt)}`}
          </span>

          {/* <div className="se-result-meta">
            <span>
              <FiCalendar />
              {dateText(
                result.isProvisional
                  ? result.submittedAt
                  : result.publishedAt
              )}
            </span>

            <span className="se-result-divider">|</span>

            <span>
              <FiFileText />
              {money(result.totalMarks)} Marks
            </span>
          </div> */}
           <div className="se-result-action">
          <Link
            className="themebtn smalllbtn"
            to={`/student/exams/results/${result.id}`}
          >
            
            View Detailed
           
          </Link>
        </div>
        </div>

        {/* Obtained Marks */}
        <div className="se-result-marks">
          <FiAward className="se-result-marks__icon" />

          <strong>
            {money(result.obtainedMarks)} / {money(result.totalMarks)}
          </strong>

          <span>Total Marks</span>
        </div>

        {/* Percentage */}
        <div className="se-result-percentage">
          <FiBarChart2 className="se-result-percentage__icon" />

          <strong>
            {Number(result.percentage || 0).toFixed(2)}%
          </strong>

          <span>Percentage</span>
        </div>

        {/* Grade and Pass Status */}
        <div className="se-result-grade">
          <div className={`se-grade-badge ${
            isPass ? "se-grade-badge--pass" :
            isFail ? "se-grade-badge--fail" :
            "se-grade-badge--pending"
          }`}>
            <FiAward />
            Grade {result.grade || "—"}
          </div>

          <div className={`se-pass-status ${
            isPass ? "se-pass-status--pass" :
            isFail ? "se-pass-status--fail" :
            "se-pass-status--pending"
          }`}>
            {isPass ? <FiCheckCircle /> :
             isFail ? <FiXCircle /> :
             <FiClock />}

            {result.passStatus || "Pending"}
          </div>
        </div>

        {/* View Result */}
        {/* <div className="se-result-action">
          <Link
            className="themebtn"
            to={`/student/exams/results/${result.id}`}
          >
            
            View Detailed
           
          </Link>
        </div> */}

      </article>
    );
  })}
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

<div className="common-card se-exam-card" key={exam.ticketId}>
  <div className="cardbody se-exam-card__body ">

    {/* Exam Icon */}
    <div className="se-list-icon">
      {exam.courseImage ? (
        <img
          src={getAssetUrl(exam.courseImage)}
          alt={exam.course}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <FiFileText />
      )}
    </div>

    {/* Exam Details */}
    <div className="se-exam-card__content">

      <div className="se-exam-card__heading">
        <div className="se-row-main">
          <strong>{exam.course}</strong>

          <span className="se-hall-ticket">
            Hall Ticket: {exam.hallTicketNo}
          </span>
        </div>

        <span
          className={`se-badge se-badge--${String(exam.scheduleStatus)
            .toLowerCase()
            .replace(/\s+/g, "-")}`}
        >
          <FiClock />
          {exam.scheduleStatus}
        </span>
      </div>

      {/* Exam Meta */}
      <div className="se-exam-card__meta">

        <span>
          <FiCalendar />
          {dateText(exam.examDate)}
        </span>

        <span>
          <FiClock />
          {timeText(exam.startTime)} – {timeText(exam.endTime)}
        </span>

        <span>
          <FiFileText />
          {exam.totalQuestions} Questions
        </span>

        <span>
          <FiAward />
          {exam.totalMarks} Marks
        </span>

      </div>

      {/* Bottom Status + Action */}
      <div className="se-exam-card__footer">

        <div className="se-exam-card__submission">

          {exam.attemptStatus === "Submitted" ? (
            <>
              <span className="se-submission-item">
                <FiCheckCircle />
                Submitted
              </span>

              {exam.resultStatus === "Published" && (
                <>
                  <span className="se-status-separator">•</span>
                  <span>Result published</span>
                </>
              )}

              {exam.resultStatus !== "Published" && (
                <>
                  <span className="se-status-separator">•</span>
                  <span>Awaiting verification</span>
                </>
              )}
            </>
          ) : exam.attemptStatus === "InProgress" ? (
            <span className="se-submission-item se-submission-item--progress">
              <FiClock />
              Exam in progress
            </span>
          ) : (
            <span className="se-submission-item">
              <FiCheckCircle />
              Attempt submitted
            </span>
          )}

        </div>

        <div className="se-exam-card__actions">

          {canOpen ? (
            <Link
              className="themebtn"
              to={`/student/exams/${exam.ticketId}/instructions`}
            >
              {exam.attemptStatus === "InProgress"
                ? "Resume Exam"
                : "View Instructions"}
              <FiArrowRight />
            </Link>
          ) : (
            exam.resultStatus === "Published" ? (
              <Link
                className="themebtn"
                to={`/student/exams/results/${exam.resultId}`}
              >
                <FiEye />
                View Result
              </Link>
            ) : (
              <span className="se-muted">
                Attempt submitted
              </span>
            )
          )}

        </div>

      </div>

    </div>

  </div>
</div>

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