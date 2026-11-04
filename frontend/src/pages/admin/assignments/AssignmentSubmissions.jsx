
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

import "./AssignmentSubmissions.css";

const PAGE_SIZE = 15;

const STATUS_OPTIONS = [
  "Pending",
  "Submitted",
  "Late",
  "UnderEvaluation",
  "Evaluated",
];

const getRoot = (response) =>
  response?.data?.data ?? response?.data ?? {};

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

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
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename || "submission-file";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
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
  submission?.admission_id?.batch_id?.batch_name ||
  "—";

const getStatusLabel = (status) => {
  if (status === "UnderEvaluation") return "Under evaluation";
  return status || "Pending";
};

export default function AssignmentSubmissions() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const [historyOpen, setHistoryOpen] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAssignment = useCallback(async () => {
    const response = await getAssignment(id);
    setAssignment(getRoot(response));
  }, [id]);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await getAssignmentSubmissions(id, params);
      const root = getRoot(response);

      setSubmissions(
        Array.isArray(root.submissions)
          ? root.submissions
          : []
      );

      setPagination(
        root.pagination || {
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [id, page, statusFilter]);

  useEffect(() => {
    loadAssignment().catch((err) => setError(getError(err)));
  }, [loadAssignment]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    setPage(1);
    setHistoryOpen("");
    setHistory([]);
  }, [statusFilter]);

  const counts = useMemo(() => {
    const result = {
      Pending: 0,
      Submitted: 0,
      Late: 0,
      UnderEvaluation: 0,
      Evaluated: 0,
    };

    submissions.forEach((item) => {
      if (result[item.status] !== undefined) {
        result[item.status] += 1;
      }
    });

    return result;
  }, [submissions]);

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

  const handleRefresh = async () => {
    setHistoryOpen("");
    setHistory([]);
    await loadSubmissions();
  };

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
    setError("");

    try {
      const response = await getAdminSubmissionHistory(
        id,
        submission._id
      );

      const root = getRoot(response);

      setHistory(Array.isArray(root) ? root : []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleResubmission = async (submission, enabled) => {
    if (!submission?._id) return;

    const studentName = getStudentName(submission.student_id);

    const message = enabled
      ? `Allow ${studentName} to submit another version?`
      : `Disable resubmission for ${studentName}?`;

    if (!window.confirm(message)) return;

    setActionId(submission._id);
    setError("");
    setSuccess("");

    try {
      await setStudentResubmission(
        id,
        submission._id,
        enabled
      );

      setSuccess(
        enabled
          ? "Resubmission enabled for this student."
          : "Resubmission disabled for this student."
      );

      await loadSubmissions();
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };


const handleDownload = async (submissionId, file) => {
  // Mongoose populated files use _id.
  // History API files are serialized with id.
  const fileId = file?.id || file?._id;

  if (!submissionId || !fileId) {
    setError("Unable to download file: submission or file ID is missing.");
    return;
  }

  setActionId(fileId);
  setError("");

  try {
    const response = await downloadSubmissionFile(
      submissionId,
      fileId
    );

    saveBlob(
      response.data,
      file.originalName || "submission-file"
    );
  } catch (err) {
    setError(getError(err));
  } finally {
    setActionId("");
  }
};


  const totalEligible = pagination.total || 0;
  const submittedCount = submissions.filter(
    (item) => Number(item.submissionCount || 0) > 0
  ).length;

  if (!assignment) {
    return (
      <div className="assignment-submissions-page">
        {loading ? "Loading assignment..." : (
          <div className="as-alert as-alert-error">
            {error || "Assignment not found."}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="assignment-submissions-page">
      <div className="as-header">
        <div>
          <button
            className="as-back-button"
            onClick={() => navigate("/admin/assignments")}
          >
            <FiArrowLeft /> Back to Assignments
          </button>

          <span className="as-eyebrow">ACADEMIC MANAGEMENT</span>

          <h1>Assignment Submissions</h1>

          <p>
            Review eligible students, submitted files and version history.
          </p>
        </div>

        <button
          className="as-refresh-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "as-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="as-alert as-alert-error">
          <span>{error}</span>
          <button onClick={() => setError("")}><FiX /></button>
        </div>
      )}

      {success && (
        <div className="as-alert as-alert-success">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><FiX /></button>
        </div>
      )}

      <section className="as-assignment-card">
        <div className="as-assignment-main">
          <div className="as-assignment-icon">
            <FiBookOpen />
          </div>

          <div>
            <span className="as-assignment-status">
              {assignment.status}
            </span>

            <h2>{assignment.title}</h2>

            <p>
              {assignment.description || "No assignment description provided."}
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
                ? assignment.batches.map((batch) => batch.name).join(", ")
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
            <strong>{assignment.total_marks}</strong>
          </div>
        </div>
      </section>

      <section className="as-stats">
        <div className="as-stat-card">
          <span>Eligible students</span>
          <strong>{totalEligible}</strong>
        </div>

        <div className="as-stat-card">
          <span>Submitted students</span>
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, roll no, batch..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
                    No eligible students found for this filter.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((item) => {
                  const student = item.student_id || {};
                  const hasSubmitted = Number(item.submissionCount || 0) > 0;
                  const isResubmissionEnabled = Boolean(
                    item.resubmissionEnabled
                  );

                  const latestVersion = item.latestVersion_id;
                  const isBusy = actionId === item._id;

                  return (
                    <React.Fragment key={item._id}>
                      <tr>
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

                        <td>{getBatchName(item)}</td>

                        <td>
                          {formatDate(item.lastSubmittedAt)}
                          {item.isLate && (
                            <span className="as-late-label">
                              Late submission
                            </span>
                          )}
                        </td>

                        <td>
                          <strong>{item.submissionCount || 0}</strong>
                        </td>

                        <td>
                          <span
                            className={`as-status as-status-${String(
                              item.status || "Pending"
                            ).toLowerCase()}`}
                          >
                            {getStatusLabel(item.status)}
                          </span>
                        </td>

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
                                {isResubmissionEnabled ? "Enabled" : "Disabled"}
                              </small>
                            </label>
                          ) : (
                            <span className="as-muted">Not applicable</span>
                          )}
                        </td>

                        <td>
                          <div className="as-actions">
                            {hasSubmitted && item.status !== "Pending" && (
                                <button
                                    title="Evaluate student submission"
                                    onClick={() =>
                                    navigate(
                                        `/admin/assignments/${id}/submissions/${item._id}/evaluate`
                                    )
                                    }
                                >
                                    <FiCheckCircle />
                                    Evaluate
                                </button>
                                )}

                            {hasSubmitted && (
                              <button
                                title="View version history"
                                onClick={() => handleHistory(item)}
                              >
                                <FiClock />
                                History
                              </button>
                            )}

                            {latestVersion?.files?.length > 0 && (
                              <button
                                title="Download latest submission"
                                onClick={() =>
                                    handleDownload(
                                    item._id,
                                    latestVersion.files[0]
                                    )
                                }
                                disabled={
                                    isBusy ||
                                    actionId === (
                                    latestVersion?.files?.[0]?.id ||
                                    latestVersion?.files?.[0]?._id
                                    )
                                }
                                >
                                <FiDownload />
                                Latest file
                                </button>
                            )}
                          </div>
                        </td>
                      </tr>

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
                                  onClick={() => {
                                    setHistoryOpen("");
                                    setHistory([]);
                                  }}
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
                                              onClick={() =>
                                                handleDownload(
                                                  item._id,
                                                  file
                                                )
                                              }
                                              disabled={actionId === file.id}
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
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="as-pagination">
          <span>
            {pagination.total || 0} eligible student(s)
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <strong>
              {page} / {Math.max(1, pagination.totalPages || 1)}
            </strong>

            <button
              disabled={
                page >= (pagination.totalPages || 1) || loading
              }
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {!assignment.allowResubmission && (
        <div className="as-information">
          Individual resubmission cannot be enabled while the assignment-level
          resubmission setting is disabled. Enable it in the assignment policy
          before using individual overrides.
        </div>
      )}
    </div>
  );
}
