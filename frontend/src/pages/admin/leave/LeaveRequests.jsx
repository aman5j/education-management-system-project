
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import leaveRequestService from "../../../services/leaveRequestService";
import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

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

const formatAppliedDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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

const PAGE_SIZE = 10;

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
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState("");

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState("");
  const [adminRemark, setAdminRemark] = useState("");

  const loadRequests = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await leaveRequestService.getRequests({
        status: status || undefined,
        page,
        limit,
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load leave requests."
        );
      }

      const payload = response.data || {};
      const list = Array.isArray(payload.requests)
        ? payload.requests
        : [];

      const pageData = payload.pagination || {};

      const total = Number(pageData.total) || 0;
      const totalPages =
        Number(pageData.totalPages) ||
        Math.ceil(total / limit);

      setRequests(list);

      setPagination({
        page: Number(pageData.page) || page,
        limit: Number(pageData.limit) || limit,
        total,
        totalPages,
      });

      // Handle a page becoming invalid after a review or filter change.
      if (totalPages > 0 && page > totalPages) {
        setPage(totalPages);
      }
    } catch (error) {
      setRequests([]);
      setPagination({
        page,
        limit,
        total: 0,
        totalPages: 0,
      });

      notification.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, page, limit]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(() => ({
    pending: requests.filter(
      (item) => item.status === "Pending"
    ).length,
    approved: requests.filter(
      (item) => item.status === "Approved"
    ).length,
    rejected: requests.filter(
      (item) => item.status === "Rejected"
    ).length,
  }), [requests]);

  const openReview = (request, selectedDecision) => {
    setSelectedRequest(request);
    setDecision(selectedDecision);
    setAdminRemark("");
  };

  const openDetails = (request) => {
    setSelectedRequest(request);
    setDecision("View");
    setAdminRemark("");
  };

  const closeReview = () => {
    if (actionId) return;

    setSelectedRequest(null);
    setDecision("");
    setAdminRemark("");
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!selectedRequest?._id || !decision || decision === "View") {
      return;
    }

    if (!canManage) {
      notification.error(
        "You do not have permission to review leave requests."
      );
      return;
    }

    if (adminRemark.trim().length > 1000) {
      notification.warning(
        "Remark cannot exceed 1000 characters."
      );
      return;
    }

    const isApproval = decision === "Approved";

    const confirmed = await notification.confirm({
      title: isApproval
        ? "Approve leave request?"
        : "Reject leave request?",
      text: isApproval
        ? "Approval will update attendance to Leave for the requested dates. Existing Present or Late records will prevent approval."
        : "Are you sure you want to reject this leave request?",
      icon: "question",
      confirmText: isApproval
        ? "Yes, approve"
        : "Yes, reject",
      confirmButtonColor: isApproval ? "#16a34a" : "#dc2626",
    });

    if (!confirmed) return;

    const requestId = selectedRequest._id;

    setActionId(requestId);

    try {
      const payload = {
        decision,
        ...(decision === "Rejected" && adminRemark.trim()
          ? { admin_remark: adminRemark.trim() }
          : {}),
      };

      const response = await leaveRequestService.reviewRequest(
        requestId,
        payload
      );

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to review request."
        );
      }

      notification.success(
        response.message ||
          (isApproval
            ? "Leave request approved. Attendance has been updated."
            : "Leave request rejected successfully.")
      );

      setSelectedRequest(null);
      setDecision("");
      setAdminRemark("");

      // Reload the current page. If the last item on the page was
      // reviewed, loadRequests will move back to the last valid page.
      await loadRequests(true);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
    setRequests([]);
  };

  const handleLimitChange = (value) => {
    setLimit(value);
    setPage(1);
    setRequests([]);
  };

  return (
    <main className="leave-admin">
      <header className="la-header">
        <div>
          <span className="la-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Leave Requests</h1>
          <p>
            Review student leave applications and update attendance
            through approval.
          </p>
        </div>

        <button
          type="button"
          className="la-refresh"
          onClick={() => loadRequests(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw className={refreshing ? "la-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="la-summary">
        <article>
          <span className="la-summary-icon la-summary-icon--pending">
            <FiClock />
          </span>
          <div>
            <small>Pending on this page</small>
            <strong>{counts.pending}</strong>
          </div>
        </article>

        <article>
          <span className="la-summary-icon la-summary-icon--approved">
            <FiCheckCircle />
          </span>
          <div>
            <small>Approved on this page</small>
            <strong>{counts.approved}</strong>
          </div>
        </article>

        <article>
          <span className="la-summary-icon la-summary-icon--rejected">
            <FiXCircle />
          </span>
          <div>
            <small>Rejected on this page</small>
            <strong>{counts.rejected}</strong>
          </div>
        </article>
      </section>

      <section className="la-panel">
        <div className="la-panel-heading">
          <div>
            <h2>Student Applications</h2>
            <p>{pagination.total} total request(s)</p>
          </div>

          <select
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value)
            }
            aria-label="Filter leave request status"
            disabled={loading}
          >
            <option value="Pending">Pending Requests</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
            <option value="">All Requests</option>
          </select>
        </div>

        {loading ? (
          <div className="la-state">
            Loading leave requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="la-state">
            <FiCalendar />
            <strong>No leave requests found</strong>
            <span>
              There are no requests for the selected filter.
            </span>
          </div>
        ) : (
          <div className="la-table-wrap">
            <table className="la-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Applied On</th>
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
                        <small>
                          Roll No: {student.rollNo || "—"}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {formatAppliedDate(request.createdAt)}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {course.courseTitle || "—"}
                        </strong>
                        <small>
                          {batch.batch_name || "—"}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {formatDate(request.from_date)}
                        </strong>
                        <small>
                          to {formatDate(request.to_date)}
                        </small>
                      </td>

                      <td>{request.leave_type}</td>

                      <td className="la-reason">
                        {request.reason}
                      </td>

                      <td>
                        <span
                          className={`la-status la-status--${statusClass(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td>
                        {request.status === "Pending" && canManage ? (
                          <div className="la-actions">
                            <button
                              type="button"
                              className="la-approve"
                              onClick={() =>
                                openReview(request, "Approved")
                              }
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className="la-reject"
                              onClick={() =>
                                openReview(request, "Rejected")
                              }
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="la-view"
                            onClick={() => openDetails(request)}
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

        <Pagination
          page={pagination.page || page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          itemCount={requests.length}
          itemLabel="leave requests"
          limit={limit}
          loading={loading || refreshing}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
        />
      </section>

      {selectedRequest && (
        <div
          className="la-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReview();
            }
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
                <span className="la-eyebrow">
                  LEAVE APPLICATION
                </span>

                <h2 id="la-modal-title">
                  {decision === "View"
                    ? "Request Details"
                    : `${decision} Leave Request`}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReview}
                disabled={!!actionId}
              >
                ×
              </button>
            </div>

            <div className="la-detail-grid">
              <div>
                <small>Student</small>
                <strong>
                  {getPersonName(selectedRequest.student_id)}
                </strong>
              </div>

              <div>
                <small>Roll Number</small>
                <strong>
                  {selectedRequest.student_id?.rollNo || "—"}
                </strong>
              </div>

              <div>
                <small>Applied On</small>
                <strong>
                  {formatAppliedDate(selectedRequest.createdAt)}
                </strong>
              </div>

              <div>
                <small>Course</small>
                <strong>
                  {selectedRequest.course_id?.courseTitle || "—"}
                </strong>
              </div>

              <div>
                <small>Batch</small>
                <strong>
                  {selectedRequest.batch_id?.batch_name || "—"}
                </strong>
              </div>

              <div>
                <small>Leave Type</small>
                <strong>{selectedRequest.leave_type}</strong>
              </div>

              <div>
                <small>Dates</small>
                <strong>
                  {formatDate(selectedRequest.from_date)} –{" "}
                  {formatDate(selectedRequest.to_date)}
                </strong>
              </div>
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
                    <p>
                      {selectedRequest.admin_remark ||
                        "No remark provided."}
                    </p>
                  </div>
                )}

                <div className="la-modal-footer">
                  <button
                    type="button"
                    className="la-secondary"
                    onClick={closeReview}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={submitReview}>
                {decision === "Rejected" && (
                  <label className="la-remark-field">
                    <span>
                      Rejection Remark <small>(Optional)</small>
                    </span>

                    <textarea
                      rows="4"
                      maxLength="1000"
                      value={adminRemark}
                      onChange={(event) =>
                        setAdminRemark(event.target.value)
                      }
                      placeholder="Explain why this leave request is rejected..."
                    />

                    <small>
                      {adminRemark.length}/1000 characters.
                      This remark will be visible to the student.
                    </small>
                  </label>
                )}

                {decision === "Approved" && (
                  <div className="la-approval-note">
                    Approval will update attendance to Leave for the
                    requested dates. Existing Present or Late records
                    will prevent approval.
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
                    className={
                      decision === "Approved"
                        ? "la-confirm-approve"
                        : "la-confirm-reject"
                    }
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
