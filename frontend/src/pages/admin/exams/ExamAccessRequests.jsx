
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiX,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

import {
  getExamAccessRequests,
  reviewExamAccessRequest,
} from "../../../services/examAccessService";

import "../../../styles/ExamAccessRequests.css";

const PAGE_SIZE = 10;

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const fullName = (student) =>
  [student?.firstName, student?.surname]
    .filter(Boolean)
    .join(" ") || "Student unavailable";

const formatDate = (value) => {
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

const formatTime = (value) => {
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

function StatusBadge({ status }) {
  const value = status || "Pending";

  return (
    <span
      className={`ear-status ear-status--${value.toLowerCase()}`}
    >
      {value}
    </span>
  );
}

export default function ExamAccessRequests() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ pending: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });

  const [status, setStatus] = useState("Pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getExamAccessRequests({
        status: status === "All" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      });

      const data = unwrap(response);

      setRequests(
        Array.isArray(data?.requests) ? data.requests : []
      );

      setSummary(data?.summary || { pending: 0 });

      setPagination(
        data?.pagination || {
          page,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return requests;

    return requests.filter((request) => {
      const student = request.student_id || {};
      const course = request.course_id || {};
      const ticket = request.ticket_id || {};

      const searchable = [
        fullName(student),
        student.rollNo,
        student.email,
        student.mobile,
        course.courseTitle,
        ticket.hallTicketNo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [requests, search]);

  const changeStatus = (nextStatus) => {
    setStatus(nextStatus);
    setPage(1);
    setSearch("");
    setSuccess("");
    setError("");
  };

  const handleApprove = async (request) => {
    const confirmed = window.confirm(
      `Approve exam access for ${fullName(request.student_id)}?`
    );

    if (!confirmed) return;

    setWorkingId(String(request._id));
    setError("");
    setSuccess("");

    try {
      const response = await reviewExamAccessRequest(
        request._id,
        { status: "Approved" }
      );

      const data = unwrap(response);

      setSuccess(
        data?.message || "Exam access approved successfully."
      );

      await loadRequests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorkingId("");
    }
  };

  const openReject = (request) => {
    setRejectingRequest(request);
    setRejectionReason("");
    setError("");
    setSuccess("");
  };

  const closeReject = () => {
    if (workingId) return;

    setRejectingRequest(null);
    setRejectionReason("");
  };

  const handleReject = async (event) => {
    event.preventDefault();

    if (!rejectingRequest) return;

    if (rejectionReason.trim().length < 5) {
      setError("Enter a rejection reason of at least 5 characters.");
      return;
    }

    setWorkingId(String(rejectingRequest._id));
    setError("");
    setSuccess("");

    try {
      const response = await reviewExamAccessRequest(
        rejectingRequest._id,
        {
          status: "Rejected",
          rejectionReason: rejectionReason.trim(),
        }
      );

      const data = unwrap(response);

      setSuccess(
        data?.message || "Exam access request rejected."
      );

      setRejectingRequest(null);
      setRejectionReason("");

      await loadRequests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorkingId("");
    }
  };

  return (
    <main className="exam-access-page">
      <header className="ear-header">
        <div>
          <span className="ear-eyebrow">EXAM MANAGEMENT</span>
          <h1>Exam Access Requests</h1>
          <p>
            Review student requests and approve or reject access
            before an exam attempt can begin.
          </p>
        </div>

        <button
          type="button"
          className="ear-button ear-button--light"
          onClick={loadRequests}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "ear-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="ear-alert ear-alert--error" role="alert">
          <FiAlertCircle />
          {error}
        </div>
      )}

      {success && (
        <div className="ear-alert ear-alert--success" role="status">
          <FiCheckCircle />
          {success}
        </div>
      )}

      <section className="ear-summary-grid">
        <article className="ear-summary-card">
          <span className="ear-summary-icon ear-summary-icon--orange">
            <FiClock />
          </span>
          <div>
            <small>Pending requests</small>
            <strong>{summary.pending ?? 0}</strong>
          </div>
        </article>

        <article className="ear-summary-card">
          <span className="ear-summary-icon">
            <FiShield />
          </span>
          <div>
            <small>Requests in this view</small>
            <strong>{pagination.total ?? 0}</strong>
          </div>
        </article>
      </section>

      <section className="ear-card">
        <div className="ear-toolbar">
          <div className="ear-tabs">
            {["Pending", "Approved", "Rejected", "All"].map((item) => (
              <button
                key={item}
                type="button"
                className={status === item ? "is-active" : ""}
                onClick={() => changeStatus(item)}
              >
                {item}
                {item === "Pending" && (
                  <span>{summary.pending ?? 0}</span>
                )}
              </button>
            ))}
          </div>

          <label className="ear-search">
            <FiSearch />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, roll no., course..."
            />
          </label>
        </div>

        {loading ? (
          <div className="ear-state">
            <FiRefreshCw className="ear-spin" />
            <strong>Loading requests...</strong>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="ear-state">
            <FiShield />
            <strong>No {status.toLowerCase()} requests found</strong>
            <p>
              Student exam access requests will appear here when
              students submit them.
            </p>
          </div>
        ) : (
          <div className="ear-table-wrap">
            <table className="ear-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Exam / Course</th>
                  <th>Hall Ticket</th>
                  <th>Exam Schedule</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.map((request) => {
                  const student = request.student_id || {};
                  const course = request.course_id || {};
                  const exam = request.exam_id || {};
                  const ticket = request.ticket_id || {};

                  const isWorking =
                    workingId === String(request._id);

                  return (
                    <tr key={request._id}>
                      <td>
                        <div className="ear-student">
                          <strong>{fullName(student)}</strong>
                          <span>Roll No: {student.rollNo || "—"}</span>
                          <span>{student.email || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ear-exam">
                          <strong>
                            {course.courseTitle || "Course unavailable"}
                          </strong>
                          <span>
                            {exam.totalQuestions ?? "—"} questions ·{" "}
                            {exam.totalMarks ?? "—"} marks
                          </span>
                        </div>
                      </td>

                      <td>{ticket.hallTicketNo || "—"}</td>

                      <td>
                        <div className="ear-exam">
                          <strong>{formatDate(ticket.examDate)}</strong>
                          <span>
                            {formatTime(ticket.startTime)} –{" "}
                            {formatTime(ticket.endTime)}
                          </span>
                        </div>
                      </td>

                      <td>{formatDate(request.requestedAt)}</td>

                      <td>
                        <StatusBadge status={request.status} />
                      </td>

                      <td>
                        {request.status === "Pending" ? (
                          <div className="ear-actions">
                            <button
                              type="button"
                              className="ear-icon-button ear-icon-button--approve"
                              title="Approve request"
                              disabled={Boolean(workingId)}
                              onClick={() => handleApprove(request)}
                            >
                              <FiCheck />
                            </button>

                            <button
                              type="button"
                              className="ear-icon-button ear-icon-button--reject"
                              title="Reject request"
                              disabled={Boolean(workingId)}
                              onClick={() => openReject(request)}
                            >
                              <FiX />
                            </button>
                          </div>
                        ) : (
                          <span className="ear-muted">
                            {request.reviewedAt
                              ? `Reviewed ${formatDate(request.reviewedAt)}`
                              : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="ear-pagination">
          <span>
            Page {pagination.page || page} of{" "}
            {Math.max(1, pagination.totalPages || 1)} ·{" "}
            {pagination.total || 0} requests
          </span>

          <div>
            <button
              type="button"
              className="ear-button ear-button--light"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>

            <button
              type="button"
              className="ear-button ear-button--light"
              disabled={
                page >= (pagination.totalPages || 1) || loading
              }
              onClick={() =>
                setPage((value) =>
                  Math.min(pagination.totalPages || 1, value + 1)
                )
              }
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {rejectingRequest && (
        <div
          className="ear-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReject();
          }}
        >
          <form className="ear-modal" onSubmit={handleReject}>
            <div className="ear-modal-heading">
              <div>
                <span className="ear-eyebrow">REVIEW REQUEST</span>
                <h2>Reject exam access</h2>
                <p>
                  {fullName(rejectingRequest.student_id)} ·{" "}
                  {rejectingRequest.ticket_id?.hallTicketNo || "Hall ticket"}
                </p>
              </div>

              <button
                type="button"
                className="ear-modal-close"
                onClick={closeReject}
                disabled={Boolean(workingId)}
                aria-label="Close"
              >
                <FiX />
              </button>
            </div>

            <label className="ear-field">
              Rejection reason
              <textarea
                rows={4}
                maxLength={500}
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value)
                }
                placeholder="Explain why this request is being rejected..."
                required
              />
              <small>
                Minimum 5 characters. This reason will be visible to
                the student.
              </small>
            </label>

            {error && (
              <div className="ear-alert ear-alert--error">
                <FiAlertCircle />
                {error}
              </div>
            )}

            <div className="ear-modal-actions">
              <button
                type="button"
                className="ear-button ear-button--light"
                onClick={closeReject}
                disabled={Boolean(workingId)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="ear-button ear-button--danger"
                disabled={
                  Boolean(workingId) ||
                  rejectionReason.trim().length < 5
                }
              >
                <FiXCircle />
                {workingId ? "Rejecting..." : "Reject request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
