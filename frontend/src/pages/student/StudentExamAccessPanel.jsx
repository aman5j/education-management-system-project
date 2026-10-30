
import { useCallback, useEffect, useState } from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiShield,
  FiSend,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentExamAccessPanel.css";

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to process your exam access request.";

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export default function StudentExamAccessPanel({
  ticketId,
  onUpdated,
}) {
  const [requestStatus, setRequestStatus] = useState("Loading");
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequest = useCallback(async () => {
    if (!ticketId) return;

    setLoading(true);
    setError("");

    try {
      const response =
        await studentPortalService.getMyExamAccessRequest(ticketId);

      const data = response?.data || {};

      setRequestStatus(data.status || "NotRequested");
      setRequest(data.request || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleRequest = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response =
        await studentPortalService.requestMyExamAccess(ticketId);

      const data = response?.data || {};

      setRequestStatus(data.status || data?.data?.status || "Pending");
      setRequest(data.request || data?.data || null);

      setNotice(
        response?.message ||
          "Your exam access request has been submitted."
      );

      await loadRequest();

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isApproved = requestStatus === "Approved";
  const isPending = requestStatus === "Pending";
  const isRejected = requestStatus === "Rejected";

  return (
    <section className="sea-panel">
      <div className="sea-heading">
        <span className="sea-icon">
          <FiShield />
        </span>

        <div>
          <h3>Exam access approval</h3>
          <p>
            Your institute administrator must approve your request
            before a new exam attempt can begin.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="sea-loading">
          <FiRefreshCw className="sea-spin" />
          Checking your access request...
        </div>
      ) : (
        <>
          <div className="sea-status-row">
            <span>Request status</span>

            <span
              className={`sea-status sea-status--${requestStatus.toLowerCase()}`}
            >
              {requestStatus === "NotRequested"
                ? "Not requested"
                : requestStatus}
            </span>
          </div>

          {isApproved && (
            <div className="sea-message sea-message--success">
              <FiCheckCircle />
              <div>
                <strong>Access approved</strong>
                <p>
                  Your administrator has approved your exam access.
                  You can start the exam when the scheduled time begins.
                </p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="sea-message sea-message--pending">
              <FiClock />
              <div>
                <strong>Waiting for administrator approval</strong>
                <p>
                  Your request has been submitted. Please wait for
                  your institute administrator to review it.
                </p>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="sea-message sea-message--rejected">
              <FiAlertCircle />
              <div>
                <strong>Request rejected</strong>
                <p>
                  {request?.rejectionReason ||
                    "Please contact your institute administrator for details."}
                </p>
              </div>
            </div>
          )}

          {request?.requestedAt && (
            <p className="sea-date">
              Requested: {formatDateTime(request.requestedAt)}
            </p>
          )}

          {request?.reviewedAt && (
            <p className="sea-date">
              Reviewed: {formatDateTime(request.reviewedAt)}
            </p>
          )}

          {error && (
            <div className="sea-error" role="alert">
              <FiAlertCircle />
              {error}
            </div>
          )}

          {notice && (
            <div className="sea-success" role="status">
              <FiCheckCircle />
              {notice}
            </div>
          )}

          {!isApproved && !isPending && (
            <button
              type="button"
              className="sea-request-button"
              onClick={handleRequest}
              disabled={submitting}
            >
              <FiSend />
              {submitting
                ? "Submitting..."
                : isRejected
                  ? "Submit request again"
                  : "Request exam access"}
            </button>
          )}

          <button
            type="button"
            className="sea-refresh-button"
            onClick={loadRequest}
            disabled={loading || submitting}
          >
            <FiRefreshCw />
            Refresh approval status
          </button>
        </>
      )}
    </section>
  );
}
