
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import leaveRequestService from "../../../services/leaveRequestService";
import "./LeaveRequests.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPersonName = (student) => {
  if (!student) return "Student";

  return [
    student.firstName,
    student.surname,
  ].filter(Boolean).join(" ") || student.name || "Student";
};

const statusClass = (status) =>
  String(status || "pending").toLowerCase();

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function LeaveRequests() {
  const { user } = useAuth();

  const permissions = Array.isArray(user?.assignedRole?.permissions)
    ? user.assignedRole.permissions
    : [];

  const canManage =
    user?.role === "admin" ||
    permissions.includes("*") ||
    permissions.includes("attendance.manage");

  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState("Pending");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState("");
  const [adminRemark, setAdminRemark] = useState("");

  const loadRequests = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await leaveRequestService.getRequests({
        status: status || undefined,
        page,
        limit: 20,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Unable to load leave requests.");
      }

      const payload = response.data || {};

      setRequests(Array.isArray(payload.requests) ? payload.requests : []);
      setPagination(
        payload.pagination || {
          page: 1,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(getError(err));
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(() => ({
    pending: requests.filter((item) => item.status === "Pending").length,
    approved: requests.filter((item) => item.status === "Approved").length,
    rejected: requests.filter((item) => item.status === "Rejected").length,
  }), [requests]);

  const openReview = (request, selectedDecision) => {
    setSelectedRequest(request);
    setDecision(selectedDecision);
    setAdminRemark("");
    setError("");
    setSuccess("");
  };

  const closeReview = () => {
    if (actionId) return;
    setSelectedRequest(null);
    setDecision("");
    setAdminRemark("");
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!selectedRequest?._id || !decision) return;

    if (adminRemark.trim().length > 1000) {
      setError("Remark cannot exceed 1000 characters.");
      return;
    }

    setActionId(selectedRequest._id);
    setError("");
    setSuccess("");

    try {
      const payload = {
        decision,
        ...(decision === "Rejected" && adminRemark.trim()
          ? { admin_remark: adminRemark.trim() }
          : {}),
      };

      const response = await leaveRequestService.reviewRequest(
        selectedRequest._id,
        payload
      );

      if (!response?.success) {
        throw new Error(response?.message || "Unable to review request.");
      }

      setSuccess(
        decision === "Approved"
          ? "Leave request approved. Attendance has been updated."
          : "Leave request rejected successfully."
      );

      setSelectedRequest(null);
      setDecision("");
      setAdminRemark("");

      await loadRequests(true);
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="leave-admin">
      <header className="la-header">
        <div>
          <span className="la-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Leave Requests</h1>
          <p>Review student leave applications and update attendance through approval.</p>
        </div>

        <button
          type="button"
          className="la-refresh"
          onClick={() => loadRequests(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw className={refreshing ? "la-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="la-alert la-alert--error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="la-alert la-alert--success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <section className="la-summary">
        <article>
          <span className="la-summary-icon la-summary-icon--pending"><FiClock /></span>
          <div><small>Pending on this page</small><strong>{counts.pending}</strong></div>
        </article>
        <article>
          <span className="la-summary-icon la-summary-icon--approved"><FiCheckCircle /></span>
          <div><small>Approved on this page</small><strong>{counts.approved}</strong></div>
        </article>
        <article>
          <span className="la-summary-icon la-summary-icon--rejected"><FiXCircle /></span>
          <div><small>Rejected on this page</small><strong>{counts.rejected}</strong></div>
        </article>
      </section>

      <section className="la-panel">
        <div className="la-panel-heading">
          <div>
            <h2>Student Applications</h2>
            <p>{pagination.total || 0} total request(s)</p>
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter leave request status"
          >
            <option value="Pending">Pending Requests</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
            <option value="">All Requests</option>
          </select>
        </div>

        {loading ? (
          <div className="la-state">Loading leave requests...</div>
        ) : requests.length === 0 ? (
          <div className="la-state">
            <FiCalendar />
            <strong>No leave requests found</strong>
            <span>There are no requests for the selected filter.</span>
          </div>
        ) : (
          <div className="la-table-wrap">
            <table className="la-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course / Batch</th>
                  <th>Leave Dates</th>
                  <th>Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const student = request.student_id || {};
                  const course = request.course_id || {};
                  const batch = request.batch_id || {};

                  return (
                    <tr key={request._id}>
                      <td>
                        <strong>{getPersonName(student)}</strong>
                        <small>Roll No: {student.rollNo || "—"}</small>
                      </td>
                      <td>
                        <strong>{course.courseTitle || "—"}</strong>
                        <small>{batch.batch_name || "—"}</small>
                      </td>
                      <td>
                        <strong>{formatDate(request.from_date)}</strong>
                        <small>to {formatDate(request.to_date)}</small>
                      </td>
                      <td>{request.leave_type}</td>
                      <td className="la-reason">{request.reason}</td>
                      <td>
                        <span className={`la-status la-status--${statusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        {request.status === "Pending" && canManage ? (
                          <div className="la-actions">
                            <button
                              type="button"
                              className="la-approve"
                              onClick={() => openReview(request, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="la-reject"
                              onClick={() => openReview(request, "Rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="la-view"
                            onClick={() => {
                              setSelectedRequest(request);
                              setDecision("View");
                            }}
                          >
                            <FiEye /> View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="la-pagination">
          <span>
            Page {pagination.page || page} of {pagination.totalPages || 1}
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {selectedRequest && (
        <div
          className="la-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReview();
          }}
        >
          <section
            className="la-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="la-modal-title"
          >
            <div className="la-modal-heading">
              <div>
                <span className="la-eyebrow">LEAVE APPLICATION</span>
                <h2 id="la-modal-title">
                  {decision === "View"
                    ? "Request Details"
                    : `${decision} Leave Request`}
                </h2>
              </div>
              <button type="button" onClick={closeReview} disabled={!!actionId}>×</button>
            </div>

            <div className="la-detail-grid">
              <div><small>Student</small><strong>{getPersonName(selectedRequest.student_id)}</strong></div>
              <div><small>Roll Number</small><strong>{selectedRequest.student_id?.rollNo || "—"}</strong></div>
              <div><small>Course</small><strong>{selectedRequest.course_id?.courseTitle || "—"}</strong></div>
              <div><small>Batch</small><strong>{selectedRequest.batch_id?.batch_name || "—"}</strong></div>
              <div><small>Leave Type</small><strong>{selectedRequest.leave_type}</strong></div>
              <div><small>Dates</small><strong>{formatDate(selectedRequest.from_date)} – {formatDate(selectedRequest.to_date)}</strong></div>
            </div>

            <div className="la-detail-reason">
              <small>Student's Reason</small>
              <p>{selectedRequest.reason}</p>
            </div>

            {decision === "View" ? (
              <>
                <div className="la-detail-reason">
                  <small>Current Status</small>
                  <p>{selectedRequest.status}</p>
                </div>
                {selectedRequest.status === "Rejected" && (
                  <div className="la-detail-reason la-existing-remark">
                    <small>Remark shared with student</small>
                    <p>{selectedRequest.admin_remark || "No remark provided."}</p>
                  </div>
                )}
                <div className="la-modal-footer">
                  <button type="button" className="la-secondary" onClick={closeReview}>Close</button>
                </div>
              </>
            ) : (
              <form onSubmit={submitReview}>
                {decision === "Rejected" && (
                  <label className="la-remark-field">
                    <span>Rejection Remark <small>(Optional)</small></span>
                    <textarea
                      rows="4"
                      maxLength="1000"
                      value={adminRemark}
                      onChange={(event) => setAdminRemark(event.target.value)}
                      placeholder="Explain why this leave request is rejected..."
                    />
                    <small>{adminRemark.length}/1000 characters. This remark will be visible to the student.</small>
                  </label>
                )}

                {decision === "Approved" && (
                  <div className="la-approval-note">
                    Approval will update attendance to Leave for the requested
                    dates. Existing Present or Late records will prevent approval.
                  </div>
                )}

                <div className="la-modal-footer">
                  <button
                    type="button"
                    className="la-secondary"
                    onClick={closeReview}
                    disabled={!!actionId}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={decision === "Approved" ? "la-confirm-approve" : "la-confirm-reject"}
                    disabled={!!actionId}
                  >
                    {actionId
                      ? "Saving..."
                      : decision === "Approved"
                        ? "Confirm Approval"
                        : "Confirm Rejection"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
