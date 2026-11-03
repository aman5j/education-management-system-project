
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiArrowLeft,
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiTarget,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import { getPracticeAttempts, getPracticeAttempt } from "../../../services/practiceService";

import "../../../styles/PracticeAttempts.css";

const PAGE_SIZE = 10;

const unwrap = (response) => response?.data ?? response;

const getArray = (response) => {
  const root = unwrap(response);
  const data = root?.data ?? root;

  return Array.isArray(data) ? data : [];
};

const getId = (value) =>
  typeof value === "object" ? value?._id : value;

const getStudentName = (student) => {
  if (!student) return "Unknown Student";

  const name = [student.firstName, student.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || student.name || "Unknown Student";
};

const getStatusClass = (status) =>
  `practice-attempt-status practice-attempt-${String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMarks = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Number(number.toFixed(2)).toString()
    : "0";
};

const getOptionText = (question, option) => {
  if (!option) return "Not answered";

  const key = `option${option}`;

  return question?.[key] || option;
};

const getAnswerClass = (question) => {
  if (!question.selectedAnswer) return "unanswered";

  return question.selectedAnswer === question.correctAnswer
    ? "correct"
    : "incorrect";
};

export default function PracticeAttempts() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({
    test_id: "",
    course_id: "",
    subject_id: "",
    student_id: "",
    status: "",
  });

  const [page, setPage] = useState(1);

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [detailError, setDetailError] = useState("");

  const loadAttempts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const response = await getPracticeAttempts(params);
      const data = getArray(response);

      setAttempts(data);
      setPage(1);
    } catch (err) {
      setError(getErrorMessage(err));
      setAttempts([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  const stats = useMemo(() => {
    const total = attempts.length;

    const inProgress = attempts.filter(
      (item) => item.status === "In Progress"
    ).length;

    const submitted = attempts.filter(
      (item) => item.status === "Submitted"
    ).length;

    const timedOut = attempts.filter(
      (item) => item.status === "Timed Out"
    ).length;

    return {
      total,
      inProgress,
      submitted,
      timedOut,
    };
  }, [attempts]);

  const options = useMemo(() => {
    const tests = new Map();
    const courses = new Map();
    const subjects = new Map();
    const students = new Map();

    attempts.forEach((attempt) => {
      const test = attempt.practiceTest_id;
      const course = attempt.course_id;
      const subject = attempt.subject_id;
      const student = attempt.student_id;

      if (test?._id) {
        tests.set(String(test._id), test.title || "Untitled Test");
      }

      if (course?._id) {
        courses.set(
          String(course._id),
          course.courseTitle || "Unknown Course"
        );
      }

      if (subject?._id) {
        subjects.set(
          String(subject._id),
          subject.subjectName || "Unknown Subject"
        );
      }

      if (student?._id) {
        students.set(
          String(student._id),
          `${getStudentName(student)} (${student.rollNo || "No Roll No"})`
        );
      }
    });

    const toOptions = (map) =>
      Array.from(map.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return {
      tests: toOptions(tests),
      courses: toOptions(courses),
      subjects: toOptions(subjects),
      students: toOptions(students),
    };
  }, [attempts]);

  const filteredAttempts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return attempts;

    return attempts.filter((attempt) => {
      const student = attempt.student_id;
      const test = attempt.practiceTest_id;
      const course = attempt.course_id;
      const subject = attempt.subject_id;

      const searchable = [
        getStudentName(student),
        student?.rollNo,
        test?.title,
        course?.courseTitle,
        subject?.subjectName,
        attempt.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [attempts, search]);

  const totalPages = Math.max(
    Math.ceil(filteredAttempts.length / PAGE_SIZE),
    1
  );

  const visibleAttempts = filteredAttempts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      test_id: "",
      course_id: "",
      subject_id: "",
      student_id: "",
      status: "",
    });

    setSearch("");
  };

  const handleViewAttempt = async (attempt) => {
    if (attempt.status === "In Progress") {
      setSelectedAttempt({
        ...attempt,
        _reviewUnavailable: true,
      });

      setDetailError("");
      return;
    }

    setSelectedAttempt(null);
    setDetailError("");
    setDetailLoading(true);
    setError("");

    try {
      const response = await getPracticeAttempt(attempt._id);
      const root = unwrap(response);
      const data = root?.data ?? root;

      setSelectedAttempt(data);
    } catch (err) {
      setDetailError(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedAttempt(null);
    setDetailError("");
  };

  const hasActiveFilters =
    Object.values(filters).some(Boolean) || Boolean(search);

  const reviewQuestions = selectedAttempt?.questions || [];

  const detailStudent = selectedAttempt?.student_id;
  const detailTest = selectedAttempt?.practiceTest_id;
  const detailCourse = selectedAttempt?.course_id;
  const detailSubject = selectedAttempt?.subject_id;

  const correctCount = Number(selectedAttempt?.correctCount || 0);
  const incorrectCount = Number(selectedAttempt?.incorrectCount || 0);
  const unansweredCount = Number(selectedAttempt?.unansweredCount || 0);

  return (
    <main className="practice-attempts-page">
      <header className="practice-attempts-header">
        <div>
          <span className="practice-attempts-eyebrow">
            PRACTICE ZONE / RESULTS
          </span>

          <h1>Attempts & Results</h1>

          <p>
            Monitor student practice attempts, scores and question-wise answers.
          </p>
        </div>

        <div className="practice-attempts-header-actions">
          <button
            type="button"
            className="practice-attempts-secondary-btn"
            onClick={loadAttempts}
            disabled={loading}
          >
            <FiRefreshCw />
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="practice-attempts-alert error" role="alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            <FiX />
          </button>
        </div>
      )}

      {success && (
        <div className="practice-attempts-alert success" role="status">
          <FiCheckCircle />
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss"
          >
            <FiX />
          </button>
        </div>
      )}

      {!selectedAttempt && !detailLoading && (
        <>
          <section className="practice-attempts-stats">
            <article className="practice-attempts-stat-card">
              <span className="stat-icon blue">
                <FiActivity />
              </span>

              <div>
                <small>Total Attempts</small>
                <strong>{stats.total}</strong>
              </div>
            </article>

            <article className="practice-attempts-stat-card">
              <span className="stat-icon orange">
                <FiClock />
              </span>

              <div>
                <small>In Progress</small>
                <strong>{stats.inProgress}</strong>
              </div>
            </article>

            <article className="practice-attempts-stat-card">
              <span className="stat-icon green">
                <FiCheckCircle />
              </span>

              <div>
                <small>Submitted</small>
                <strong>{stats.submitted}</strong>
              </div>
            </article>

            <article className="practice-attempts-stat-card">
              <span className="stat-icon red">
                <FiXCircle />
              </span>

              <div>
                <small>Timed Out</small>
                <strong>{stats.timedOut}</strong>
              </div>
            </article>
          </section>

          <section className="practice-attempts-card">
            <div className="practice-attempts-section-heading">
              <div>
                <h2>Student Attempts</h2>

                <p>
                  {filteredAttempts.length} attempt(s) found
                  {hasActiveFilters ? " with current filters" : ""}
                </p>
              </div>
            </div>

            <div className="practice-attempts-filters">
              <label className="practice-attempts-search">
                <FiSearch />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search student, roll number, test..."
                />
              </label>

              <select
                name="test_id"
                value={filters.test_id}
                onChange={handleFilterChange}
                aria-label="Filter by practice test"
              >
                <option value="">All Tests</option>

                {options.tests.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                name="course_id"
                value={filters.course_id}
                onChange={handleFilterChange}
                aria-label="Filter by course"
              >
                <option value="">All Courses</option>

                {options.courses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                name="subject_id"
                value={filters.subject_id}
                onChange={handleFilterChange}
                aria-label="Filter by subject"
              >
                <option value="">All Subjects</option>

                {options.subjects.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                name="student_id"
                value={filters.student_id}
                onChange={handleFilterChange}
                aria-label="Filter by student"
              >
                <option value="">All Students</option>

                {options.students.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                aria-label="Filter by attempt status"
              >
                <option value="">All Statuses</option>
                <option value="In Progress">In Progress</option>
                <option value="Submitted">Submitted</option>
                <option value="Timed Out">Timed Out</option>
              </select>

              <button
                type="button"
                className="practice-attempts-clear-btn"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                <FiFilter />
                Clear
              </button>
            </div>

            <div className="practice-attempts-table-wrap">
              <table className="practice-attempts-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Practice Test</th>
                    <th>Course / Subject</th>
                    <th>Attempt Date</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Correct / Incorrect / Unanswered</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="practice-attempts-empty">
                        Loading student attempts...
                      </td>
                    </tr>
                  ) : visibleAttempts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="practice-attempts-empty">
                        No practice attempts found.
                      </td>
                    </tr>
                  ) : (
                    visibleAttempts.map((attempt, index) => {
                      const student = attempt.student_id;

                      const submitted = [
                        "Submitted",
                        "Timed Out",
                      ].includes(attempt.status);

                      return (
                        <tr key={attempt._id}>
                          <td>
                            {(page - 1) * PAGE_SIZE + index + 1}
                          </td>

                          <td>
                            <strong>
                              {getStudentName(student)}
                            </strong>

                            <small>
                              Roll No: {student?.rollNo || "—"}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {attempt.practiceTest_id?.title || "—"}
                            </strong>
                          </td>

                          <td>
                            <strong>
                              {attempt.course_id?.courseTitle || "—"}
                            </strong>

                            <small>
                              {attempt.subject_id?.subjectName || "—"}
                            </small>
                          </td>

                          <td>
                            {formatDateTime(
                              attempt.startedAt || attempt.createdAt
                            )}
                          </td>

                          <td>
                            <span className={getStatusClass(attempt.status)}>
                              {attempt.status}
                            </span>
                          </td>

                          <td>
                            {submitted ? (
                              <>
                                <strong>
                                  {formatMarks(attempt.marksObtained)}
                                  {" / "}
                                  {formatMarks(attempt.totalMarks)}
                                </strong>

                                <small>
                                  {formatMarks(attempt.percentage)}%
                                </small>
                              </>
                            ) : (
                              <span className="practice-attempts-muted">
                                Not submitted
                              </span>
                            )}
                          </td>

                          <td>
                            {submitted ? (
                              <span className="practice-attempts-counts">
                                <b className="count-correct">
                                  {attempt.correctCount ?? 0}
                                </b>

                                <b className="count-incorrect">
                                  {attempt.incorrectCount ?? 0}
                                </b>

                                <b className="count-unanswered">
                                  {attempt.unansweredCount ?? 0}
                                </b>
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="practice-attempts-view-btn"
                              onClick={() => handleViewAttempt(attempt)}
                              disabled={detailLoading}
                            >
                              <FiEye />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="practice-attempts-pagination">
              <span>
                Page {page} of {totalPages}
              </span>

              <div>
                <button
                  type="button"
                  className="practice-attempts-secondary-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="practice-attempts-secondary-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {detailLoading && (
        <section className="practice-attempts-card">
          <div className="practice-attempts-loading">
            <FiRefreshCw />
            Loading attempt details...
          </div>
        </section>
      )}

      {detailError && (
        <div className="practice-attempts-alert error" role="alert">
          <span>{detailError}</span>

          <button
            type="button"
            onClick={() => setDetailError("")}
            aria-label="Dismiss"
          >
            <FiX />
          </button>
        </div>
      )}

      {selectedAttempt && (
        <section className="practice-attempts-detail">
          <div className="practice-attempts-detail-header">
            <div>
              <span className="practice-attempts-eyebrow">
                ATTEMPT DETAILS
              </span>

              <h2>Question-wise Answer Review</h2>

              <p>
                {detailTest?.title || "Practice Attempt"}
              </p>
            </div>

            <button
              type="button"
              className="practice-attempts-secondary-btn"
              onClick={closeDetail}
            >
              <FiArrowLeft />
              Back to Attempts
            </button>
          </div>

          <section className="practice-attempts-card practice-attempts-student-info">
            <div>
              <small>Student</small>
              <strong>{getStudentName(detailStudent)}</strong>
              <span>
                Roll No: {detailStudent?.rollNo || "—"}
              </span>
            </div>

            <div>
              <small>Practice Test</small>
              <strong>{detailTest?.title || "—"}</strong>
            </div>

            <div>
              <small>Course</small>
              <strong>{detailCourse?.courseTitle || "—"}</strong>
            </div>

            <div>
              <small>Subject</small>
              <strong>{detailSubject?.subjectName || "—"}</strong>
            </div>

            <div>
              <small>Attempt Date</small>
              <strong>
                {formatDateTime(
                  selectedAttempt.startedAt || selectedAttempt.createdAt
                )}
              </strong>
            </div>

            <div>
              <small>Status</small>
              <strong>
                <span className={getStatusClass(selectedAttempt.status)}>
                  {selectedAttempt.status}
                </span>
              </strong>
            </div>
          </section>

          {selectedAttempt._reviewUnavailable ? (
            <section className="practice-attempts-card practice-attempts-unavailable">
              <FiClock />

              <div>
                <h3>Answer review is not available yet</h3>

                <p>
                  This attempt is still in progress. Correct answers are
                  intentionally hidden until the student submits the test or
                  the attempt times out.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section className="practice-attempts-result-grid">
                <article>
                  <small>Marks Obtained</small>

                  <strong>
                    {formatMarks(selectedAttempt.marksObtained)}
                    {" / "}
                    {formatMarks(selectedAttempt.totalMarks)}
                  </strong>
                </article>

                <article>
                  <small>Percentage</small>

                  <strong>
                    {formatMarks(selectedAttempt.percentage)}%
                  </strong>
                </article>

                <article>
                  <small>Correct</small>

                  <strong className="result-correct">
                    {correctCount}
                  </strong>
                </article>

                <article>
                  <small>Incorrect</small>

                  <strong className="result-incorrect">
                    {incorrectCount}
                  </strong>
                </article>

                <article>
                  <small>Unanswered</small>

                  <strong className="result-unanswered">
                    {unansweredCount}
                  </strong>
                </article>
              </section>

              <div className="practice-attempts-review-heading">
                <div>
                  <h3>Answer Review</h3>

                  <p>
                    {reviewQuestions.length} question(s)
                  </p>
                </div>

                <div className="practice-attempts-review-legend">
                  <span><i className="correct" /> Correct</span>
                  <span><i className="incorrect" /> Incorrect</span>
                  <span><i className="unanswered" /> Unanswered</span>
                </div>
              </div>

              {reviewQuestions.length === 0 ? (
                <section className="practice-attempts-card practice-attempts-empty">
                  No question review data is available.
                </section>
              ) : (
                <div className="practice-attempts-questions">
                  {reviewQuestions.map((question, index) => {
                    const statusClass = getAnswerClass(question);

                    return (
                      <article
                        className={`practice-attempt-question ${statusClass}`}
                        key={`${question.question_id || index}-${index}`}
                      >
                        <header>
                          <div>
                            <span className="question-number">
                              Question {index + 1}
                            </span>

                            <span className={`question-result ${statusClass}`}>
                              {statusClass === "correct"
                                ? "Correct"
                                : statusClass === "incorrect"
                                  ? "Incorrect"
                                  : "Unanswered"}
                            </span>
                          </div>

                          <span>
                            {formatMarks(
                              question.selectedAnswer &&
                              question.selectedAnswer === question.correctAnswer
                                ? selectedAttempt.marksPerQuestion
                                : 0
                            )}
                            {" / "}
                            {formatMarks(selectedAttempt.marksPerQuestion)} marks
                          </span>
                        </header>

                        <h4>{question.questionText}</h4>

                        <div className="practice-attempt-options">
                          {["A", "B", "C", "D"].map((option) => {
                            const isSelected =
                              question.selectedAnswer === option;

                            const isCorrect =
                              question.correctAnswer === option;

                            const optionClass = [
                              isSelected ? "selected" : "",
                              isCorrect ? "correct-answer" : "",
                              isSelected && !isCorrect ? "wrong-answer" : "",
                            ]
                              .filter(Boolean)
                              .join(" ");

                            return (
                              <div
                                className={`practice-attempt-option ${optionClass}`}
                                key={option}
                              >
                                <span className="option-label">
                                  {option}
                                </span>

                                <span>
                                  {getOptionText(question, option)}
                                </span>

                                {isCorrect && (
                                  <FiCheckCircle className="option-correct-icon" />
                                )}

                                {isSelected && !isCorrect && (
                                  <FiXCircle className="option-wrong-icon" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="practice-attempt-answer-summary">
                          <span>
                            Selected Answer:{" "}
                            <strong>
                              {question.selectedAnswer || "Not answered"}
                            </strong>
                          </span>

                          <span>
                            Correct Answer:{" "}
                            <strong>
                              {question.correctAnswer || "—"}
                            </strong>
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <div className="practice-attempts-detail-footer">
            <span>
              Started: {formatDateTime(selectedAttempt.startedAt)}
            </span>

            <span>
              Submitted: {formatDateTime(selectedAttempt.submittedAt)}
            </span>

            <span>
              Time Taken:{" "}
              {Math.floor(Number(selectedAttempt.timeTakenSeconds || 0) / 60)}
              {" min "}
              {Number(selectedAttempt.timeTakenSeconds || 0) % 60}
              {" sec"}
            </span>
          </div>
        </section>
      )}
    </main>
  );
}
