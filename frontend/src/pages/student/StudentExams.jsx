import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StudentExamAccessPanel from "./StudentExamAccessPanel";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiShield,
  FiTarget,
  FiAward,
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
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
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

function ExamStat({ icon: Icon, title, value, note, tone }) {
  return (
    <article className={`se-stat se-stat--${tone}`}>
      <span className="se-stat__icon"><Icon /></span>
      <div>
        <span className="se-stat__title">{title}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function StatePanel({ title, message, onRetry, loading = false }) {
  return (
    <section className="se-state">
      {loading ? <FiRefreshCw className="se-spin" /> : <FiAlertCircle />}
      <h2>{title}</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="se-button se-button--primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </section>
  );
}

export default function StudentExams() {
  const navigate = useNavigate();
  const { ticketId, resultId } = useParams();
  const path = window.location.pathname;

  const isInstructions = path.endsWith("/instructions");
  const isTakingExam = path.endsWith("/take");
  const isResultDetail = path.includes("/results/");

  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [examInfo, setExamInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [resultDetail, setResultDetail] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [marked, setMarked] = useState([]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load your exams."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInstructions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await studentPortalService.getExamInstructions(ticketId);
      setExamInfo(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load the exam instructions."
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.startMyExam(ticketId);
      const data = response?.data || {};

      setExamInfo(data);
      setQuestions(data.questions || []);

      const restored = {};
      (data.savedAnswers || []).forEach((item) => {
        restored[item.questionId] = item.answer || "";
      });
      setAnswers(restored);

      const expiresAt = new Date(data.expiresAt).getTime();
      setRemainingMs(Math.max(0, expiresAt - Date.now()));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to start this exam. Check your hall ticket and schedule."
      );
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const loadResult = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.getMyExamResult(resultId);
      setResultDetail(response?.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "This result is not available or has not been published."
      );
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    if (isTakingExam) loadAttempt();
    else if (isInstructions) loadInstructions();
    else if (isResultDetail) loadResult();
    else loadList();
  }, [
    isTakingExam,
    isInstructions,
    isResultDetail,
    loadAttempt,
    loadInstructions,
    loadResult,
    loadList,
  ]);

  useEffect(() => {
    if (!isTakingExam || loading || !examInfo?.expiresAt) return undefined;

    const updateClock = () => {
      setRemainingMs(
        Math.max(0, new Date(examInfo.expiresAt).getTime() - Date.now())
      );
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [isTakingExam, loading, examInfo?.expiresAt]);

  const submitAttempt = useCallback(async (automatic = false) => {
    if (busy) return;

    if (!automatic && !window.confirm("Submit your exam now? You cannot restart this attempt.")) {
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

      await studentPortalService.submitMyExam(ticketId, payload);

      setNotice(
        "Your exam has been submitted. The institute must publish your result before it appears here."
      );

      navigate("/student/exams", { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to submit the exam. Please contact your institute administrator."
      );
    } finally {
      setBusy(false);
    }
  }, [answers, busy, navigate, questions, ticketId]);

  useEffect(() => {
    if (
      isTakingExam &&
      !loading &&
      questions.length > 0 &&
      remainingMs <= 0 &&
      !busy
    ) {
      // Submission still goes through the backend; the server enforces the deadline.
      submitAttempt(true);
    }
  }, [isTakingExam, loading, questions.length, remainingMs, busy, submitAttempt]);

  if (loading) {
    return (
      <main className="student-exams">
        <StatePanel loading title="Loading" message="Getting your exam information…" />
      </main>
    );
  }

  if (error && !isTakingExam && !isInstructions && !isResultDetail) {
    return (
      <main className="student-exams">
        <StatePanel title="Exams unavailable" message={error} onRetry={loadList} />
      </main>
    );
  }

  if (error && (isTakingExam || isInstructions || isResultDetail) && !examInfo && !resultDetail) {
    return (
      <main className="student-exams">
        <button className="se-back" onClick={() => navigate("/student/exams")}>
          <FiArrowLeft /> Back to Exams
        </button>
        <StatePanel
          title="Unable to open this page"
          message={error}
          onRetry={isTakingExam ? loadAttempt : isInstructions ? loadInstructions : loadResult}
        />
      </main>
    );
  }

  if (isInstructions && examInfo) {
    const exam = examInfo.exam || {};

    return (
      <main className="student-exams">
        <button className="se-back" onClick={() => navigate("/student/exams")}>
          <FiArrowLeft /> Back to Exams
        </button>

        <header className="se-heading">
          <span className="se-eyebrow">EXAM / BEFORE YOU BEGIN</span>
          <h1>Exam Instructions</h1>
          <p>Review your schedule and instructions before starting.</p>
        </header>

        <section className="se-instruction-layout">
          <article className="se-panel se-exam-info">
            <div className="se-panel-heading">
              <div>
                <span className="se-eyebrow">HALL TICKET {exam.hallTicketNo}</span>
                <h2>{exam.course}</h2>
              </div>
              <span className={`se-badge se-badge--${String(exam.scheduleStatus).toLowerCase().replace(/\s+/g, "-")}`}>
                {exam.scheduleStatus}
              </span>
            </div>

            <div className="se-detail-grid">
              <div><span>Exam date</span><strong>{dateText(exam.examDate)}</strong></div>
              <div><span>Reporting time</span><strong>{timeText(exam.reportingTime)}</strong></div>
              <div><span>Start time</span><strong>{timeText(exam.startTime)}</strong></div>
              <div><span>End time</span><strong>{timeText(exam.endTime)}</strong></div>
              <div><span>Total questions</span><strong>{exam.totalQuestions}</strong></div>
              <div><span>Total marks</span><strong>{exam.totalMarks}</strong></div>
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
                <li key={item}>
                  <span>{index + 1}</span>
                  {item}
                </li>
              ))}
            </ul>

            <StudentExamAccessPanel
            ticketId={ticketId}
            onUpdated={loadInstructions}
            />

            {error && <p className="se-error">{error}</p>}

            <button
              type="button"
              className="se-button se-button--primary se-button--wide"
              disabled={!examInfo.canStart || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await studentPortalService.startMyExam(ticketId);
                  navigate(`/student/exams/${ticketId}/take`);
                } catch (err) {
                  setError(
                    err?.response?.data?.message ||
                      "The exam could not be started."
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Starting…" : examInfo.alreadyStarted ? "Resume Exam" : "I have read the instructions — Start Exam"}
              <FiArrowRight />
            </button>

            {!examInfo.canStart && (
              <p className="se-help">
                This exam cannot be started right now. Confirm the schedule and hall-ticket status with your institute.
              </p>
            )}
          </article>
        </section>
      </main>
    );
  }

  if (isTakingExam && examInfo) {
    const exam = examInfo.exam || {};
    const question = questions[currentQuestion];

    if (!question) {
      return (
        <main className="student-exams">
          <StatePanel title="No questions available" message="The exam does not contain any available questions." />
        </main>
      );
    }

    const answeredCount = questions.filter((item) => Boolean(answers[item.questionId])).length;

    return (
      <main className="student-exams">
        <header className="se-take-header">
          <div>
            <span className="se-eyebrow">ONLINE EXAM</span>
            <h1>{exam.course || "Exam"}</h1>
            <p>Hall ticket: {exam.hallTicketNo}</p>
          </div>
          <div className={`se-timer ${remainingMs < 5 * 60 * 1000 ? "se-timer--warning" : ""}`}>
            <FiClock />
            <span>Time left</span>
            <strong>{clockText(remainingMs)}</strong>
          </div>
        </header>

        {error && <div className="se-error" role="alert">{error}</div>}

        <div className="se-take-layout">
          <aside className="se-panel se-question-nav">
            <div className="se-panel-heading">
              <h2>Question navigator</h2>
              <span>{answeredCount}/{questions.length}</span>
            </div>

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
                    aria-label={`Question ${index + 1}${isAnswered ? ", answered" : ", unanswered"}`}
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

            <p className="se-help">Your attempt is submitted to the server for evaluation.</p>
          </aside>

          <section className="se-panel se-question-panel">
            <div className="se-question-meta">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{exam.totalMarks} total marks</span>
            </div>

            <div className="se-progress">
              <span style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
            </div>

            <span className="se-subject-label">{question.subjectName}</span>
            <h2 className="se-question-text">{question.questionText}</h2>

            <div className="se-options">
              {question.options.map((option) => (
                <label
                  key={option.key}
                  className={`se-option ${answers[question.questionId] === option.key ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name={question.questionId}
                    value={option.key}
                    checked={answers[question.questionId] === option.key}
                    onChange={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [question.questionId]: option.key,
                      }))
                    }
                  />
                  <span className="se-option__key">{option.key}</span>
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
                      ? previous.filter((id) => id !== question.questionId)
                      : [...previous, question.questionId]
                  )
                }
              >
                <FiTarget />
                {marked.includes(question.questionId) ? "Remove review mark" : "Mark for review"}
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
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion((value) => value - 1)}
              >
                <FiArrowLeft /> Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  type="button"
                  className="se-button se-button--primary"
                  onClick={() => setCurrentQuestion((value) => value + 1)}
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
                  {busy ? "Submitting…" : "Submit Exam"} <FiCheckCircle />
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (isResultDetail && resultDetail) {
    return (
      <main className="student-exams">
        <button className="se-back" onClick={() => navigate("/student/exams")}>
          <FiArrowLeft /> Back to Exams & Results
        </button>

        <header className="se-heading">
          <span className="se-eyebrow">RESULT / ANSWER SHEET</span>
          <h1>Exam Result</h1>
          <p>{resultDetail.course}</p>
        </header>

        <section className="se-result-hero">
          <div className="se-trophy"><FiAward /></div>
          <div>
            <span className={`se-badge ${resultDetail.passStatus === "Pass" ? "se-badge--pass" : "se-badge--fail"}`}>
              {resultDetail.passStatus}
            </span>
            <h2>{resultDetail.percentage}%</h2>
            <p>{resultDetail.passStatus === "Pass" ? "Congratulations on completing your exam." : "Review your answer sheet and keep learning."}</p>
          </div>
          <div className="se-result-score">
            <span>Marks obtained</span>
            <strong>{money(resultDetail.obtainedMarks)} / {money(resultDetail.totalMarks)}</strong>
            <span>Grade: {resultDetail.grade || "—"}</span>
          </div>
        </section>

        <section className="se-panel se-answer-sheet">
          <div className="se-panel-heading">
            <div>
              <h2>Answer sheet</h2>
              <p>Review your submitted answers and correct options.</p>
            </div>
            <span>{resultDetail.answers?.length || 0} questions</span>
          </div>

          {(resultDetail.answers || []).map((answer) => (
            <article className="se-review-question" key={`${answer.number}-${answer.questionText}`}>
              <div className="se-review-heading">
                <strong>Q{answer.number}. {answer.questionText}</strong>
                <span className={`se-badge ${answer.isCorrect ? "se-badge--pass" : "se-badge--fail"}`}>
                  {answer.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <div className="se-review-options">
                {answer.options.map((option) => (
                  <div
                    key={option.key}
                    className={[
                      "se-review-option",
                      option.key === answer.correctAnswer ? "is-correct" : "",
                      option.key === answer.selectedAnswer && !answer.isCorrect ? "is-wrong" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    <strong>{option.key}</strong> {option.text}
                    {option.key === answer.correctAnswer && " — Correct answer"}
                    {option.key === answer.selectedAnswer && " — Your answer"}
                  </div>
                ))}
              </div>
              <small>Marks awarded: {money(answer.marksAwarded)}</small>
            </article>
          ))}
        </section>
      </main>
    );
  }

  const upcoming = exams.filter((item) =>
    ["Upcoming", "In progress"].includes(item.scheduleStatus) &&
    item.attemptStatus !== "Submitted" &&
    item.resultStatus !== "Published"
  );

  const previous = exams.filter((item) =>
    !upcoming.some((upcomingItem) => upcomingItem.ticketId === item.ticketId)
  );

  return (
    <main className="student-exams">
      <header className="se-page-header">
        <div>
          <span className="se-eyebrow">ASSESSMENT CENTRE</span>
          <h1>Exams &amp; Results</h1>
          <p>View your exam schedule, start an available exam, and review published results.</p>
        </div>
        <button
          type="button"
          className="se-button se-button--secondary"
          onClick={loadList}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {notice && <div className="se-success"><FiCheckCircle /> {notice}</div>}
      {error && <div className="se-error"><FiAlertCircle /> {error}</div>}

      <section className="se-stat-grid">
        <ExamStat icon={FiCalendar} title="Upcoming Exams" value={upcoming.length} note="Scheduled for you" tone="blue" />
        <ExamStat icon={FiClock} title="In Progress" value={exams.filter((item) => item.scheduleStatus === "In progress" && item.attemptStatus === "InProgress").length} note="Active attempts" tone="orange" />
        <ExamStat icon={FiFileText} title="Submitted" value={exams.filter((item) => item.attemptStatus === "Submitted").length} note="Awaiting publication" tone="purple" />
        <ExamStat icon={FiAward} title="Published Results" value={results.length} note="Available to review" tone="green" />
      </section>

      <section className="se-panel se-list-panel">
        <div className="se-tabs">
          <button className={tab === "upcoming" ? "is-active" : ""} onClick={() => setTab("upcoming")}>
            Upcoming &amp; Available <span>{upcoming.length}</span>
          </button>
          <button className={tab === "previous" ? "is-active" : ""} onClick={() => setTab("previous")}>
            Past &amp; Submitted <span>{previous.length}</span>
          </button>
          <button className={tab === "results" ? "is-active" : ""} onClick={() => setTab("results")}>
            Results <span>{results.length}</span>
          </button>
        </div>

        {tab === "results" ? (
          results.length ? (
            <div className="se-result-list">
              {results.map((result) => (
                <article className="se-result-row" key={result.id}>
                  <div className="se-list-icon se-list-icon--purple"><FiAward /></div>
                  <div className="se-row-main">
                    <strong>{result.course}</strong>
                    <span>Published {dateText(result.publishedAt)} · Grade {result.grade}</span>
                  </div>
                  <div className="se-row-score">
                    <strong>{money(result.obtainedMarks)} / {money(result.totalMarks)}</strong>
                    <span>{result.percentage}% · {result.passStatus}</span>
                  </div>
                  <Link className="se-button se-button--secondary" to={`/student/exams/results/${result.id}`}>
                    View Result <FiArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="se-empty">
              <FiAward />
              <h2>No published results yet</h2>
              <p>Your results will appear here after the institute publishes them.</p>
            </div>
          )
        ) : (
          (() => {
            const list = tab === "upcoming" ? upcoming : previous;

            return list.length ? (
              <div className="se-exam-list">
                {list.map((exam) => {
                  const canOpen = exam.attemptStatus !== "Submitted" &&
                    exam.resultStatus !== "Published";

                  return (
                    <article className="se-exam-row" key={exam.ticketId}>
                      <div className="se-list-icon"><FiFileText /></div>
                      <div className="se-row-main">
                        <strong>{exam.course}</strong>
                        <span>Hall ticket: {exam.hallTicketNo}</span>
                        <span>{dateText(exam.examDate)} · {timeText(exam.startTime)} – {timeText(exam.endTime)}</span>
                        <span>{exam.totalQuestions} questions · {exam.totalMarks} marks</span>
                      </div>
                      <div className="se-row-status">
                        <span className={`se-badge se-badge--${String(exam.scheduleStatus).toLowerCase().replace(/\s+/g, "-")}`}>
                          {exam.scheduleStatus}
                        </span>
                        {exam.attemptStatus === "Submitted" && <small>Submitted · Awaiting result</small>}
                      </div>
                      {canOpen ? (
                        <Link className="se-button se-button--primary" to={`/student/exams/${exam.ticketId}/instructions`}>
                          {exam.attemptStatus === "InProgress" ? "Resume Exam" : "View Instructions"} <FiArrowRight />
                        </Link>
                      ) : (
                        <span className="se-muted">Attempt submitted</span>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="se-empty">
                <FiCalendar />
                <h2>{tab === "upcoming" ? "No upcoming exams" : "No past exams"}</h2>
                <p>When an exam is assigned to your active hall ticket, it will appear here.</p>
              </div>
            );
          })()
        )}
      </section>

      <p className="se-security-note">
        Exam access is linked to your account and active hall ticket. Results are shown only after the institute publishes them.
      </p>
    </main>
  );
}