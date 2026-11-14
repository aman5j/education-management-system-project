
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiTarget,
} from "react-icons/fi";

import studentAssignmentService from "../../services/studentAssignmentService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import "./StudentAssignments.css";

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

const getDueState = (assignment) => {
  const due = new Date(assignment.dueAt);

  if (Number.isNaN(due.getTime())) return "Unknown";

  if (Date.now() > due.getTime()) {
    return assignment.allowLateSubmission ? "Late allowed" : "Overdue";
  }

  return "Upcoming";
};

export default function StudentAssignments() {
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadAssignments = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setHasLoadError(false);

    try {
      const response =
        await studentAssignmentService.getAssignments();

      const list = response?.data?.data;
      setAssignments(Array.isArray(list) ? list : []);
    } catch (err) {
      setAssignments([]);
      setHasLoadError(true);
      notification.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const courses = useMemo(() => {
    const map = new Map();

    assignments.forEach((item) => {
      if (item.course?.id) {
        map.set(
          String(item.course.id),
          item.course.title || "Course"
        );
      }
    });

    return [...map.entries()].map(([id, title]) => ({
      id,
      title,
    }));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((item) => {
      const matchesSearch =
        !query ||
        [
          item.title,
          item.description,
          item.course?.title,
          item.subject?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesCourse =
        courseFilter === "all" ||
        String(item.course?.id) === courseFilter;

      const dueState = getDueState(item);

      const matchesStatus =
        statusFilter === "all" ||
        (
          statusFilter === "submitted" &&
          Number(item.submission?.submissionCount) > 0
        ) ||
        (
          statusFilter === "pending" &&
          !Number(item.submission?.submissionCount)
        ) ||
        (
          statusFilter === "upcoming" &&
          dueState === "Upcoming"
        ) ||
        (
          statusFilter === "overdue" &&
          dueState === "Overdue"
        );

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [assignments, search, courseFilter, statusFilter]);

  const submittedCount = assignments.filter(
    (item) => Number(item.submission?.submissionCount) > 0
  ).length;

  const pendingCount = assignments.length - submittedCount;

  return (
    <div className="sa-page">
      <div className="sa-header">
        <div>
          <span className="sa-eyebrow">STUDENT LEARNING</span>
          <h1>My Assignments</h1>
          <p>
            View your assignments, instructions, deadlines and reference files.
          </p>
        </div>

        <button
          type="button"
          className="sa-refresh"
          onClick={() => loadAssignments(true)}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? "sa-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="sa-stats">
        <div className="sa-stat-card">
          <span className="sa-stat-icon sa-stat-blue">
            <FiFileText />
          </span>
          <div>
            <small>Total assignments</small>
            <strong>{assignments.length}</strong>
          </div>
        </div>

        <div className="sa-stat-card">
          <span className="sa-stat-icon sa-stat-green">
            <FiCheckCircle />
          </span>
          <div>
            <small>Submitted</small>
            <strong>{submittedCount}</strong>
          </div>
        </div>

        <div className="sa-stat-card">
          <span className="sa-stat-icon sa-stat-orange">
            <FiClock />
          </span>
          <div>
            <small>Not submitted</small>
            <strong>{pendingCount}</strong>
          </div>
        </div>
      </div>

      <section className="sa-panel">
        <div className="sa-panel-heading">
          <div>
            <h2>Assignment list</h2>
            <p>Assignments published for your active course admissions.</p>
          </div>

          <span className="sa-count">
            {filteredAssignments.length} found
          </span>
        </div>

        <div className="sa-filters">
          <div className="sa-search">
            <FiSearch />
            <input
              type="search"
              placeholder="Search assignments..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
            aria-label="Filter by course"
          >
            <option value="all">All courses</option>

            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Not submitted</option>
            <option value="submitted">Submitted</option>
            <option value="upcoming">Upcoming deadline</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {loading ? (
          <div className="sa-state">
            <FiRefreshCw className="sa-spin" />
            <h3>Loading assignments</h3>
            <p>Please wait while we load your assignments.</p>
          </div>
        ) : hasLoadError ? (
          <div className="sa-state sa-state-error">
            <h3>Assignments could not be loaded</h3>
            <p>Please try loading your assignments again.</p>

            <button
              onClick={() => loadAssignments()}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="sa-state">
            <FiBookOpen />

            <h3>
              {assignments.length
                ? "No matching assignments"
                : "No assignments available"}
            </h3>

            <p>
              {assignments.length
                ? "Try changing your search or filters."
                : "Published assignments for your active courses will appear here."}
            </p>
          </div>
        ) : (
          <div className="sa-list">
            {filteredAssignments.map((item) => {
              const submitted =
                Number(item.submission?.submissionCount) > 0;

              const dueState = getDueState(item);

              return (
                <article
                  className="sa-assignment-card"
                  key={item.id}
                >
                  <div className="sa-card-main">
                    <div className="sa-card-icon">
                      <FiFileText />
                    </div>

                    <div className="sa-card-content">
                      <div className="sa-card-title-row">
                        <h3>{item.title}</h3>

                        <span
                          className={`sa-status ${
                            submitted
                              ? "sa-status-submitted"
                              : "sa-status-pending"
                          }`}
                        >
                          {submitted ? "Submitted" : "Not submitted"}
                        </span>
                      </div>

                      <p className="sa-description">
                        {item.description || "No description provided."}
                      </p>

                      <div className="sa-meta">
                        <span>
                          <FiBookOpen />
                          {item.course?.title || "Course"}
                        </span>

                        {item.subject?.name && (
                          <span>
                            <FiTarget />
                            {item.subject.name}
                          </span>
                        )}

                        <span>
                          <FiCalendar />
                          Due: {formatDate(item.dueAt)}
                        </span>

                        <span>
                          <FiFileText />
                          {Number(item.total_marks || 0)} marks
                        </span>
                      </div>

                      <div className="sa-card-bottom">
                        <span
                          className={`sa-due-state sa-due-${dueState
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {dueState}
                        </span>

                        {submitted && (
                          <span className="sa-version">
                            {item.submission.submissionCount} submission
                            {item.submission.submissionCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="sa-view-button"
                    onClick={() =>
                      navigate(`/student/assignments/${item.id}`)
                    }
                  >
                    View details
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
