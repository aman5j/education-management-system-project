
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "react-icons/fi";

import practiceStudentService from "../../services/practiceStudentService";
import "./StudentPracticeZone.css";

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

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await practiceStudentService.getAvailableTests();

      const data = getData(response);

      setTests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(getError(err));
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

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
      setDetailError(getError(err));
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
                    Your answers are saved during the attempt.
                  </li>
                  <li>
                    The test will be submitted when you finish or the timer expires.
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

              <div className="spz-phase-notice">
                <FiClock />
                <div>
                  <strong>Practice test screen is the next development step.</strong>
                  <p>
                    Your test and instructions are ready. The interactive
                    quiz, timer and answer-saving screen will be connected
                    in Phase 5.
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </section>
      </main>
    );
  }

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
