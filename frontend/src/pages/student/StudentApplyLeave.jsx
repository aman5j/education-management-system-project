
import { useCallback, useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentApplyLeave.css";

const today = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return parts;
};

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

const getId = (value) =>
  typeof value === "object" ? value?._id : value;

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const statusClass = (status) =>
  String(status || "pending").toLowerCase();

export default function StudentApplyLeave() {
  const [admissions, setAdmissions] = useState([]);
  const [requests, setRequests] = useState([]);

  const [form, setForm] = useState({
    admission_id: "",
    leave_type: "Sick Leave",
    from_date: "",
    to_date: "",
    reason: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPage = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [admissionResponse, requestResponse] = await Promise.all([
        studentPortalService.getMyLeaveAdmissions(),
        studentPortalService.getMyLeaveRequests(),
      ]);

      if (!admissionResponse?.success) {
        throw new Error(
          admissionResponse?.message || "Unable to load active admissions."
        );
      }

      if (!requestResponse?.success) {
        throw new Error(
          requestResponse?.message || "Unable to load leave requests."
        );
      }

      const admissionList = Array.isArray(admissionResponse.data)
        ? admissionResponse.data
        : [];

      const requestList = Array.isArray(requestResponse.data)
        ? requestResponse.data
        : [];

      setAdmissions(admissionList);
      setRequests(requestList);

      setForm((previous) => ({
        ...previous,
        admission_id:
          previous.admission_id ||
          admissionList[0]?.admissionId ||
          "",
      }));
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "from_date" && previous.to_date && value > previous.to_date
        ? { to_date: value }
        : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.admission_id) {
      setError("Please select an active course and batch.");
      return;
    }

    if (!form.from_date || !form.to_date) {
      setError("Please select both leave dates.");
      return;
    }

    if (form.from_date > form.to_date) {
      setError("From date cannot be after To date.");
      return;
    }

    if (form.from_date < today()) {
      setError("You cannot apply for leave for past dates.");
      return;
    }

    if (!form.reason.trim()) {
      setError("Please enter the reason for leave.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await studentPortalService.applyForLeave({
        ...form,
        reason: form.reason.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.message || "Unable to submit leave request.");
      }

      setSuccess("Your leave request has been submitted successfully.");

      setForm((previous) => ({
        ...previous,
        leave_type: "Sick Leave",
        from_date: "",
        to_date: "",
        reason: "",
      }));

      await loadPage(true);
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }

    setError("");
    setSuccess("");
    setCancellingId(requestId);

    try {
      const response =
        await studentPortalService.cancelMyLeaveRequest(requestId);

      if (!response?.success) {
        throw new Error(response?.message || "Unable to cancel request.");
      }

      setSuccess("Leave request cancelled successfully.");
      await loadPage(true);
    } catch (err) {
      setError(getError(err));
    } finally {
      setCancellingId("");
    }
  };

  return (
    <main className="student-leave">
      <header className="sl-header">
        <div>
          <span className="sl-eyebrow">STUDENT PORTAL</span>
          <h1>Apply for Leave</h1>
          <p>Submit a leave request and track its approval status.</p>
        </div>

        <button
          type="button"
          className="sl-refresh"
          onClick={() => loadPage(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw className={refreshing ? "sl-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="sl-alert sl-alert--error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>×</button>
        </div>
      )}

      {success && (
        <div className="sl-alert sl-alert--success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      <section className="sl-card">
        <div className="sl-card-heading">
          <div className="sl-heading-icon"><FiCalendar /></div>
          <div>
            <h2>Leave Application</h2>
            <p>Fill in the details below to submit your request.</p>
          </div>
        </div>

        {loading ? (
          <div className="sl-state">Loading your active admissions...</div>
        ) : admissions.length === 0 ? (
          <div className="sl-state">
            <FiFileText />
            <strong>No active admission found</strong>
            <span>You need an active course admission to apply for leave.</span>
          </div>
        ) : (
          <form className="sl-form" onSubmit={handleSubmit}>
            <label className="sl-field sl-field--full">
              <span>Course / Batch <b>*</b></span>
              <select
                name="admission_id"
                value={form.admission_id}
                onChange={updateField}
                required
              >
                <option value="">Select your course and batch</option>
                {admissions.map((item) => (
                  <option key={item.admissionId} value={item.admissionId}>
                    {item.course} — {item.batch}
                  </option>
                ))}
              </select>
              <small>Select the admission for which you need leave.</small>
            </label>

            <label className="sl-field">
              <span>Leave Type <b>*</b></span>
              <select
                name="leave_type"
                value={form.leave_type}
                onChange={updateField}
                required
              >
                <option value="Sick Leave">Sick Leave</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label className="sl-field">
              <span>From Date <b>*</b></span>
              <input
                type="date"
                name="from_date"
                min={today()}
                value={form.from_date}
                onChange={updateField}
                required
              />
            </label>

            <label className="sl-field">
              <span>To Date <b>*</b></span>
              <input
                type="date"
                name="to_date"
                min={form.from_date || today()}
                value={form.to_date}
                onChange={updateField}
                required
              />
            </label>

            <label className="sl-field sl-field--full">
              <span>Reason for Leave <b>*</b></span>
              <textarea
                name="reason"
                rows="4"
                maxLength="1000"
                placeholder="Explain why you need leave..."
                value={form.reason}
                onChange={updateField}
                required
              />
              <small>{form.reason.length}/1000 characters</small>
            </label>

            <div className="sl-form-note sl-field--full">
              <FiAlertCircle />
              <span>
                Your request will remain Pending until it is reviewed by the
                institute. Supporting-document upload will be enabled after
                the secure upload endpoint is added.
              </span>
            </div>

            <div className="sl-form-actions sl-field--full">
              <button
                type="submit"
                className="sl-submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Leave Request"}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="sl-card sl-history">
        <div className="sl-card-heading sl-history-heading">
          <div className="sl-heading-icon"><FiClock /></div>
          <div>
            <h2>My Leave Requests</h2>
            <p>Review your leave history and request decisions.</p>
          </div>
          <span className="sl-count">{requests.length} Requests</span>
        </div>

        {loading ? (
          <div className="sl-state">Loading leave history...</div>
        ) : requests.length === 0 ? (
          <div className="sl-state">
            <FiCalendar />
            <strong>No leave requests yet</strong>
            <span>Your submitted leave applications will appear here.</span>
          </div>
        ) : (
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Date / Range</th>
                  <th>Course / Batch</th>
                  <th>Leave Type</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Admin Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const course =
                    request.course_id?.courseTitle || "—";
                  const batch =
                    request.batch_id?.batch_name || "—";

                  return (
                    <tr key={request._id}>
                      <td>
                        <strong>{formatDate(request.from_date)}</strong>
                        <small>to {formatDate(request.to_date)}</small>
                      </td>
                      <td>
                        <strong>{course}</strong>
                        <small>{batch}</small>
                      </td>
                      <td>{request.leave_type}</td>
                      <td className="sl-reason">{request.reason}</td>
                      <td>
                        <span className={`sl-status sl-status--${statusClass(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="sl-admin-remark">
                        {request.status === "Rejected"
                          ? request.admin_remark || "No remark provided."
                          : "—"}
                      </td>
                      <td>
                        {request.status === "Pending" ? (
                          <button
                            type="button"
                            className="sl-cancel"
                            onClick={() => handleCancel(request._id)}
                            disabled={cancellingId === request._id}
                          >
                            {cancellingId === request._id
                              ? "Cancelling..."
                              : "Cancel"}
                          </button>
                        ) : (
                          <span className="sl-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
