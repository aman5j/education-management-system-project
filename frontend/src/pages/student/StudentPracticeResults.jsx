
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBookOpen,
  FiCheckCircle,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiXCircle,
  FiX,
  FiArrowRight,
} from "react-icons/fi";
import { CgMathPercent } from "react-icons/cg";
import { IoCheckmarkDoneCircleSharp } from "react-icons/io5";
import { FaBookOpenReader } from "react-icons/fa6";
import { MdOutlineAccessTimeFilled } from "react-icons/md";
import { FaBookmark } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";




import { MdOutlineDateRange } from "react-icons/md";

import practiceStudentService from "../../services/practiceStudentService";
import "./StudentPracticeResults.css";

const ACTIVE_ATTEMPT_KEY = "ems_student_practice_active_attempt_v1";

const getData = (response) =>
  response?.data?.data ?? response?.data ?? response;

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
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

const formatDuration = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

const getStatusClass = (status) => {
  if (status === "Submitted") return "spr-status--submitted";
  if (status === "Timed Out") return "spr-status--timeout";
  return "spr-status--progress";
};

function SummaryCard({ icon: Icon, label, value, description }) {
  return (
    <article className="spr-summary-card">
      <span className="spr-summary-card__icon">
        <Icon />
      </span>

      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{description}</p>
      </div>
    </article>
  );
}

export default function StudentPracticeResults() {
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Completed");
  const [courseFilter, setCourseFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await practiceStudentService.getAttemptHistory();

      const payload = getData(response);

      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      setAttempts(rows);
    } catch (err) {
      setAttempts([]);
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const completedAttempts = useMemo(
    () =>
      attempts.filter((attempt) =>
        ["Submitted", "Timed Out"].includes(attempt.status)
      ),
    [attempts]
  );

  const averagePercentage = useMemo(() => {
    if (!completedAttempts.length) return 0;

    const total = completedAttempts.reduce(
      (sum, attempt) => sum + Number(attempt.percentage || 0),
      0
    );

    return total / completedAttempts.length;
  }, [completedAttempts]);

  const bestPercentage = useMemo(
    () =>
      completedAttempts.reduce(
        (best, attempt) =>
          Math.max(best, Number(attempt.percentage || 0)),
        0
      ),
    [completedAttempts]
  );

  const totalMarksObtained = useMemo(
    () =>
      completedAttempts.reduce(
        (sum, attempt) => sum + Number(attempt.marksObtained || 0),
        0
      ),
    [completedAttempts]
  );

  const courses = useMemo(() => {
    const map = new Map();

    attempts.forEach((attempt) => {
      const course = attempt.course_id;

      if (course?._id) {
        map.set(String(course._id), course.courseTitle);
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [attempts]);

  const subjects = useMemo(() => {
    const map = new Map();

    attempts.forEach((attempt) => {
      const courseMatches =
        !courseFilter ||
        String(attempt.course_id?._id) === courseFilter;

      if (courseMatches && attempt.subject_id?._id) {
        map.set(
          String(attempt.subject_id._id),
          attempt.subject_id.subjectName
        );
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [attempts, courseFilter]);

  const filteredAttempts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const testTitle = attempt.practiceTest_id?.title || "";

      const matchesSearch =
        !keyword ||
        [
          testTitle,
          attempt.course_id?.courseTitle,
          attempt.subject_id?.subjectName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword);

      const isCompleted = ["Submitted", "Timed Out"].includes(
        attempt.status
      );

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Completed" && isCompleted) ||
        (statusFilter === "In Progress" &&
          attempt.status === "In Progress") ||
        attempt.status === statusFilter;

      const matchesCourse =
        !courseFilter ||
        String(attempt.course_id?._id) === courseFilter;

      const matchesSubject =
        !subjectFilter ||
        String(attempt.subject_id?._id) === subjectFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse &&
        matchesSubject
      );
    });
  }, [
    attempts,
    search,
    statusFilter,
    courseFilter,
    subjectFilter,
  ]);

  const openAttemptDetails = async (attempt) => {
    if (!attempt?._id) return;

    setSelectedAttempt(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response =
        await practiceStudentService.getAttempt(attempt._id);

      const payload = getData(response);
      const details = payload?.data ?? payload;

      if (details?.status === "In Progress") {
        throw new Error(
          "This attempt is still in progress. Resume it to continue."
        );
      }

      setSelectedAttempt(details);
    } catch (err) {
      setDetailError(getError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const resumeAttempt = (attempt) => {
    const attemptId = attempt._id;

    if (!attemptId) return;

    localStorage.setItem(
      ACTIVE_ATTEMPT_KEY,
      JSON.stringify({
        attemptId,
        testId:
          typeof attempt.practiceTest_id === "object"
            ? attempt.practiceTest_id?._id
            : attempt.practiceTest_id,
        title: attempt.practiceTest_id?.title || "Practice Test",
      })
    );

    navigate("/student/practice");
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("Completed");
    setCourseFilter("");
    setSubjectFilter("");
  };

  const hasFilters =
    Boolean(search || courseFilter || subjectFilter) ||
    statusFilter !== "Completed";

  if (selectedAttempt) {
    const questions = Array.isArray(selectedAttempt.questions)
      ? selectedAttempt.questions
      : [];

    return (
      <main className="spr-page">
       
        <div class="page-header"><div><h1> Answer Sheet Review {selectedAttempt.practiceTest_id?.title ||
                "Practice Test"} </h1>
                 <p>
              {selectedAttempt.course_id?.courseTitle || "Course"}
              {" · "}  
               {selectedAttempt.subject_id?.subjectName || "Subject"}
            </p>
                </div>
         <button
          type="button"
          className="themebtn"
          onClick={() => setSelectedAttempt(null)}
        >
          Back to Results
        </button>
        </div>
        <section className="spr-detail-stats">
          <article class="dashboard-stat-card card-purple">
            <div class="stat-card-top">
              <div class="stat-icon stat-icon-purple">
                <FaBookOpenReader />

              </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Marks Obtained</span>
                <strong class="stat-card-value">{formatNumber(selectedAttempt.marksObtained)} /{" "}
              {formatNumber(selectedAttempt.totalMarks)}</strong>
              </div>
          </article>
           <article class="dashboard-stat-card card-success">
            <div class="stat-card-top">
              <div class="stat-icon stat-icon-success">
               <IoCheckmarkDoneCircleSharp />


              </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Correct</span>
                <strong class="stat-card-value">{selectedAttempt.correctCount ?? 0}</strong>
              </div>
          </article>

           <article class="dashboard-stat-card card-danger">
            <div class="stat-card-top">
              <div class="stat-icon stat-icon-danger">
                <IoMdCloseCircle />


              </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Incorrect</span>
                <strong class="stat-card-value">{selectedAttempt.incorrectCount ?? 0}</strong>
              </div>
          </article>

 <article class="dashboard-stat-card card-bluewarning">
            <div class="stat-card-top">
              <div class="stat-icon stat-icon-bluewarning">
               <CgMathPercent />



              </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Percentage</span>
                <strong class="stat-card-value">{formatNumber(selectedAttempt.percentage)}%</strong>
              </div>
          </article>

          

           <article class="dashboard-stat-card card-warning">
            <div class="stat-card-top">
              <div class="stat-icon stat-icon-warning">
                <FaBookmark />


              </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Unanswered</span>
                <strong class="stat-card-value">{selectedAttempt.unansweredCount ?? 0}</strong>
              </div>
          </article>

           <article class="dashboard-stat-card card-purple">
            <div class="stat-card-top">
              <div class="stat-icon stat-icon-purple">
               <MdOutlineAccessTimeFilled />


              </div>
              </div>
              <div class="stat-card-body">
                <span class="stat-card-title">Time Taken</span>
                <strong class="stat-card-value">{formatDuration(selectedAttempt.timeTakenSeconds)}</strong>
              </div>
          </article>

        </section>
        {questions.length === 0 ? (
          <div className="spr-empty">
            <FiFileText />
            <h3>No question details available</h3>
            <p>The question review is not available for this attempt.</p>
          </div>
        ) : (
          <div className="common-card">
           
             <div class="panel-header"><div><h3>Question-wise Review</h3> </div> 
              <span className="questionscount">Total Questions: {questions.length} </span>
             </div>
            <div className="cardbody">
               <div className="spr-review-list">
            {questions.map((question, index) => {
              const selected = question.selectedAnswer || "";
              const correct = question.correctAnswer || "";
              const isCorrect =
                Boolean(selected) && selected === correct;

              return (
                <article
                  className={`spr-review-card ${
                    !selected
                      ? "spr-review-card--unanswered"
                      : isCorrect
                        ? "spr-review-card--correct"
                        : "spr-review-card--incorrect"
                  }`}
                  key={question.question_id || index}
                >
                  <div className="spr-review-card__top">
                   
                    {!selected ? (
                      <span className="spr-review-result spr-review-result--empty">
                        Unanswered
                      </span>
                    ) : isCorrect ? (
                      <span className="spr-review-result spr-review-result--correct">
                        <FiCheckCircle /> Correct
                      </span>
                    ) : (
                      <span className="spr-review-result spr-review-result--incorrect">
                        <FiXCircle /> Incorrect
                      </span>
                    )}
                  </div>

                  <h3><strong>Q.{index + 1}</strong> {question.questionText}</h3>

                  <div className="spr-review-options">
                    {["A", "B", "C", "D"].map((option) => {
                      const optionText =
                        question[`option${option}`];

                      const isSelected = selected === option;
                      const isAnswer = correct === option;

                      let className = "spr-review-option";

                      if (isAnswer) {
                        className += " spr-review-option--correct";
                      } else if (isSelected) {
                        className += " spr-review-option--wrong";
                      }

                      return (
                        <div
                          className={className}
                          key={option}
                        >
                          <span>{option}</span>
                          <p>{optionText}</p>

                          {isAnswer && (
                            <FiCheckCircle aria-label="Correct answer" />
                          )}

                          {!isAnswer && isSelected && (
                            <FiXCircle aria-label="Your incorrect answer" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="spr-answer-summary">
                    <span>
                      Your answer:{" "}
                      <strong>{selected || "Not answered"}</strong>
                    </span>

                    <span>
                      Correct answer: <strong>{correct || "—"}</strong>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="spr-page">
       <div class="page-header"><div><h1>My Practice Results</h1></div>
     </div>

      {/* <section className="spr-summary-grid">
        <SummaryCard
          icon={FiActivity}
          label="Completed Attempts"
          value={completedAttempts.length}
          description="Submitted and timed-out attempts"
        />

        <SummaryCard
          icon={FiTarget}
          label="Average Score"
          value={`${formatNumber(averagePercentage)}%`}
          description="Average percentage across completed tests"
        />

        <SummaryCard
          icon={FiAward}
          label="Best Score"
          value={`${formatNumber(bestPercentage)}%`}
          description="Your highest percentage"
        />

        <SummaryCard
          icon={FiCheckCircle}
          label="Total Marks"
          value={formatNumber(totalMarksObtained)}
          description="Marks obtained across completed attempts"
        />
      </section> */}

      <div className=" common-card-filters">
        <div className="input-search">
          <FiSearch />
          <input
            type="search"
            placeholder="Search test, course or subject..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="input-search">
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by attempt status"
        >
          <option value="Completed">Completed Attempts</option>
          <option value="All">All Attempts</option>
          <option value="Submitted">Submitted</option>
          <option value="Timed Out">Timed Out</option>
          <option value="In Progress">In Progress</option>
        </select>
</div>
<div className="input-search">
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
</div>
<div className="input-search">
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
        </div>

        {hasFilters && (
          <button
            type="button"
            className="themebtn themebtnline"
            onClick={clearFilters}
          >
            <FiX /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="spr-state">
          <FiRefreshCw className="spr-spin" />
          <h3>Loading your results</h3>
          <p>Please wait while we load your practice history.</p>
        </div>
      ) : error ? (
        <div className="spr-state spr-state--error">
          <FiAlertCircle />
          <h3>Unable to load practice history</h3>
          <p>{error}</p>
          <button type="button" onClick={loadHistory}>
            Try again
          </button>
        </div>
      ) : (
        <>
         
          {filteredAttempts.length === 0 ? (
            <div className="spr-empty">
              <FiBookOpen />
              <h3>No practice attempts found</h3>
              <p>
                {attempts.length === 0
                  ? "Your completed practice test results will appear here."
                  : "Try changing your filters to see more attempts."}
              </p>

              {hasFilters && (
                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}

              {attempts.length === 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/student/practice")}
                >
                  Go to Practice Zone <FiArrowRight />
                </button>
              )}
            </div>
          ) : (
            <div className="common-card">
            <div className="common-table-wrapper">
              <table className="common-table spr-table">
                <thead>
                  <tr>
                    <th>Practice Test</th>
                    {/* <th>Course / Subject</th> */}
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAttempts.map((attempt) => {
                    const isCompleted = [
                      "Submitted",
                      "Timed Out",
                    ].includes(attempt.status);

                    return (
                      <tr key={attempt._id}>
                        <td>

                          <div class="student-name-cell"><div class="student-avatar student-avatar-placeholder">
                              <FiFileText />
                           </div>
                           <div>
                              <strong>{attempt.practiceTest_id?.title ||
                                "Practice Test"}</strong>
                                
                              
                                 </div>
                              </div>

                         
                        </td>

                         {/* <td>
                          <div className="spr-course-cell">
                            <strong>
                              {attempt.course_id?.courseTitle || "—"}
                            </strong>
                            <small>
                              {attempt.subject_id?.subjectName || "—"}
                            </small>
                          </div>
                        </td> */}

                        <td>
                          <strong className="tabletitle">{isCompleted
                            ? `${formatNumber(
                                attempt.marksObtained
                              )} / ${formatNumber(attempt.totalMarks)}`
                            : "—"}</strong>
                        </td>

                        <td>
                        <strong className="tabletitle">  {isCompleted
                            ? `${formatNumber(attempt.percentage)}%`
                            : "—"}</strong>
                        </td>

                        <td>
                          <div class="contact-details"><div class="contact-li"> <MdOutlineDateRange />
 <span>{formatDate(attempt.createdAt)}</span></div></div>
                          </td>

                        <td>
                          <span
                            className={`spr-status ${getStatusClass(
                              attempt.status
                            )}`}
                          >
                            {attempt.status}
                          </span>
                        </td>

                        <td>
                          {isCompleted ? (
                            <button
                              type="button"
                              className="spr-action-button"
                              onClick={() =>
                                openAttemptDetails(attempt)
                              }
                            >
                              <FiEye /> Review
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="spr-action-button spr-action-button--resume"
                              onClick={() => resumeAttempt(attempt)}
                            >
                              Continue <FiArrowRight />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </>
      )}

      {detailLoading && (
        <div className="spr-detail-loading">
          <FiRefreshCw className="spr-spin" />
          Loading answer review...
        </div>
      )}

      {detailError && (
        <div className="spr-alert">
          <FiAlertCircle />
          <span>{detailError}</span>
          <button type="button" onClick={() => setDetailError("")}>
            <FiX />
          </button>
        </div>
      )}
    </main>
  );
}
