
import { useCallback, useEffect, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiXCircle,
} from "react-icons/fi";

import {
  getExamReviewQueue,
  submitExamReview,
} from "../../../services/examService";

import "../../../styles/ExamReview.css";

const PAGE_SIZE = 10;

const REVIEW_STATUSES = [
  { label: "Pending Review", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default function ExamReview() {
  const [exams, setExams] = useState([]);
  const [reviewStatus, setReviewStatus] = useState("Pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedExam, setSelectedExam] = useState(null);
  const [decision, setDecision] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getExamReviewQueue({
        reviewStatus,
        search: search.trim(),
        page,
        limit: PAGE_SIZE,
      });

      const payload = response?.data?.data ?? {};

      setExams(Array.isArray(payload.exams) ? payload.exams : []);
      setPagination(
        payload.pagination || { total: 0, totalPages: 0 }
      );
    } catch (err) {
      setExams([]);
      setError(
        getErrorMessage(err, "Unable to load exam review queue.")
      );
    } finally {
      setLoading(false);
    }
  }, [reviewStatus, search, page]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const openDecision = (exam, selectedDecision) => {
    setSelectedExam(exam);
    setDecision(selectedDecision);
    setReviewComment("");
    setFormError("");
    setNotice("");
  };

  const closeDecision = () => {
    if (saving) return;

    setSelectedExam(null);
    setDecision("");
    setReviewComment("");
    setFormError("");
  };

  const handleDecision = async (event) => {
    event.preventDefault();
    setFormError("");

    const comment = reviewComment.trim();

    if (decision === "Rejected" && !comment) {
      setFormError("A comment is required when rejecting an exam.");
      return;
    }

    setSaving(true);

    try {
      await submitExamReview(selectedExam._id, {
        decision,
        reviewComment: comment,
      });

      setNotice(
        decision === "Approved"
          ? "Exam schedule approved successfully."
          : "Exam schedule rejected successfully."
      );

      setSelectedExam(null);
      setDecision("");
      setReviewComment("");

      if (exams.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await loadExams();
      }
    } catch (err) {
      setFormError(
        getErrorMessage(err, "Unable to submit the review decision.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (value) => {
    setReviewStatus(value);
    setPage(1);
    setNotice("");
    setError("");
  };

  return (
    <div className="exam-review-page">
      <header className="exam-review-header">
        <div>
          <span className="exam-review-eyebrow">
            ASSESSMENT MANAGEMENT
          </span>
          <h1>Exam Review</h1>
          <p>
            Review examination schedules and record approval decisions.
          </p>
        </div>

        <button
          type="button"
          className="exam-review-secondary-btn"
          onClick={loadExams}
          disabled={loading}
        >
          <FiRefreshCw />
          Refresh
        </button>
      </header>

      {error && (
        <div className="exam-review-alert exam-review-alert-error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <FiX />
          </button>
        </div>
      )}

      {notice && (
        <div className="exam-review-alert exam-review-alert-success" role="status">
          {notice}
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <FiX />
          </button>
        </div>
      )}

      <section className="exam-review-card">
        <div className="exam-review-toolbar">
          <div className="exam-review-tabs" role="group" aria-label="Review status">
            {REVIEW_STATUSES.map((status) => (
              <button
                type="button"
                key={status.value}
                className={
                  reviewStatus === status.value
                    ? "exam-review-tab active"
                    : "exam-review-tab"
                }
                onClick={() => handleStatusChange(status.value)}
              >
                {status.value === "Pending" && <FiClock />}
                {status.value === "Approved" && <FiCheckCircle />}
                {status.value === "Rejected" && <FiXCircle />}
                {status.label}
              </button>
            ))}
          </div>

          <label className="exam-review-search">
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Search exam name..."
              aria-label="Search exam name"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>

        <div className="exam-review-summary">
          <strong>{pagination.total}</strong>{" "}
          {reviewStatus.toLowerCase()} exam
          {pagination.total === 1 ? "" : "s"}
        </div>

        <div className="exam-review-table-wrap">
          <table className="exam-review-table">
            <thead>
              <tr>
                <th>Examination</th>
                <th>Course / Subject</th>
                <th>Batch</th>
                <th>Date & Time</th>
                <th>Marks</th>
                <th>Review Status</th>
                <th>Review Details</th>
                {reviewStatus === "Pending" && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={reviewStatus === "Pending" ? 8 : 7}
                    className="exam-review-empty"
                  >
                    Loading review queue...
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td
                    colSpan={reviewStatus === "Pending" ? 8 : 7}
                    className="exam-review-empty"
                  >
                    <FiCheckCircle />
                    <strong>No {reviewStatus.toLowerCase()} exams found</strong>
                    <span>
                      {reviewStatus === "Pending"
                        ? "All caught up. There are no exams awaiting review."
                        : "No exams match this status and search."}
                    </span>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam._id}>
                    <td>
                      <strong>{exam.examName}</strong>
                      <span className="exam-review-subtext">
                        {exam.examType}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {exam.course_id?.courseTitle || "—"}
                      </strong>
                      <span className="exam-review-subtext">
                        {exam.subject_id?.subjectName || "—"}
                        {exam.subject_id?.subjectCode
                          ? ` (${exam.subject_id.subjectCode})`
                          : ""}
                      </span>
                    </td>

                    <td>{exam.batch_id?.batch_name || "—"}</td>

                    <td>
                      <strong>{formatDate(exam.examDate)}</strong>
                      <span className="exam-review-subtext">
                        {exam.startTime}–{exam.endTime}
                      </span>
                    </td>

                    <td>
                      <strong>{exam.totalMarks}</strong>
                      <span className="exam-review-subtext">
                        Pass: {exam.passingMarks}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`exam-review-status exam-review-status-${exam.reviewStatus?.toLowerCase()}`}
                      >
                        {exam.reviewStatus || "Pending"}
                      </span>
                    </td>

                    <td>
                      {exam.reviewedBy?.name && (
                        <span className="exam-review-subtext">
                          By: {exam.reviewedBy.name}
                        </span>
                      )}
                      {exam.reviewedAt && (
                        <span className="exam-review-subtext">
                          {formatDate(exam.reviewedAt)}
                        </span>
                      )}
                      {exam.reviewComment ? (
                        <span
                          className="exam-review-comment-preview"
                          title={exam.reviewComment}
                        >
                          {exam.reviewComment}
                        </span>
                      ) : (
                        <span className="exam-review-subtext">No comment</span>
                      )}
                    </td>

                    {reviewStatus === "Pending" && (
                      <td>
                        <div className="exam-review-actions">
                          <button
                            type="button"
                            className="exam-review-approve-btn"
                            onClick={() => openDecision(exam, "Approved")}
                          >
                            <FiCheckCircle />
                            Approve
                          </button>
                          <button
                            type="button"
                            className="exam-review-reject-btn"
                            onClick={() => openDecision(exam, "Rejected")}
                          >
                            <FiXCircle />
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination.totalPages > 0 && (
          <div className="exam-review-pagination">
            <span>
              Page {page} of {pagination.totalPages}
            </span>

            <div>
              <button
                type="button"
                className="exam-review-secondary-btn"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="exam-review-secondary-btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedExam && (
        <div
          className="exam-review-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section
            className="exam-review-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-review-modal-title"
          >
            <div className="exam-review-modal-heading">
              <div>
                <span className="exam-review-eyebrow">
                  {decision === "Approved" ? "APPROVAL" : "REJECTION"}
                </span>
                <h2 id="exam-review-modal-title">
                  {decision === "Approved"
                    ? "Approve Exam Schedule"
                    : "Reject Exam Schedule"}
                </h2>
              </div>

              <button
                type="button"
                className="exam-review-close-btn"
                onClick={closeDecision}
                aria-label="Close dialog"
                disabled={saving}
              >
                <FiX />
              </button>
            </div>

            <div className="exam-review-selected-exam">
              <strong>{selectedExam.examName}</strong>
              <span>
                {selectedExam.course_id?.courseTitle || "—"} ·{" "}
                {selectedExam.subject_id?.subjectName || "—"}
              </span>
              <span>
                {formatDate(selectedExam.examDate)} ·{" "}
                {selectedExam.startTime}–{selectedExam.endTime}
              </span>
            </div>

            {formError && (
              <div className="exam-review-alert exam-review-alert-error" role="alert">
                {formError}
              </div>
            )}

            <form onSubmit={handleDecision}>
              <label className="exam-review-comment-field">
                Review comment {decision === "Rejected" ? "*" : "(optional)"}
                <textarea
                  value={reviewComment}
                  onChange={(event) => {
                    setReviewComment(event.target.value);
                    setFormError("");
                  }}
                  maxLength={1000}
                  rows={4}
                  placeholder={
                    decision === "Approved"
                      ? "Add an optional approval note..."
                      : "Explain why this exam schedule is being rejected..."
                  }
                  required={decision === "Rejected"}
                />
                <span>{reviewComment.length}/1000 characters</span>
              </label>

              {decision === "Rejected" && (
                <p className="exam-review-rejection-note">
                  A clear comment is required so the reason for rejection is recorded.
                </p>
              )}

              <div className="exam-review-modal-actions">
                <button
                  type="button"
                  className="exam-review-secondary-btn"
                  onClick={closeDecision}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={
                    decision === "Approved"
                      ? "exam-review-approve-btn"
                      : "exam-review-reject-btn"
                  }
                  disabled={saving}
                >
                  {saving
                    ? "Submitting..."
                    : decision === "Approved"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
