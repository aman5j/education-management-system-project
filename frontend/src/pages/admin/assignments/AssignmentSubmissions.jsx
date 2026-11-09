
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  getAssignment,
  getAssignmentSubmissions,
  getAdminSubmissionHistory,
  setStudentResubmission,
  downloadSubmissionFile,
} from "../../../services/assignmentService";

import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "./AssignmentSubmissions.css";

const STATUS_OPTIONS = [
  "Pending",
  "Submitted",
  "Late",
  "UnderEvaluation",
  "Evaluated",
];

const DEFAULT_LIMIT = 10;

const getRoot = (response) =>
  response?.data?.data ?? response?.data ?? {};

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

const formatSize = (bytes = 0) => {
  const size = Number(bytes) || 0;

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const saveBlob = (blob, filename) => {
  if (!(blob instanceof Blob)) {
    throw new Error("The downloaded file is invalid.");
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename || "submission-file";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Allow the browser to begin the download before releasing the URL.
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

const getStudentName = (student) => {
  if (!student) return "Unknown student";

  return [
    student.firstName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown student";
};

const getBatchName = (submission) =>
  submission?.admission_id?.batch_id?.batch_name || "—";

const getStatusLabel = (status) => {
  if (status === "UnderEvaluation") return "Under evaluation";
  return status || "Pending";
};

const getFileId = (file) => file?.id || file?._id || "";

export default function AssignmentSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();

  // --------------------------------------------------
  // MAIN DATA
  // --------------------------------------------------

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  // --------------------------------------------------
  // FILTERS AND PAGINATION
  // --------------------------------------------------

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });

  // --------------------------------------------------
  // HISTORY
  // --------------------------------------------------

  const [historyOpen, setHistoryOpen] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --------------------------------------------------
  // LOADING AND ACTION STATES
  // --------------------------------------------------

  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  // --------------------------------------------------
  // LOAD ASSIGNMENT DETAILS
  // --------------------------------------------------

  const loadAssignment = useCallback(async () => {
    if (!id) return;

    setAssignmentLoading(true);

    try {
      const response = await getAssignment(id);
      const root = getRoot(response);

      setAssignment(root);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      setAssignment(null);
    } finally {
      setAssignmentLoading(false);
    }
  }, [id]);

  // --------------------------------------------------
  // LOAD STUDENT SUBMISSIONS
  // --------------------------------------------------

  const loadSubmissions = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      const params = {
        page,
        limit,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await getAssignmentSubmissions(id, params);
      const root = getRoot(response);

      const items = Array.isArray(root.submissions)
        ? root.submissions
        : [];

      setSubmissions(items);

      setPagination({
        page: Number(root.pagination?.page) || page,
        limit: Number(root.pagination?.limit) || limit,
        total: Number(root.pagination?.total) || 0,
        totalPages: Number(root.pagination?.totalPages) || 0,
      });

      // Close history when the current page changes.
      setHistoryOpen("");
      setHistory([]);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [id, page, limit, statusFilter]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  // --------------------------------------------------
  // RESET PAGE WHEN FILTERS CHANGE
  // --------------------------------------------------

  useEffect(() => {
    setPage(1);
    setHistoryOpen("");
    setHistory([]);
  }, [statusFilter, search]);

  // --------------------------------------------------
  // PAGE-LEVEL STATUS COUNTS
  // --------------------------------------------------

  const counts = useMemo(() => {
    const result = {
      Pending: 0,
      Submitted: 0,
      Late: 0,
      UnderEvaluation: 0,
      Evaluated: 0,
    };

    submissions.forEach((item) => {
      if (Object.prototype.hasOwnProperty.call(result, item.status)) {
        result[item.status] += 1;
      }
    });

    return result;
  }, [submissions]);

  // --------------------------------------------------
  // CLIENT-SIDE SEARCH
  // Search applies to the currently loaded page only.
  // Global search requires backend support.
  // --------------------------------------------------

  const filteredSubmissions = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return submissions;

    return submissions.filter((item) => {
      const student = item.student_id || {};

      const name = getStudentName(student).toLowerCase();
      const rollNo = String(student.rollNo || "").toLowerCase();
      const email = String(student.email || "").toLowerCase();
      const batch = getBatchName(item).toLowerCase();

      return (
        name.includes(value) ||
        rollNo.includes(value) ||
        email.includes(value) ||
        batch.includes(value)
      );
    });
  }, [submissions, search]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = async () => {
    setHistoryOpen("");
    setHistory([]);

    await Promise.all([
      loadAssignment(),
      loadSubmissions(),
    ]);
  };

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------

  const handlePageChange = (nextPage) => {
    setPage(Math.max(1, nextPage));
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
    setHistoryOpen("");
    setHistory([]);
  };

  // --------------------------------------------------
  // SUBMISSION VERSION HISTORY
  // --------------------------------------------------

  const handleHistory = async (submission) => {
    if (!submission?._id) return;

    if (historyOpen === submission._id) {
      setHistoryOpen("");
      setHistory([]);
      return;
    }

    setHistoryOpen(submission._id);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const response = await getAdminSubmissionHistory(
        id,
        submission._id
      );

      const root = getRoot(response);

      setHistory(Array.isArray(root) ? root : []);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      setHistoryOpen("");
    } finally {
      setHistoryLoading(false);
    }
  };

  // --------------------------------------------------
  // ENABLE / DISABLE INDIVIDUAL RESUBMISSION
  // --------------------------------------------------

  const handleResubmission = async (submission, enabled) => {
    if (!submission?._id) return;

    if (!assignment?.allowResubmission && enabled) {
      notification.warning(
        "Enable resubmission in the assignment settings first."
      );
      return;
    }

    const studentName = getStudentName(submission.student_id);

    const confirmed = await notification.confirm({
      title: enabled
        ? "Enable resubmission?"
        : "Disable resubmission?",
      text: enabled
        ? `Allow ${studentName} to submit another version of this assignment?`
        : `Prevent ${studentName} from submitting another version?`,
      confirmText: enabled
        ? "Yes, enable"
        : "Yes, disable",
      cancelText: "Cancel",
      icon: "question",
      confirmButtonColor: enabled ? "#2563eb" : "#d97706",
    });

    if (!confirmed) return;

    setActionId(submission._id);

    try {
      await setStudentResubmission(
        id,
        submission._id,
        enabled
      );

      notification.success(
        enabled
          ? "Resubmission enabled for this student."
          : "Resubmission disabled for this student."
      );

      await loadSubmissions();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  // --------------------------------------------------
  // DOWNLOAD SUBMISSION FILE
  // --------------------------------------------------

  const handleDownload = async (submissionId, file) => {
    const fileId = getFileId(file);

    if (!submissionId || !fileId) {
      notification.error(
        "Unable to download file. Submission or file ID is missing."
      );
      return;
    }

    setActionId(fileId);

    try {
      const response = await downloadSubmissionFile(
        submissionId,
        fileId
      );

      saveBlob(
        response.data,
        file.originalName || "submission-file"
      );

      notification.success("File download started.");
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  // --------------------------------------------------
  // EVALUATION NAVIGATION
  // Existing evaluation route is preserved.
  // --------------------------------------------------

  const handleEvaluate = (submission) => {
    if (!submission?._id) return;

    navigate(
      `/admin/assignments/${id}/submissions/${submission._id}/evaluate`
    );
  };

  // --------------------------------------------------
  // LOADING / NOT FOUND
  // --------------------------------------------------

  if (assignmentLoading && !assignment) {
    return (
      <div className="assignment-submissions-page">
        <div className="as-empty">
          Loading assignment details...
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="assignment-submissions-page">
        <div className="as-header">
          <div>
            <button
              type="button"
              className="as-back-button"
              onClick={() => navigate("/admin/assignments")}
            >
              <FiArrowLeft />
              Back to Assignments
            </button>

            <h1>Assignment Submissions</h1>
          </div>
        </div>

        <div className="as-alert as-alert-error">
          Assignment not found or you do not have permission to view it.
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // SUMMARY VALUES
  // --------------------------------------------------

  const totalEligible = pagination.total || 0;

  const submittedCount = submissions.filter(
    (item) => Number(item.submissionCount || 0) > 0
  ).length;

  return (
    <div className="assignment-submissions-page">
      {/* HEADER */}

      <div className="as-header">
        <div>
          <button
            type="button"
            className="as-back-button"
            onClick={() => navigate("/admin/assignments")}
          >
            <FiArrowLeft />
            Back to Assignments
          </button>

          <span className="as-eyebrow">
            ACADEMIC MANAGEMENT
          </span>

          <h1>Assignment Submissions</h1>

          <p>
            Review eligible students, submitted files and version history.
          </p>
        </div>

        <button
          type="button"
          className="as-refresh-button"
          onClick={handleRefresh}
          disabled={loading || assignmentLoading}
        >
          <FiRefreshCw className={loading ? "as-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ASSIGNMENT DETAILS */}

      <section className="as-assignment-card">
        <div className="as-assignment-main">
          <div className="as-assignment-icon">
            <FiBookOpen />
          </div>

          <div>
            <span className="as-assignment-status">
              {assignment.status || "—"}
            </span>

            <h2>{assignment.title || "Untitled assignment"}</h2>

            <p>
              {assignment.description ||
                "No assignment description provided."}
            </p>
          </div>
        </div>

        <div className="as-assignment-meta">
          <div>
            <FiBookOpen />
            <span>Course</span>
            <strong>{assignment.course?.title || "—"}</strong>
          </div>

          <div>
            <FiFileText />
            <span>Subject</span>
            <strong>
              {assignment.subject?.name || "General assignment"}
            </strong>
          </div>

          <div>
            <FiUsers />
            <span>Target</span>
            <strong>
              {assignment.batches?.length
                ? assignment.batches
                    .map((batch) => batch.name)
                    .filter(Boolean)
                    .join(", ")
                : "All eligible batches"}
            </strong>
          </div>

          <div>
            <FiCalendar />
            <span>Due date</span>
            <strong>{formatDate(assignment.dueAt)}</strong>
          </div>

          <div>
            <FiCheckCircle />
            <span>Total marks</span>
            <strong>{assignment.total_marks ?? "—"}</strong>
          </div>
        </div>
      </section>

      {/* SUMMARY CARDS */}

      <section className="as-stats">
        <div className="as-stat-card">
          <span>Eligible students</span>
          <strong>{totalEligible}</strong>
        </div>

        <div className="as-stat-card">
          <span>Submitted on this page</span>
          <strong>{submittedCount}</strong>
        </div>

        <div className="as-stat-card">
          <span>Pending on this page</span>
          <strong>{counts.Pending}</strong>
        </div>

        <div className="as-stat-card">
          <span>Late on this page</span>
          <strong>{counts.Late}</strong>
        </div>
      </section>

      {/* SUBMISSIONS TABLE */}

      <section className="as-panel">
        <div className="as-toolbar">
          <div>
            <h2>Student submissions</h2>
            <p>
              Eligible students are listed even if they have not submitted.
            </p>
          </div>

          <div className="as-controls">
            <div className="as-search">
              <FiSearch />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, roll no, batch..."
                aria-label="Search submissions on this page"
              />

              {search && (
                <button
                  type="button"
                  title="Clear search"
                  onClick={() => setSearch("")}
                >
                  <FiX />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by submission status"
            >
              <option value="">All statuses</option>

              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="as-table-wrap">
          <table className="as-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Batch</th>
                <th>Submission date</th>
                <th>Versions</th>
                <th>Status</th>
                <th>Resubmission</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="as-empty">
                    Loading student submissions...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="as-empty">
                    {search
                      ? "No students match your search on this page."
                      : "No eligible students found for this filter."}
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((item) => {
                  const student = item.student_id || {};

                  const hasSubmitted =
                    Number(item.submissionCount || 0) > 0;

                  const isResubmissionEnabled = Boolean(
                    item.resubmissionEnabled
                  );

                  const latestVersion = item.latestVersion_id;
                  const latestFile = latestVersion?.files?.[0];

                  const isBusy =
                    actionId === item._id ||
                    actionId === getFileId(latestFile);

                  return (
                    <Fragment key={item._id}>
                      <tr>
                        {/* STUDENT */}

                        <td>
                          <div className="as-student-cell">
                            <div className="as-avatar">
                              <FiUser />
                            </div>

                            <div>
                              <strong>{getStudentName(student)}</strong>

                              <span>
                                Roll No: {student.rollNo || "—"}
                              </span>

                              <small>{student.email || ""}</small>
                            </div>
                          </div>
                        </td>

                        {/* BATCH */}

                        <td>{getBatchName(item)}</td>

                        {/* SUBMISSION DATE */}

                        <td>
                          {formatDate(item.lastSubmittedAt)}

                          {item.isLate && (
                            <span className="as-late-label">
                              Late submission
                            </span>
                          )}
                        </td>

                        {/* VERSION COUNT */}

                        <td>
                          <strong>{item.submissionCount || 0}</strong>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`as-status as-status-${String(
                              item.status || "Pending"
                            ).toLowerCase()}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

                        {/* RESUBMISSION */}

                        <td>
                          {hasSubmitted ? (
                            <label className="as-switch">
                              <input
                                type="checkbox"
                                checked={isResubmissionEnabled}
                                disabled={
                                  isBusy ||
                                  !assignment.allowResubmission
                                }
                                onChange={(event) =>
                                  handleResubmission(
                                    item,
                                    event.target.checked
                                  )
                                }
                              />

                              <span />

                              <small>
                                {isResubmissionEnabled
                                  ? "Enabled"
                                  : "Disabled"}
                              </small>
                            </label>
                          ) : (
                            <span className="as-muted">
                              Not applicable
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td>
                          <div className="as-actions">
                            {hasSubmitted && (
                              <button
                                type="button"
                                title="Evaluate student submission"
                                onClick={() => handleEvaluate(item)}
                              >
                                <FiCheckCircle />
                                Evaluate
                              </button>
                            )}

                            {hasSubmitted && (
                              <button
                                type="button"
                                title="View version history"
                                onClick={() => handleHistory(item)}
                                disabled={historyLoading}
                              >
                                <FiClock />
                                History
                              </button>
                            )}

                            {latestFile && (
                              <button
                                type="button"
                                title="Download latest submission"
                                onClick={() =>
                                  handleDownload(item._id, latestFile)
                                }
                                disabled={isBusy}
                              >
                                <FiDownload />
                                Latest file
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* VERSION HISTORY */}

                      {historyOpen === item._id && (
                        <tr className="as-history-row">
                          <td colSpan="7">
                            <div className="as-history-panel">
                              <div className="as-history-heading">
                                <div>
                                  <h3>Submission version history</h3>

                                  <p>
                                    {getStudentName(student)} ·{" "}
                                    {item.submissionCount || 0} version(s)
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setHistoryOpen("");
                                    setHistory([]);
                                  }}
                                  title="Close history"
                                >
                                  <FiX />
                                </button>
                              </div>

                              {historyLoading ? (
                                <p className="as-muted">
                                  Loading version history...
                                </p>
                              ) : history.length === 0 ? (
                                <p className="as-muted">
                                  No version history found.
                                </p>
                              ) : (
                                <div className="as-version-list">
                                  {history.map((version) => (
                                    <div
                                      className="as-version-card"
                                      key={version.id}
                                    >
                                      <div className="as-version-top">
                                        <strong>
                                          Version {version.versionNumber}
                                        </strong>

                                        <span>
                                          {formatDate(version.submittedAt)}
                                        </span>

                                        {version.isLate && (
                                          <span className="as-late-label">
                                            Late
                                          </span>
                                        )}
                                      </div>

                                      {version.comment && (
                                        <p>{version.comment}</p>
                                      )}

                                      <div className="as-version-files">
                                        {(version.files || []).map((file) => (
                                          <div key={file.id}>
                                            <FiFileText />

                                            <span>
                                              {file.originalName}
                                              <small>
                                                {formatSize(file.fileSize)}
                                              </small>
                                            </span>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleDownload(
                                                  item._id,
                                                  file
                                                )
                                              }
                                              disabled={
                                                actionId === file.id
                                              }
                                              title="Download file"
                                            >
                                              <FiDownload />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* SHARED PAGINATION */}

        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          itemCount={filteredSubmissions.length}
          itemLabel="eligible students"
          limit={limit}
          loading={loading}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </section>

      {/* RESUBMISSION POLICY INFORMATION */}

      {!assignment.allowResubmission && (
        <div className="as-information">
          Individual resubmission cannot be enabled while the assignment-level
          resubmission setting is disabled. Enable it in the assignment
          settings before using individual student overrides.
        </div>
      )}
    </div>
  );
}
