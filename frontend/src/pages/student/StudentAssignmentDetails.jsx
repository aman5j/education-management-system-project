
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiTarget,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";

import studentAssignmentService from "../../services/studentAssignmentService";
import "./StudentAssignments.css";

const getError = (error) =>
  error?.response?.data?.message ||
  "Unable to load assignment details.";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatSize = (bytes) => {
  const size = Number(bytes || 0);

  if (!size) return "Size unavailable";
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export default function StudentAssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");

  const loadAssignment = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await studentAssignmentService.getAssignment(id);

      const data = response?.data?.data;

      if (!data?.assignment) {
        throw new Error("Assignment details were not returned.");
      }

      setAssignment(data.assignment);
      setSubmission(data.submission || null);
    } catch (err) {
      setAssignment(null);
      setSubmission(null);
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  const downloadFile = async (file) => {
    const key = file.id;
    setDownloading(key);
    setError("");

    try {
      const response =
        await studentAssignmentService.downloadReferenceFile(
          id,
          file.id
        );

      const blobUrl = URL.createObjectURL(
        new Blob([response.data])
      );

      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = file.originalName || "assignment-reference";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDownloading("");
    }
  };

  if (loading) {
    return (
      <div className="sa-page">
        <div className="sa-state">
          <FiRefreshCw className="sa-spin" />
          <h3>Loading assignment</h3>
          <p>Please wait.</p>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="sa-page">
        <button
          type="button"
          className="sa-back-button"
          onClick={() => navigate("/student/assignments")}
        >
          <FiArrowLeft /> Back to assignments
        </button>

        <div className="sa-state sa-state-error">
          <h3>Unable to open assignment</h3>
          <p>{error}</p>
          <button type="button" onClick={loadAssignment}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const submitted = Number(submission?.submissionCount) > 0;

  return (
    <div className="sa-page">
      <button
        type="button"
        className="sa-back-button"
        onClick={() => navigate("/student/assignments")}
      >
        <FiArrowLeft /> Back to assignments
      </button>

      {error && (
        <div className="sa-inline-error" role="alert">
          {error}
        </div>
      )}

      <div className="sa-detail-header">
        <div>
          <span className="sa-eyebrow">ASSIGNMENT DETAILS</span>
          <h1>{assignment.title}</h1>
          <p>
            Review the assignment information and download its reference files.
          </p>
        </div>

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

      <div className="sa-detail-grid">
        <section className="sa-panel sa-detail-main">
          <h2>Assignment information</h2>

          <div className="sa-detail-description">
            {assignment.description || "No description provided."}
          </div>

          <div className="sa-detail-section">
            <h3>Instructions</h3>
            <div className="sa-instructions">
              {assignment.instructions || "No additional instructions provided."}
            </div>
          </div>

          <div className="sa-detail-section">
            <h3>Reference attachments</h3>

            {assignment.attachments?.length ? (
              <div className="sa-files">
                {assignment.attachments.map((file) => (
                  <div className="sa-file-row" key={file.id}>
                    <div className="sa-file-info">
                      <span className="sa-file-icon">
                        <FiFileText />
                      </span>
                      <div>
                        <strong>{file.originalName}</strong>
                        <small>{formatSize(file.fileSize)}</small>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="sa-download-button"
                      disabled={downloading === file.id}
                      onClick={() => downloadFile(file)}
                    >
                      {downloading === file.id ? (
                        <FiRefreshCw className="sa-spin" />
                      ) : (
                        <FiDownload />
                      )}
                      Download
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sa-empty-files">
                No reference attachments are available.
              </div>
            )}
          </div>
        </section>

        <aside className="sa-panel sa-detail-side">
          <h2>Assignment summary</h2>

          <div className="sa-summary-item">
            <FiBookOpen />
            <div>
              <small>Course</small>
              <strong>{assignment.course?.title || "—"}</strong>
            </div>
          </div>

          <div className="sa-summary-item">
            <FiTarget />
            <div>
              <small>Subject</small>
              <strong>{assignment.subject?.name || "General assignment"}</strong>
            </div>
          </div>

          <div className="sa-summary-item">
            <FiCalendar />
            <div>
              <small>Assigned on</small>
              <strong>{formatDate(assignment.assignedAt)}</strong>
            </div>
          </div>

          <div className="sa-summary-item">
            <FiClock />
            <div>
              <small>Due date</small>
              <strong>{formatDate(assignment.dueAt)}</strong>
            </div>
          </div>

          <div className="sa-summary-item">
            <FiFileText />
            <div>
              <small>Total marks</small>
              <strong>{Number(assignment.total_marks || 0)}</strong>
            </div>
          </div>

          <div className="sa-summary-item">
            <FiCheckCircle />
            <div>
              <small>Late submission</small>
              <strong>
                {assignment.allowLateSubmission ? "Allowed" : "Not allowed"}
              </strong>
            </div>
          </div>

          <div className="sa-summary-item">
            <FiRefreshCw />
            <div>
              <small>Resubmission</small>
              <strong>
                {assignment.allowResubmission ? "Admin controlled" : "Not allowed"}
              </strong>
            </div>
          </div>

          {assignment.batches?.length > 0 && (
            <div className="sa-summary-batches">
              <small>Target batches</small>
              <div>
                {assignment.batches.map((batch) => (
                  <span key={batch.id}>{batch.name}</span>
                ))}
              </div>
            </div>
          )}

          {assignment.batches?.length === 0 && (
            <div className="sa-summary-note">
              This assignment is available to eligible active admissions
              across the selected course.
            </div>
          )}
        </aside>
      </div>

      <section className="sa-panel sa-submission-info">
        <h2>My submission</h2>

        {submitted ? (
          <div className="sa-submission-status">
            <span className="sa-submission-check">
              <FiCheckCircle />
            </span>
            <div>
              <strong>Assignment submitted</strong>
              <p>
                Latest submission: {formatDate(submission.lastSubmittedAt)}
              </p>
              <p>
                Submission versions: {submission.submissionCount}
              </p>
            </div>
          </div>
        ) : (
          <div className="sa-submission-status">
            <span className="sa-submission-pending">
              <FiClock />
            </span>
            <div>
              <strong>No submission yet</strong>
              <p>
                Submission and resubmission features will be available in
                the next assignment phase.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
