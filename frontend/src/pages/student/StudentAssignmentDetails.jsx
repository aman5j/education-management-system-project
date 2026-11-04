
import { useCallback, useEffect, useMemo, useState } from "react";
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
  FiUploadCloud,
  FiX,
  FiAlertCircle,
  FiHistory,
} from "react-icons/fi";

import studentAssignmentService from "../../services/studentAssignmentService";
import "./StudentAssignments.css";

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

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".zip",
];

const getFileExtension = (name) => {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
};

const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename || "assignment-file";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function StudentAssignmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [downloading, setDownloading] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response =
        await studentAssignmentService.getSubmissionHistory(id);

      const list = response?.data?.data;
      setHistory(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(getError(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [id]);

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

  useEffect(() => {
    if (!loading && assignment) {
      loadHistory();
    }
  }, [loading, assignment, loadHistory]);

  const submitted = Number(submission?.submissionCount) > 0;

  const dueDate = useMemo(
    () => new Date(assignment?.dueAt),
    [assignment?.dueAt]
  );

  const isPastDue =
    assignment &&
    !Number.isNaN(dueDate.getTime()) &&
    Date.now() > dueDate.getTime();

  const lateBlocked =
    Boolean(isPastDue) && !assignment?.allowLateSubmission;

  const canResubmit =
    submitted &&
    Boolean(assignment?.allowResubmission) &&
    Boolean(submission?.resubmissionEnabled);

  const canSubmit = !submitted || canResubmit;

  const submissionBlocked =
    lateBlocked || (submitted && !canResubmit);

  const downloadFile = async (file, type, versionId = null) => {
    const key = `${type}-${file.id}`;

    setDownloading(key);
    setError("");

    try {
      const response =
        type === "reference"
          ? await studentAssignmentService.downloadReferenceFile(
              id,
              file.id
            )
          : await studentAssignmentService.downloadSubmissionFile(
              id,
              versionId,
              file.id
            );

      saveBlob(
        response.data,
        file.originalName || "assignment-file"
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setDownloading("");
    }
  };

  const handleFileSelection = (event) => {
    setError("");
    setSuccess("");

    const incoming = Array.from(event.target.files || []);

    if (!incoming.length) return;

    if (incoming.length > MAX_FILES) {
      setError(`You can select a maximum of ${MAX_FILES} files.`);
      event.target.value = "";
      return;
    }

    const invalid = incoming.find((file) => {
      const extension = getFileExtension(file.name);

      return (
        !ALLOWED_EXTENSIONS.includes(extension) ||
        file.size > MAX_FILE_SIZE
      );
    });

    if (invalid) {
      const extension = getFileExtension(invalid.name);

      setError(
        invalid.size > MAX_FILE_SIZE
          ? `${invalid.name} exceeds the 20 MB file limit.`
          : `${invalid.name} has an unsupported file format.`
      );

      event.target.value = "";
      return;
    }

    setSelectedFiles(incoming);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedFiles.length) {
      setError("Please select at least one file.");
      return;
    }

    if (selectedFiles.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} files.`);
      return;
    }

    if (submissionBlocked) {
      setError(
        lateBlocked
          ? "The deadline has passed and late submissions are not allowed."
          : "Resubmission has not been enabled by your administrator."
      );
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("comment", comment.trim());

    setSubmitting(true);

    try {
      const response =
        await studentAssignmentService.submitAssignment(id, formData);

      const message =
        response?.data?.message || "Assignment submitted successfully.";

      setSuccess(message);
      setSelectedFiles([]);
      setComment("");

      await loadAssignment();
      await loadHistory();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSubmitting(false);
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
          <FiAlertCircle /> {error}
        </div>
      )}

      {success && (
        <div className="sa-inline-success" role="status">
          <FiCheckCircle /> {success}
        </div>
      )}

      <div className="sa-detail-header">
        <div>
          <span className="sa-eyebrow">ASSIGNMENT DETAILS</span>
          <h1>{assignment.title}</h1>
          <p>
            Review instructions, download reference files and submit your work.
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
                      disabled={downloading === `reference-${file.id}`}
                      onClick={() => downloadFile(file, "reference")}
                    >
                      {downloading === `reference-${file.id}` ? (
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
                {assignment.allowResubmission
                  ? "Admin controlled"
                  : "Not allowed"}
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

      {/* SUBMISSION FORM */}
      <section className="sa-panel sa-submit-panel">
        <div className="sa-section-heading">
          <div>
            <h2>{submitted ? "Resubmit assignment" : "Submit assignment"}</h2>
            <p>
              Upload your completed work. Previous versions are retained.
            </p>
          </div>
          {submitted && (
            <span className="sa-version">
              Current version: {submission.submissionCount}
            </span>
          )}
        </div>

        {lateBlocked ? (
          <div className="sa-notice sa-notice-danger">
            <FiAlertCircle />
            <div>
              <strong>Submission deadline has passed</strong>
              <p>Late submissions are not allowed for this assignment.</p>
            </div>
          </div>
        ) : submitted && !canResubmit ? (
          <div className="sa-notice sa-notice-warning">
            <FiClock />
            <div>
              <strong>Resubmission is currently disabled</strong>
              <p>
                Your administrator must enable resubmission for this assignment
                and your student account before you can submit another version.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {isPastDue && assignment.allowLateSubmission && (
              <div className="sa-notice sa-notice-warning">
                <FiAlertCircle />
                <div>
                  <strong>Late submission</strong>
                  <p>
                    The deadline has passed. Your submission will be marked late.
                  </p>
                </div>
              </div>
            )}

            <label className="sa-form-label" htmlFor="sa-submission-files">
              Upload files <span>*</span>
            </label>

            <label className="sa-upload-zone" htmlFor="sa-submission-files">
              <FiUploadCloud />
              <strong>Select your assignment files</strong>
              <span>
                PDF, DOC, DOCX, JPG, PNG, WEBP or ZIP · Max 20 MB per file ·
                Up to 10 files
              </span>
              <input
                id="sa-submission-files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                onChange={handleFileSelection}
                disabled={submitting}
              />
            </label>

            {selectedFiles.length > 0 && (
              <div className="sa-selected-files">
                {selectedFiles.map((file, index) => (
                  <div className="sa-selected-file" key={`${file.name}-${index}`}>
                    <div>
                      <FiFileText />
                      <span>
                        <strong>{file.name}</strong>
                        <small>{formatSize(file.size)}</small>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSelectedFile(index)}
                      disabled={submitting}
                      aria-label={`Remove ${file.name}`}
                    >
                      <FiX />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="sa-form-label" htmlFor="sa-submission-comment">
              Comment (optional)
            </label>

            <textarea
              id="sa-submission-comment"
              className="sa-comment-input"
              rows={4}
              maxLength={5000}
              placeholder="Add a note for your teacher..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={submitting}
            />

            <div className="sa-comment-count">
              {comment.length}/5000 characters
            </div>

            <button
              type="submit"
              className="sa-submit-button"
              disabled={submitting || !selectedFiles.length}
            >
              {submitting ? (
                <>
                  <FiRefreshCw className="sa-spin" />
                  Uploading and submitting...
                </>
              ) : (
                <>
                  <FiUploadCloud />
                  {submitted ? "Submit new version" : "Submit assignment"}
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* SUBMISSION HISTORY */}
      <section className="sa-panel sa-history-panel">
        <div className="sa-section-heading">
          <div>
            <h2><FiHistory /> Submission history</h2>
            <p>Every submitted version is preserved for your reference.</p>
          </div>

          <button
            type="button"
            className="sa-history-refresh"
            onClick={loadHistory}
            disabled={historyLoading}
          >
            <FiRefreshCw className={historyLoading ? "sa-spin" : ""} />
            Refresh
          </button>
        </div>

        {historyLoading ? (
          <div className="sa-history-empty">
            <FiRefreshCw className="sa-spin" />
            Loading submission history...
          </div>
        ) : history.length === 0 ? (
          <div className="sa-history-empty">
            <FiHistory />
            <p>No submissions have been made yet.</p>
          </div>
        ) : (
          <div className="sa-history-list">
            {history.map((version) => (
              <article className="sa-history-card" key={version.id}>
                <div className="sa-history-top">
                  <div>
                    <span className="sa-history-version">
                      Version {version.versionNumber}
                    </span>
                    <small>{formatDate(version.submittedAt)}</small>
                  </div>

                  <span
                    className={`sa-status ${
                      version.isLate
                        ? "sa-status-pending"
                        : "sa-status-submitted"
                    }`}
                  >
                    {version.isLate ? "Late" : "Submitted"}
                  </span>
                </div>

                {version.comment && (
                  <p className="sa-history-comment">{version.comment}</p>
                )}

                <div className="sa-history-files">
                  {(version.files || []).map((file) => (
                    <div className="sa-history-file" key={file.id}>
                      <div>
                        <FiFileText />
                        <span>
                          <strong>{file.originalName}</strong>
                          <small>{formatSize(file.fileSize)}</small>
                        </span>
                      </div>

                      <button
                        type="button"
                        className="sa-download-button"
                        disabled={
                          downloading === `history-${file.id}`
                        }
                        onClick={() =>
                          downloadFile(file, "history", version.id)
                        }
                      >
                        {downloading === `history-${file.id}` ? (
                          <FiRefreshCw className="sa-spin" />
                        ) : (
                          <FiDownload />
                        )}
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
