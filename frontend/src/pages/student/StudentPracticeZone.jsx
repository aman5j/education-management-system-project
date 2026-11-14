
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiArrowRight,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiTarget,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiSend,
  FiSave,
} from "react-icons/fi";

import practiceStudentService from "../../services/practiceStudentService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import "./StudentPracticeZone.css";

const ACTIVE_ATTEMPT_KEY = "ems_student_practice_active_attempt_v1";

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getData = (response) =>
  response?.data?.data ?? response?.data ?? response;

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const getQuestionId = (question) => String(question.question_id);

const getAnswerPayload = (questions, answers) =>
  questions.map((question) => ({
    question_id: question.question_id,
    selectedAnswer: answers[getQuestionId(question)] || "",
  }));

const getAnswersFromQuestions = (questions = []) =>
  questions.reduce((result, question) => {
    result[getQuestionId(question)] = question.selectedAnswer || "";
    return result;
  }, {});

const readStoredAttempt = () => {
  try {
    const raw = localStorage.getItem(ACTIVE_ATTEMPT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(ACTIVE_ATTEMPT_KEY);
    return null;
  }
};

const saveStoredAttempt = (attempt) => {
  localStorage.setItem(
    ACTIVE_ATTEMPT_KEY,
    JSON.stringify({
      attemptId: attempt.attemptId,
      testId: attempt.testId,
      title: attempt.title,
    })
  );
};

const clearStoredAttempt = () => {
  localStorage.removeItem(ACTIVE_ATTEMPT_KEY);
};

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ].join(":");
};

function PracticeStat({ icon: Icon, label, value }) {
  return (
    <div className="spz-stat">
      <span className="spz-stat__icon">
        <Icon />
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function StateMessage({ loading, error, onRetry }) {
  if (loading) {
    return (
      <div className="spz-state">
        <FiRefreshCw className="spz-spin" />
        <h3>Loading practice tests</h3>
        <p>Please wait while we find your available tests.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spz-state spz-state--error">
        <FiAlertCircle />
        <h3>Unable to load practice tests</h3>
        <p>{error}</p>

        <button type="button" onClick={onRetry}>
          Try again <FiRefreshCw />
        </button>
      </div>
    );
  }

  return null;
}

export default function StudentPracticeZone() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [selectedTest, setSelectedTest] = useState(null);
  const [instructions, setInstructions] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [starting, setStarting] = useState(false);
  const [resumeChecking, setResumeChecking] = useState(true);

  const [activeAttempt, setActiveAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const [saveStatus, setSaveStatus] = useState("Not started");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [result, setResult] = useState(null);
  const [completedTitle, setCompletedTitle] = useState("");

  const activeAttemptRef = useRef(null);
  const answersRef = useRef({});
  const submitRef = useRef(null);
  const submittingRef = useRef(false);

  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const skipAutosaveRef = useRef(false);

  // Keep refs synchronized with the latest React state.
  activeAttemptRef.current = activeAttempt;
  answersRef.current = answers;

const loadTests = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const response =
      await practiceStudentService.getAvailableTests();

    const data = getData(response);
    setTests(Array.isArray(data) ? data : []);
  } catch (err) {
    setError(getApiErrorMessage(err));
    setTests([]);
    notification.error(getApiErrorMessage(err));
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const activateAttempt = useCallback((attempt, title, testId) => {
    const questions = Array.isArray(attempt.questions)
      ? attempt.questions
      : [];

    const attemptId = attempt.attemptId || attempt._id;

    const normalized = {
      attemptId,
      testId:
        testId ||
        (typeof attempt.practiceTest_id === "object"
          ? attempt.practiceTest_id?._id
          : attempt.practiceTest_id),
      title: title || "Practice Test",
      questions,
      expiresAt: attempt.expiresAt,
      startedAt: attempt.startedAt,
      totalQuestions: attempt.totalQuestions || questions.length,
      totalMarks: attempt.totalMarks || 0,
      marksPerQuestion: attempt.marksPerQuestion || 0,
      status: attempt.status || "In Progress",
    };

    skipAutosaveRef.current = true;
    saveQueueRef.current = Promise.resolve();

    setActiveAttempt(normalized);
    setAnswers(getAnswersFromQuestions(questions));
    setCurrentQuestionIndex(0);
    setTimeLeft(
      Math.max(
        0,
        Math.ceil(
          (new Date(normalized.expiresAt).getTime() - Date.now()) / 1000
        )
      )
    );
    setSaveStatus("Answers restored");
    setSubmitError("");
    setResult(null);
    setSelectedTest(null);
    setInstructions(null);

    saveStoredAttempt(normalized);
  }, []);

  const showSubmittedResult = useCallback((data, title) => {
    setResult(data);
    setCompletedTitle(title || "Practice Test");
    setActiveAttempt(null);
    setAnswers({});
    setSelectedTest(null);
    setInstructions(null);
    setSubmitError("");
    clearStoredAttempt();
  }, []);

  const submitExpiredAttempt = useCallback(
    async (attemptId, title) => {
      const response = await practiceStudentService.submitTest(
        attemptId,
        []
      );

      const data = getData(response);
      showSubmittedResult(data, title);
    },
    [showSubmittedResult]
  );

  // Restore an unfinished attempt after refresh or reopening the page.
  useEffect(() => {
    let cancelled = false;

    const restoreAttempt = async () => {
      const stored = readStoredAttempt();

      if (!stored?.attemptId) {
        setResumeChecking(false);
        return;
      }

      try {
        const response = await practiceStudentService.getAttempt(
          stored.attemptId
        );

        const attempt = getData(response);

        if (cancelled) return;

        if (attempt.status !== "In Progress") {
          clearStoredAttempt();
          setResumeChecking(false);
          return;
        }

        const expiresAt = new Date(attempt.expiresAt).getTime();

        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
          const submittedResponse =
            await practiceStudentService.submitTest(
              stored.attemptId,
              []
            );

          if (!cancelled) {
            showSubmittedResult(
              getData(submittedResponse),
              stored.title
            );
          }

          return;
        }

        if (!cancelled) {
          activateAttempt(
            attempt,
            stored.title,
            stored.testId
          );
        }
      } catch (err) {
        // The backend returns 410 for an expired in-progress attempt.
        // Submit it now so the server records the Timed Out result.
        if (err?.response?.status === 410) {
          try {
            const submittedResponse =
              await practiceStudentService.submitTest(
                stored.attemptId,
                []
              );

            if (!cancelled) {
              showSubmittedResult(
                getData(submittedResponse),
                stored.title
              );
            }
          } catch (submitErr) {
            if (!cancelled) {
              setError(getApiErrorMessage(submitErr));
              notification.error(getApiErrorMessage(submitErr));
              clearStoredAttempt();
            }
          }
        } else if (!cancelled) {
          setError(getApiErrorMessage(err));
          notification.error(
            `Could not resume your previous attempt: ${getApiErrorMessage(err)}`
          );
        }
      } finally {
        if (!cancelled) {
          setResumeChecking(false);
        }
      }
    };

    restoreAttempt();

    return () => {
      cancelled = true;
    };
  }, [activateAttempt, showSubmittedResult]);

  const courses = useMemo(() => {
    const map = new Map();

    tests.forEach((test) => {
      const course = test.course_id;

      if (course?._id) {
        map.set(String(course._id), course.courseTitle);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [tests]);

  const subjects = useMemo(() => {
    const map = new Map();

    tests.forEach((test) => {
      if (
        test.subject_id?._id &&
        (!courseFilter ||
          String(test.course_id?._id) === courseFilter)
      ) {
        map.set(
          String(test.subject_id._id),
          test.subject_id.subjectName
        );
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [tests, courseFilter]);

  const filteredTests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tests.filter((test) => {
      const matchesSearch =
        !keyword ||
        [
          test.title,
          test.description,
          test.course_id?.courseTitle,
          test.subject_id?.subjectName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const matchesCourse =
        !courseFilter ||
        String(test.course_id?._id) === courseFilter;

      const matchesSubject =
        !subjectFilter ||
        String(test.subject_id?._id) === subjectFilter;

      return matchesSearch && matchesCourse && matchesSubject;
    });
  }, [tests, search, courseFilter, subjectFilter]);

  const openInstructions = async (test) => {
    setSelectedTest(test);
    setInstructions(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response =
        await practiceStudentService.getTestInstructions(test._id);

      setInstructions(getData(response));
    } catch (err) {
      setDetailError(getApiErrorMessage(err));
      notification.error(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeInstructions = () => {
    setSelectedTest(null);
    setInstructions(null);
    setDetailError("");
  };

  const clearFilters = () => {
    setSearch("");
    setCourseFilter("");
    setSubjectFilter("");
  };

  const hasFilters =
    Boolean(search || courseFilter || subjectFilter);

  const startPracticeTest = async () => {
    if (!selectedTest || starting) return;

    setStarting(true);
    setDetailError("");

    try {
      const response = await practiceStudentService.startTest(
        selectedTest._id
      );

      const data = getData(response);

      if (!data?.attemptId || !Array.isArray(data.questions)) {
        throw new Error(
          "The server returned an invalid attempt response."
        );
      }

      activateAttempt(
        data,
        data.title || selectedTest.title,
        selectedTest._id
      );

      notification.success("Practice test started successfully.");
    } catch (err) {
      setDetailError(getApiErrorMessage(err));
      notification.error(getApiErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  const handleAnswerChange = (questionId, selectedAnswer) => {
    if (!activeAttempt || submitting) return;

    setAnswers((previous) => ({
      ...previous,
      [String(questionId)]: selectedAnswer,
    }));
  };

  // Automatically save the complete answer snapshot after a short pause.
  useEffect(() => {
    if (!activeAttempt?.attemptId) return undefined;

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return undefined;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus("Saving answers...");

    const attemptId = activeAttempt.attemptId;
    const payload = getAnswerPayload(
      activeAttempt.questions,
      answers
    );

    saveTimerRef.current = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current
        .catch(() => undefined)
        .then(() =>
          practiceStudentService.saveAnswers(attemptId, payload)
        )
        .then(() => {
          setSaveStatus("All answers saved");
        })
        .catch((err) => {
          if (err?.response?.status === 409) {
            setSaveStatus("Attempt submitted");
          } else if (err?.response?.status === 410) {
            setSaveStatus("Time expired — submitting...");
          } else {
            setSaveStatus("Save failed — retry on next answer");
          }
        });
    }, 600);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [activeAttempt?.attemptId, answers, activeAttempt?.questions]);

  const handleSubmit = useCallback(async (isAutomatic = false) => {
    const current = activeAttemptRef.current;

    if (!current?.attemptId || submittingRef.current) return;

    if (!isAutomatic) {
      const unanswered = current.questions.filter(
        (question) =>
          !answersRef.current[getQuestionId(question)]
      ).length;

      const confirmed = await notification.confirm({
        title: unanswered > 0
          ? "Unanswered Questions"
          : "Submit Practice Test?",
        text: unanswered > 0
          ? `You have ${unanswered} unanswered question(s). Are you sure you want to submit this test?`
          : "Are you sure you want to submit your practice test? You cannot change your answers after submission.",
        icon: "warning",
        confirmText: "Yes, Submit Test",
        cancelText: "Continue Test",
        confirmButtonColor: "#2563eb",
      });

      if (!confirmed) return;
    }

    // Recheck the attempt after the confirmation dialog.
    const latestAttempt = activeAttemptRef.current;

    if (
      !latestAttempt?.attemptId ||
      latestAttempt.attemptId !== current.attemptId ||
      submittingRef.current
    ) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveStatus(
      isAutomatic
        ? "Time expired — submitting..."
        : "Submitting..."
    );

    const payload = getAnswerPayload(
      current.questions,
      answersRef.current
    );

    try {
      // Finish any already queued autosave before final submission.
      await saveQueueRef.current.catch(() => undefined);

      const response = await practiceStudentService.submitTest(
        current.attemptId,
        payload
      );

      const submittedResult = getData(response);

      showSubmittedResult(submittedResult, current.title);

      notification.success(
        isAutomatic
          ? "Time expired. Your practice test was submitted automatically."
          : "Practice test submitted successfully."
      );
    } catch (err) {
      const message = getApiErrorMessage(err);

      setSubmitError(message);
      setSaveStatus("Submission failed — please retry");
      notification.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [showSubmittedResult]);

  // Keep the timer callback current without restarting the interval.
  submitRef.current = handleSubmit;

  // Timer always uses the server-issued expiry timestamp.
  useEffect(() => {
    if (!activeAttempt?.expiresAt) return undefined;

    const updateTimer = () => {
      const expiry = new Date(activeAttempt.expiresAt).getTime();
      const remaining = Math.max(
        0,
        Math.ceil((expiry - Date.now()) / 1000)
      );

      setTimeLeft(remaining);

      if (remaining <= 0) {
        submitRef.current?.(true);
      }
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeAttempt?.attemptId, activeAttempt?.expiresAt]);

  const currentQuestion = activeAttempt?.questions?.[
    currentQuestionIndex
  ];

  const answeredCount = activeAttempt
    ? activeAttempt.questions.filter(
        (question) => answers[getQuestionId(question)]
      ).length
    : 0;

  const unansweredCount = activeAttempt
    ? activeAttempt.questions.length - answeredCount
    : 0;

  const goToQuestion = (index) => {
    if (!activeAttempt) return;

    if (
      index >= 0 &&
      index < activeAttempt.questions.length
    ) {
      setCurrentQuestionIndex(index);
    }
  };

  const resetToPracticeList = () => {
    setResult(null);
    setCompletedTitle("");
    setSubmitError("");
    setSelectedTest(null);
    setInstructions(null);
    loadTests();
  };

  // ---------------------------------------------------------
  // RESUME CHECKING
  // ---------------------------------------------------------

  if (resumeChecking) {
    return (
      <main className="spz-page">
        <div className="spz-state">
          <FiRefreshCw className="spz-spin" />
          <h3>Checking your previous attempt</h3>
          <p>We are checking whether you have a test to resume.</p>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // SUBMISSION RESULT
  // ---------------------------------------------------------

  if (result) {
    const timedOut = result.status === "Timed Out";

    return (
      <main className="spz-page">
        <section className="spz-result">
          <span className="spz-result__icon">
            <FiCheckCircle />
          </span>

          <span className="spz-eyebrow">
            PRACTICE ZONE / COMPLETED
          </span>

          <h1>
            {timedOut
              ? "Time is up — test submitted"
              : "Practice test submitted"}
          </h1>

          <p className="spz-result__description">
            {completedTitle} has been submitted successfully.
            {timedOut
              ? " Your saved answers were used to calculate the result."
              : " Your attempt has been recorded."}
          </p>

          <div className="spz-result__grid">
            <div>
              <small>Marks Obtained</small>
              <strong>
                {formatNumber(result.marksObtained)} /{" "}
                {formatNumber(result.totalMarks)}
              </strong>
            </div>

            <div>
              <small>Percentage</small>
              <strong>{formatNumber(result.percentage)}%</strong>
            </div>

            <div>
              <small>Correct</small>
              <strong>{result.correctCount ?? 0}</strong>
            </div>

            <div>
              <small>Incorrect</small>
              <strong>{result.incorrectCount ?? 0}</strong>
            </div>

            <div>
              <small>Unanswered</small>
              <strong>{result.unansweredCount ?? 0}</strong>
            </div>

            <div>
              <small>Attempt Status</small>
              <strong>{result.status || "Submitted"}</strong>
            </div>
          </div>

          <button
            type="button"
            className="spz-primary-button"
            onClick={resetToPracticeList}
          >
            <FiArrowLeft /> Back to Practice Zone
          </button>
        </section>
      </main>
    );
  }

  // ---------------------------------------------------------
  // ACTIVE QUIZ SCREEN
  // ---------------------------------------------------------

  if (activeAttempt) {
    if (!currentQuestion) {
      return (
        <main className="spz-page">
          <div className="spz-state spz-state--error">
            <FiAlertCircle />
            <h3>No questions were returned</h3>
            <p>
              The attempt response did not contain any questions.
              Please contact your administrator.
            </p>
          </div>
        </main>
      );
    }

    const questionId = getQuestionId(currentQuestion);
    const selectedAnswer = answers[questionId] || "";

    const timerWarning = timeLeft <= 60;

    return (
      <main className="spz-page spz-quiz-page">
        <header className="spz-quiz-header">
          <div>
            <span className="spz-eyebrow">PRACTICE ZONE / LIVE TEST</span>
            <h1>{activeAttempt.title}</h1>
            <p>
              Answer each question. Your answers are saved automatically.
            </p>
          </div>

          <div
            className={`spz-timer ${
              timerWarning ? "spz-timer--warning" : ""
            }`}
            aria-live="polite"
          >
            <FiClock />
            <div>
              <small>Time Remaining</small>
              <strong>{formatTime(timeLeft)}</strong>
            </div>
          </div>
        </header>

        <section className="spz-quiz-progress">
          <div>
            <span>
              Answered: <strong>{answeredCount}</strong>
            </span>
            <span>
              Remaining: <strong>{unansweredCount}</strong>
            </span>
            <span>
              Total: <strong>{activeAttempt.questions.length}</strong>
            </span>
          </div>

          <div className="spz-progress-track">
            <span
              style={{
                width: `${
                  activeAttempt.questions.length
                    ? (answeredCount /
                        activeAttempt.questions.length) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </section>

        <div className="spz-quiz-layout">
          <section className="spz-question-panel">
            <div className="spz-question-top">
              <span>
                Question {currentQuestionIndex + 1} of{" "}
                {activeAttempt.questions.length}
              </span>

              <span className="spz-question-marks">
                {formatNumber(activeAttempt.marksPerQuestion)} Marks
              </span>
            </div>

            <h2 className="spz-question-text">
              {currentQuestion.questionText}
            </h2>

            <div className="spz-options">
              {["A", "B", "C", "D"].map((option) => {
                const optionText =
                  currentQuestion[`option${option}`];

                return (
                  <label
                    key={option}
                    className={`spz-option ${
                      selectedAnswer === option
                        ? "spz-option--selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${questionId}`}
                      value={option}
                      checked={selectedAnswer === option}
                      disabled={submitting || timeLeft <= 0}
                      onChange={() =>
                        handleAnswerChange(questionId, option)
                      }
                    />

                    <span className="spz-option__letter">
                      {option}
                    </span>

                    <span className="spz-option__text">
                      {optionText}
                    </span>

                    {selectedAnswer === option && (
                      <FiCheckCircle className="spz-option__check" />
                    )}
                  </label>
                );
              })}
            </div>

            <div className="spz-question-navigation">
              <button
                type="button"
                className="spz-secondary-button"
                disabled={currentQuestionIndex === 0 || submitting}
                onClick={() =>
                  goToQuestion(currentQuestionIndex - 1)
                }
              >
                <FiChevronLeft /> Previous
              </button>

              <span className="spz-save-status">
                {saveStatus.includes("saved") ? (
                  <FiSave />
                ) : (
                  <FiRefreshCw
                    className={
                      saveStatus.includes("Saving")
                        ? "spz-spin"
                        : ""
                    }
                  />
                )}
                {saveStatus}
              </span>

              {currentQuestionIndex <
              activeAttempt.questions.length - 1 ? (
                <button
                  type="button"
                  className="spz-primary-button"
                  disabled={submitting}
                  onClick={() =>
                    goToQuestion(currentQuestionIndex + 1)
                  }
                >
                  Next <FiChevronRight />
                </button>
              ) : (
                <button
                  type="button"
                  className="spz-primary-button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                >
                  Review & Submit <FiSend />
                </button>
              )}
            </div>

            {submitError && (
              <div className="spz-alert spz-alert--error spz-submit-error">
                <FiAlertCircle />
                <span>{submitError}</span>
                <button
                  type="button"
                  onClick={() => handleSubmit(timeLeft <= 0)}
                >
                  Retry submit
                </button>
              </div>
            )}

            {submitting && (
              <div className="spz-submitting-note">
                <FiRefreshCw className="spz-spin" />
                Submitting your answers. Please wait...
              </div>
            )}
          </section>

          <aside className="spz-question-sidebar">
            <div className="spz-question-sidebar__heading">
              <h3>Question Navigator</h3>
              <p>Select a number to move to that question.</p>
            </div>

            <div className="spz-question-legend">
              <span>
                <i className="spz-legend-dot spz-legend-dot--answered" />
                Answered
              </span>
              <span>
                <i className="spz-legend-dot spz-legend-dot--current" />
                Current
              </span>
              <span>
                <i className="spz-legend-dot spz-legend-dot--empty" />
                Unanswered
              </span>
            </div>

            <div className="spz-question-palette">
              {activeAttempt.questions.map((question, index) => {
                const id = getQuestionId(question);
                const isAnswered = Boolean(answers[id]);
                const isCurrent = index === currentQuestionIndex;

                return (
                  <button
                    key={id}
                    type="button"
                    className={[
                      "spz-question-number",
                      isAnswered
                        ? "spz-question-number--answered"
                        : "",
                      isCurrent
                        ? "spz-question-number--current"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => goToQuestion(index)}
                    disabled={submitting}
                    aria-label={`Go to question ${index + 1}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="spz-sidebar-summary">
              <div>
                <span>Answered</span>
                <strong>{answeredCount}</strong>
              </div>
              <div>
                <span>Unanswered</span>
                <strong>{unansweredCount}</strong>
              </div>
            </div>

            <button
              type="button"
              className="spz-submit-button"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
            >
              <FiSend />
              Submit Test
            </button>

            <p className="spz-sidebar-note">
              Your progress is saved automatically. If you refresh
              or reopen this page, you can continue your attempt
              while time remains.
            </p>
          </aside>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // TEST INSTRUCTIONS
  // ---------------------------------------------------------

  if (selectedTest) {
    return (
      <main className="spz-page">
        <button
          type="button"
          className="spz-back-button"
          onClick={closeInstructions}
        >
          <FiArrowLeft /> Back to Practice Zone
        </button>

        <section className="spz-instructions">
          <div className="spz-instructions__top">
            <span className="spz-eyebrow">
              PRACTICE ZONE / TEST INSTRUCTIONS
            </span>

            <span className="spz-live-badge">
              <FiCheckCircle /> Published
            </span>
          </div>

          <h1>{instructions?.title || selectedTest.title}</h1>

          <p className="spz-instructions__description">
            {instructions?.description ||
              selectedTest.description ||
              "Practice your knowledge with this test."}
          </p>

          {detailLoading ? (
            <div className="spz-state">
              <FiRefreshCw className="spz-spin" />
              Loading test instructions...
            </div>
          ) : detailError ? (
            <div className="spz-alert spz-alert--error">
              <FiAlertCircle />
              <span>{detailError}</span>
              <button
                type="button"
                onClick={() => openInstructions(selectedTest)}
              >
                Retry
              </button>
            </div>
          ) : instructions ? (
            <>
              <div className="spz-instruction-stats">
                <PracticeStat
                  icon={FiBookOpen}
                  label="Course"
                  value={instructions.course || "—"}
                />

                <PracticeStat
                  icon={FiFileText}
                  label="Subject"
                  value={instructions.subject || "—"}
                />

                <PracticeStat
                  icon={FiTarget}
                  label="Questions"
                  value={instructions.totalQuestions}
                />

                <PracticeStat
                  icon={FiClock}
                  label="Duration"
                  value={`${instructions.durationMinutes} minutes`}
                />

                <PracticeStat
                  icon={FiCheckCircle}
                  label="Total Marks"
                  value={formatNumber(instructions.totalMarks)}
                />

                <PracticeStat
                  icon={FiActivity}
                  label="Marks / Question"
                  value={formatNumber(instructions.marksPerQuestion)}
                />
              </div>

              <section className="spz-rules">
                <h2>Test Instructions</h2>

                <ul>
                  <li>
                    Read every question carefully before selecting an answer.
                  </li>
                  <li>
                    The test has {instructions.totalQuestions} questions.
                  </li>
                  <li>
                    You will have {instructions.durationMinutes} minutes.
                  </li>
                  <li>
                    Each correct answer carries{" "}
                    {formatNumber(instructions.marksPerQuestion)} marks.
                  </li>
                  <li>
                    Your answers are saved automatically during the attempt.
                  </li>
                  <li>
                    You can resume an unfinished attempt after refreshing
                    or reopening the Practice Zone.
                  </li>
                  <li>
                    The test is submitted automatically when the timer expires.
                  </li>
                  <li>
                    You can attempt this practice test unlimited times.
                  </li>
                </ul>
              </section>

              <div className="spz-attempt-summary">
                <div>
                  <small>Previous completed attempts</small>
                  <strong>
                    {instructions.attemptsCompleted ?? 0}
                  </strong>
                </div>

                <div>
                  <small>Attempt limit</small>
                  <strong>
                    {instructions.attemptsAllowed || "Unlimited"}
                  </strong>
                </div>
              </div>

              <div className="spz-start-footer">
                <p>
                  Starting the test will begin the timer immediately.
                  Make sure you are ready before continuing.
                </p>

                <button
                  type="button"
                  className="spz-primary-button spz-start-button"
                  onClick={startPracticeTest}
                  disabled={starting}
                >
                  {starting ? (
                    <>
                      <FiRefreshCw className="spz-spin" />
                      Starting Test...
                    </>
                  ) : (
                    <>
                      Start Practice Test <FiArrowRight />
                    </>
                  )}
                </button>
              </div>
            </>
          ) : null}
        </section>
      </main>
    );
  }

  // ---------------------------------------------------------
  // PRACTICE TEST LIST
  // ---------------------------------------------------------

  return (
    <main className="spz-page">
      <header className="spz-header">
        <div>
          <span className="spz-eyebrow">STUDENT LEARNING</span>
          <h1>Practice Zone</h1>
          <p>
            Improve your knowledge with practice tests from your enrolled courses.
          </p>
        </div>

        <button
          type="button"
          className="spz-refresh"
          onClick={loadTests}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "spz-spin" : ""} />
          Refresh
        </button>
      </header>

      <section className="spz-overview">
        <div>
          <span className="spz-overview__icon">
            <FiTarget />
          </span>

          <div>
            <small>Available Practice Tests</small>
            <strong>{tests.length}</strong>
            <p>Published tests for your active admissions</p>
          </div>
        </div>

        <div>
          <span className="spz-overview__icon spz-overview__icon--green">
            <FiBookOpen />
          </span>

          <div>
            <small>Enrolled Courses</small>
            <strong>{courses.length}</strong>
            <p>Courses with available practice tests</p>
          </div>
        </div>
      </section>

      {error || loading ? (
        <StateMessage
          loading={loading}
          error={error}
          onRetry={loadTests}
        />
      ) : (
        <>
          <section className="spz-toolbar">
            <label className="spz-search">
              <FiSearch />
              <input
                type="search"
                placeholder="Search tests, courses or subjects..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              value={courseFilter}
              onChange={(event) => {
                setCourseFilter(event.target.value);
                setSubjectFilter("");
              }}
              aria-label="Filter by course"
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Filter by subject"
            >
              <option value="">All Subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>

            {hasFilters && (
              <button
                type="button"
                className="spz-clear"
                onClick={clearFilters}
              >
                <FiX /> Clear
              </button>
            )}
          </section>

          <div className="spz-results-heading">
            <div>
              <h2>Available Tests</h2>
              <p>{filteredTests.length} test(s) available</p>
            </div>
          </div>

          {filteredTests.length === 0 ? (
            <section className="spz-empty">
              <FiBookOpen />
              <h3>No practice tests found</h3>
              <p>
                {tests.length === 0
                  ? "There are no published practice tests for your active courses right now."
                  : "Try changing your search or filters."}
              </p>
              {hasFilters && (
                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </section>
          ) : (
            <section className="spz-test-grid">
              {filteredTests.map((test) => (
                <article className="spz-test-card" key={test._id}>
                  <div className="spz-test-card__top">
                    <span className="spz-test-icon">
                      <FiFileText />
                    </span>
                    <span className="spz-published">Published</span>
                  </div>

                  <div className="spz-test-card__content">
                    <span className="spz-test-course">
                      {test.course_id?.courseTitle || "Course"}
                    </span>

                    <h3>{test.title}</h3>

                    <p className="spz-test-description">
                      {test.description ||
                        "Test your understanding of this subject."}
                    </p>

                    <div className="spz-test-subject">
                      <FiBookOpen />
                      {test.subject_id?.subjectName || "Subject"}
                    </div>

                    <div className="spz-test-meta">
                      <span>
                        <FiTarget />
                        {test.totalQuestions} Questions
                      </span>

                      <span>
                        <FiClock />
                        {test.durationMinutes} Minutes
                      </span>

                      <span>
                        <FiCheckCircle />
                        {formatNumber(test.totalMarks)} Marks
                      </span>
                    </div>
                  </div>

                  <div className="spz-test-card__footer">
                    <span>Unlimited attempts</span>

                    <button
                      type="button"
                      onClick={() => openInstructions(test)}
                    >
                      View Instructions <FiArrowRight />
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
