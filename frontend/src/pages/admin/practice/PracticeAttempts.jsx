import { useCallback, useEffect, useState } from "react";
import {
  FiActivity,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import {
  getPracticeAttempts,
  getPracticeAttempt,
} from "../../../services/practiceService";

import Pagination from "../../../components/common/Pagination";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/PracticeAttempts.css";

const DEFAULT_LIMIT = 10;

const EMPTY_FILTERS = {
  test_id: "",
  course_id: "",
  subject_id: "",
  student_id: "",
  status: "",
};

const EMPTY_STATS = {
  total: 0,
  inProgress: 0,
  submitted: 0,
  timedOut: 0,
};

const unwrap = (response) => response?.data ?? response;

const getStudentName = (student) => {
  if (!student) return "Unknown Student";

  const name = [
    student.firstName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || student.name || "Unknown Student";
};

const getStatusClass = (status) =>
  `practice-attempt-status practice-attempt-${String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

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

  return question?.[`option${option}`] || option;
};

const getAnswerClass = (question) => {
  if (!question.selectedAnswer) return "unanswered";

  return question.selectedAnswer === question.correctAnswer
    ? "correct"
    : "incorrect";
};

export default function PracticeAttempts() {
  const [attempts, setAttempts] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    tests: [],
    courses: [],
    subjects: [],
    students: [],
  });

  const [stats, setStats] = useState(EMPTY_STATS);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [loading, setLoading] = useState(false);

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce server-side search to avoid one request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ---------------------------------------------------------
  // LOAD ATTEMPTS
  // ---------------------------------------------------------

  const loadAttempts = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        page,
        limit,
      };

      if (search) {
        params.search = search;
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params[key] = value;
        }
      });

      const response = await getPracticeAttempts(params);

      const root = unwrap(response);
      const data = root?.data ?? root;

      setAttempts(
        Array.isArray(data?.attempts)
          ? data.attempts
          : []
      );

      setPagination({
        page: Number(data?.pagination?.page) || page,
        limit: Number(data?.pagination?.limit) || limit,
        total: Number(data?.pagination?.total) || 0,
        totalPages: Number(data?.pagination?.totalPages) || 0,
      });

      setStats({
        total: Number(data?.stats?.total) || 0,
        inProgress: Number(data?.stats?.inProgress) || 0,
        submitted: Number(data?.stats?.submitted) || 0,
        timedOut: Number(data?.stats?.timedOut) || 0,
      });

      setFilterOptions({
        tests: Array.isArray(data?.filterOptions?.tests)
          ? data.filterOptions.tests
          : [],
        courses: Array.isArray(data?.filterOptions?.courses)
          ? data.filterOptions.courses
          : [],
        subjects: Array.isArray(data?.filterOptions?.subjects)
          ? data.filterOptions.subjects
          : [],
        students: Array.isArray(data?.filterOptions?.students)
          ? data.filterOptions.students
          : [],
      });
    } catch (err) {
      notification.error(getApiErrorMessage(err));
      setAttempts([]);
      setPagination({
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, filters]);

  useEffect(() => {
    loadAttempts();
  }, [loadAttempts]);

  // ---------------------------------------------------------
  // FILTER HANDLING
  // ---------------------------------------------------------

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const hasActiveFilters =
    Object.values(filters).some(Boolean) ||
    Boolean(searchInput.trim());

  // ---------------------------------------------------------
  // VIEW ATTEMPT
  // ---------------------------------------------------------

  const handleViewAttempt = async (attempt) => {
    setSelectedAttempt(null);

    if (attempt.status === "In Progress") {
      setSelectedAttempt({
        ...attempt,
        _reviewUnavailable: true,
      });

      return;
    }

    setDetailLoading(true);

    try {
      const response = await getPracticeAttempt(attempt._id);

      const root = unwrap(response);
      const data = root?.data ?? root;

      if (!data || !Array.isArray(data.questions)) {
        throw new Error(
          "Attempt review data is incomplete. Please refresh and try again."
        );
      }

      setSelectedAttempt(data);
    } catch (err) {
      notification.error(getApiErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedAttempt(null);
  };

  // ---------------------------------------------------------
  // DETAIL DATA
  // ---------------------------------------------------------

  const reviewQuestions = selectedAttempt?.questions || [];

  const detailStudent = selectedAttempt?.student_id;
  const detailTest = selectedAttempt?.practiceTest_id;
  const detailCourse = selectedAttempt?.course_id;
  const detailSubject = selectedAttempt?.subject_id;

  const correctCount = Number(
    selectedAttempt?.correctCount || 0
  );

  const incorrectCount = Number(
    selectedAttempt?.incorrectCount || 0
  );

  const unansweredCount = Number(
    selectedAttempt?.unansweredCount || 0
  );

  const totalPages = Math.max(
    pagination.totalPages,
    1
  );

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="practice-attempts-page">
      <header className="practice-attempts-header">
        <div>
          <span className="practice-attempts-eyebrow">
            PRACTICE ZONE / RESULTS
          </span>

          <h1>Attempts & Results</h1>

          <p>
            Monitor student practice attempts, scores and
            question-wise answers.
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

      {!selectedAttempt && !detailLoading && (
        <>
          {/* GLOBAL STATISTICS */}
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

          {/* ATTEMPTS TABLE */}
          <section className="practice-attempts-card">
            <div className="practice-attempts-section-heading">
              <div>
                <h2>Student Attempts</h2>

                <p>
                  {loading
                    ? "Loading attempts..."
                    : `${pagination.total} attempt(s) found`}
                  {hasActiveFilters
                    ? " with current filters"
                    : ""}
                </p>
              </div>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="practice-attempts-filters">
              <label className="practice-attempts-search">
                <FiSearch />

                <input
                  type="search"
                  value={searchInput}
                  maxLength={100}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="Search student, roll number, test..."
                  aria-label="Search attempts"
                />
              </label>

              <select
                name="test_id"
                value={filters.test_id}
                onChange={handleFilterChange}
                aria-label="Filter by practice test"
              >
                <option value="">All Tests</option>

                {filterOptions.tests.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.title || "Untitled Test"}
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

                {filterOptions.courses.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.courseTitle || "Unknown Course"}
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

                {filterOptions.subjects.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.subjectName || "Unknown Subject"}
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

                {filterOptions.students.map((item) => (
                  <option key={item._id} value={item._id}>
                    {getStudentName(item)}
                    {" ("}
                    {item.rollNo || "No Roll No"}
                    {")"}
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

            {/* TABLE */}
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
                      <td
                        colSpan="9"
                        className="practice-attempts-empty"
                      >
                        Loading student attempts...
                      </td>
                    </tr>
                  ) : attempts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="practice-attempts-empty"
                      >
                        {hasActiveFilters
                          ? "No attempts match your search or filters."
                          : "No practice attempts found."}
                      </td>
                    </tr>
                  ) : (
                    attempts.map((attempt, index) => {
                      const student = attempt.student_id;

                      const isSubmitted = [
                        "Submitted",
                        "Timed Out",
                      ].includes(attempt.status);

                      return (
                        <tr key={attempt._id}>
                          <td>
                            {(page - 1) * limit + index + 1}
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
                            <span
                              className={getStatusClass(attempt.status)}
                            >
                              {attempt.status}
                            </span>
                          </td>

                          <td>
                            {isSubmitted ? (
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
                            {isSubmitted ? (
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
                              onClick={() =>
                                handleViewAttempt(attempt)
                              }
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

            <Pagination
              page={page}
              totalPages={totalPages}
              total={pagination.total}
              itemCount={attempts.length}
              itemLabel="attempts"
              limit={limit}
              loading={loading}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
            />
          </section>
        </>
      )}

      {/* DETAIL LOADING */}
      {detailLoading && (
        <section className="practice-attempts-card">
          <div className="practice-attempts-loading">
            <FiRefreshCw />
            Loading attempt details...
          </div>
        </section>
      )}

      {/* DETAIL VIEW */}
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

          {/* STUDENT AND TEST INFORMATION */}
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
                  selectedAttempt.startedAt ||
                  selectedAttempt.createdAt
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

          {/* IN-PROGRESS ATTEMPT: NO ANSWER KEY */}
          {selectedAttempt._reviewUnavailable ? (
            <section className="practice-attempts-card practice-attempts-unavailable">
              <FiClock />

              <div>
                <h3>Answer review is not available yet</h3>

                <p>
                  This attempt is still in progress. Correct answers
                  are intentionally hidden until the student submits
                  the test or the attempt times out.
                </p>
              </div>
            </section>
          ) : (
            <>
              {/* RESULT SUMMARY */}
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

              {/* ANSWER REVIEW */}
              <div className="practice-attempts-review-heading">
                <div>
                  <h3>Answer Review</h3>

                  <p>
                    {reviewQuestions.length} question(s)
                  </p>
                </div>

                <div className="practice-attempts-review-legend">
                  <span>
                    <i className="correct" />
                    Correct
                  </span>

                  <span>
                    <i className="incorrect" />
                    Incorrect
                  </span>

                  <span>
                    <i className="unanswered" />
                    Unanswered
                  </span>
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

                    const marksAwarded =
                      question.selectedAnswer &&
                      question.selectedAnswer === question.correctAnswer
                        ? selectedAttempt.marksPerQuestion
                        : 0;

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

                            <span
                              className={`question-result ${statusClass}`}
                            >
                              {statusClass === "correct"
                                ? "Correct"
                                : statusClass === "incorrect"
                                  ? "Incorrect"
                                  : "Unanswered"}
                            </span>
                          </div>

                          <span>
                            {formatMarks(marksAwarded)}
                            {" / "}
                            {formatMarks(
                              selectedAttempt.marksPerQuestion
                            )}
                            {" marks"}
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
                              isSelected && !isCorrect
                                ? "wrong-answer"
                                : "",
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

          {/* ATTEMPT TIMING */}
          <div className="practice-attempts-detail-footer">
            <span>
              Started: {formatDateTime(selectedAttempt.startedAt)}
            </span>

            <span>
              Submitted: {formatDateTime(selectedAttempt.submittedAt)}
            </span>

            <span>
              Time Taken:{" "}
              {Math.floor(
                Number(selectedAttempt.timeTakenSeconds || 0) / 60
              )}
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