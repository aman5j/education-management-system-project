
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
import { IoIosCall, IoMdInformationCircle } from "react-icons/io";
import { MdDateRange, MdOutgoingMail } from "react-icons/md";

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
  const [activeTab, setActiveTab] = useState("apply");

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
      <div className="page-header">
        <div>
          <h1>My Leave Request</h1>
         
        </div>

        <button
          type="button"
          className="themebtn sl-refresh"
          onClick={() => loadPage(true)}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? "sl-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="sl-alert sl-alert--error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="sl-alert sl-alert--success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss message">
            ×
          </button>
        </div>
      )}

      <div className="sl-tabs-wrapper">
        <div className="student-profile__tabs" role="tablist" aria-label="Leave request sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "apply"}
            className={`sl-tab ${activeTab === "apply" ? "active" : ""}`}
            onClick={() => setActiveTab("apply")}
          >
            <FiFileText />
            Apply for Leave
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={`sl-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <FiCalendar />
            Leave History
            <span>{requests.length}</span>
          </button>
        </div>
      </div>

      {activeTab === "apply" && (
        <section className="common-card sl-tab-content" role="tabpanel">
          <div className="panel-header">
            <div>
              <h3>Apply for Leave</h3>
              <p>Fill in the details to submit your leave application.</p>
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
            <form className="cardbody" onSubmit={handleSubmit}>
              <div className="gird-form-leave">
                <div className="input-felid">
                  <label>
                    Course / Batch <span className="required">*</span>
                    <span
                      className="infoicon tooltip"
                      data-tooltip="Select the admission for which you need leave."
                    >
                      <IoMdInformationCircle />
                    </span>
                  </label>

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
                </div>

                <div className="input-felid">
                  <label>
                    Leave Type <span className="required">*</span>
                  </label>
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
                </div>

                <div className="input-felid">
                  <label>
                    From Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    name="from_date"
                    min={today()}
                    value={form.from_date}
                    onChange={updateField}
                    required
                  />
                </div>

                <div className="input-felid">
                  <label>
                    To Date <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    name="to_date"
                    min={form.from_date || today()}
                    value={form.to_date}
                    onChange={updateField}
                    required
                  />
                </div>

                <div className="input-felid student-form-full">
                  <label>
                    Reason for Leave <span className="required">*</span>
                  </label>
                  <textarea
                    name="reason"
                    rows="4"
                    maxLength="1000"
                    placeholder="Explain why you need leave..."
                    value={form.reason}
                    onChange={updateField}
                    required
                  />
                  <small className="infotext">
                    {form.reason.length}/1000 characters
                  </small>
                </div>
              </div>

              <div className="sl-form-actions">
                <button
                  type="submit"
                  className="themebtn"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Leave Request"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === "history" && (
        <section className="common-card sl-tab-content" role="tabpanel">
          <div className="panel-header">
            <div>
              <h3>Leave History</h3>
              <p>Track all your submitted leave applications.</p>
            </div>
            <span className="sc-recommendations__count">
              {requests.length} Requests
            </span>
          </div>

          {loading ? (
            <div className="sl-state">Loading leave history...</div>
          ) : requests.length === 0 ? (
            <div className="sl-state">
              <FiCalendar />
              <strong>No leave requests yet</strong>
              <span>Your submitted leave applications will appear here.</span>
              <button
                type="button"
                className="themebtn"
                onClick={() => setActiveTab("apply")}
              >
                Apply for Leave
              </button>
            </div>
          ) : (
            <div className="common-table-wrapper">
              <table className="common-table">
                <thead>
                  <tr>
                    <th>Applied On</th>
                    <th>Leave Date / Range</th>
                    <th>Course</th>
                    <th>Leave Type</th>
                    <th>Leave Reason</th>
                    <th>Status</th>
                    <th>Admin Remark</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => {
                    const course = request.course_id?.courseTitle || "—";
                    const batch = request.batch_id?.batch_name || "—";

                    return (
                      <tr key={request._id}>
                        <td>
                            <div className="contact-details">
                     <div className="contact-li"> <MdDateRange />  <span>  {formatAppliedDate(request.createdAt)}</span></div>
                    </div>
                        
                        </td>
                        <td>
                           <div className="contact-details">
                     <div className="contact-li"> <MdDateRange />  <span> {formatDate(request.from_date)}</span></div> To
                    <div className="contact-li"> <MdDateRange /> <span>{formatDate(request.to_date)}</span></div>
                    </div>
                        
                        </td>
                        <td>
                          {course}
                         
                        </td>
                        <td>{request.leave_type}</td>
                        <td className="sl-reason">{request.reason}</td>
                        <td>
                          <span
                            className={`status ${statusClass(request.status)}`}
                          >
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
                              className="tablebtn cancle"
                              onClick={() => handleCancel(request._id)}
                              disabled={cancellingId === request._id}
                            >
                              {cancellingId === request._id
                                ? "Cancelling..."
                                : "Cancel Request"}
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
      )}
    </main>
  );
}
