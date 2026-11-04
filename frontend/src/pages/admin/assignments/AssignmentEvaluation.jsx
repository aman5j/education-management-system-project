import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiSave,
  FiUser,
} from "react-icons/fi";

import {
  getSubmissionEvaluation,
  saveSubmissionEvaluation,
  publishSubmissionEvaluation,
  downloadSubmissionFile,
} from "../../../services/assignmentService";

import "./AssignmentEvaluation.css";

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

export default function AssignmentEvaluation() {
  const { id, submissionId } = useParams();
  const navigate = useNavigate();

  const [details, setDetails] = useState(null);
  const [marks, setMarks] = useState("");
  const [feedback, setFeedback] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getSubmissionEvaluation(submissionId);
      const root = getRoot(response);

      setDetails(root);

      const evaluation = root.evaluation;

      setMarks(
        evaluation?.marksObtained !== undefined &&
        evaluation?.marksObtained !== null
          ? String(evaluation.marksObtained)
          : ""
      );

      setFeedback(evaluation?.feedback || "");
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const assignment = details?.assignment;
  const submission = details?.submission;
  const student = submission?.student;
  const version = submission?.latestVersion;
  const evaluation = details?.evaluation;

  const isPublished = evaluation?.status === "Published";
  const totalMarks = Number(assignment?.total_marks || 0);

  const studentName = [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown student";

  const handleDownload = async (file) => {
    if (!file?.id) return;

    setDownloading(file.id);
    setError("");

    try {
      const response = await downloadSubmissionFile(
        submissionId,
        file.id
      );

      saveBlob(response.data, file.originalName);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDownloading("");
    }
  };

  const validateForm = () => {
    if (marks === "" || marks === null) {
      setError("Please enter marks obtained.");
      return false;
    }

    const numericMarks = Number(marks);

    if (!Number.isFinite(numericMarks) || numericMarks < 0) {
      setError("Marks must be a valid non-negative number.");
      return false;
    }

    if (numericMarks > totalMarks) {
      setError(`Marks cannot exceed ${totalMarks}.`);
      return false;
    }

    if (feedback.length > 10000) {
      setError("Feedback cannot exceed 10,000 characters.");
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    if (
      isPublished &&
      !window.confirm(
        "This result is already published. Saving changes will change it back to Draft and temporarily hide the result from the student. Continue?"
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response = await saveSubmissionEvaluation(
        submissionId,
        {
          marksObtained: Number(marks),
          feedback: feedback.trim(),
        }
      );

      setSuccess(
        response?.data?.message || "Evaluation saved as Draft."
      );

      await loadDetails();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setError("");
    setSuccess("");

    if (!evaluation || evaluation.status !== "Draft") {
      setError("Save the evaluation as Draft before publishing.");
      return;
    }

    if (!validateForm()) return;

    if (
      !window.confirm(
        `Publish ${marks} out of ${totalMarks} marks for ${studentName}? The student will be able to view the result.`
      )
    ) {
      return;
    }

    setPublishing(true);

    try {
      const response = await publishSubmissionEvaluation(
        submissionId
      );

      setSuccess(
        response?.data?.message || "Evaluation published successfully."
      );

      await loadDetails();
    } catch (err) {
      setError(getError(err));
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="ae-page">
        <div className="ae-loading">Loading submission details...</div>
      </div>
    );
  }

  if (!details || !assignment || !submission) {
    return (
      <div className="ae-page">
        <div className="ae-alert ae-error">
          {error || "Submission details could not be loaded."}
        </div>

        <button
          className="ae-secondary-button"
          onClick={() => navigate(`/admin/assignments/${id}/submissions`)}
        >
          <FiArrowLeft /> Back to Submissions
        </button>
      </div>
    );
  }

  return (
    <div className="ae-page">
      <div className="ae-header">
        <div>
          <button
            className="ae-back-button"
            onClick={() =>
              navigate(`/admin/assignments/${id}/submissions`)
            }
          >
            <FiArrowLeft /> Back to Submissions
          </button>

          <span className="ae-eyebrow">ASSIGNMENT MANAGEMENT</span>
          <h1>Evaluate Submission</h1>
          <p>Review the latest student submission and publish its result.</p>
        </div>

        <span
          className={`ae-status ${
            isPublished ? "ae-status-published" : "ae-status-draft"
          }`}
        >
          {evaluation?.status || "Not evaluated"}
        </span>
      </div>

      {error && <div className="ae-alert ae-error">{error}</div>}
      {success && <div className="ae-alert ae-success">{success}</div>}

      <section className="ae-card">
        <div className="ae-card-heading">
          <FiBookOpen />
          <div>
            <h2>{assignment.title}</h2>
            <p>
              {assignment.course || "Course"} ·{" "}
              {assignment.subject || "General assignment"}
            </p>
          </div>
        </div>

        <div className="ae-meta-grid">
          <div>
            <span>Total marks</span>
            <strong>{totalMarks}</strong>
          </div>

          <div>
            <span>Due date</span>
            <strong>{formatDate(assignment.dueAt)}</strong>
          </div>

          <div>
            <span>Submission status</span>
            <strong>{submission.status}</strong>
          </div>

          <div>
            <span>Submission versions</span>
            <strong>{submission.submissionCount || 1}</strong>
          </div>
        </div>
      </section>

      <section className="ae-card">
        <div className="ae-section-heading">
          <div className="ae-section-icon">
            <FiUser />
          </div>
          <div>
            <h2>Student information</h2>
            <p>Student linked to this assignment submission.</p>
          </div>
        </div>

        <div className="ae-student-grid">
          <div>
            <span>Student name</span>
            <strong>{studentName}</strong>
          </div>

          <div>
            <span>Roll number</span>
            <strong>{student?.rollNo || "—"}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{student?.email || "—"}</strong>
          </div>

          <div>
            <span>Mobile</span>
            <strong>{student?.mobile || "—"}</strong>
          </div>
        </div>
      </section>

      <section className="ae-card">
        <div className="ae-section-heading">
          <div className="ae-section-icon">
            <FiFileText />
          </div>
          <div>
            <h2>Latest submitted work</h2>
            <p>
              Version {version?.versionNumber || 1} · Submitted{" "}
              {formatDate(version?.submittedAt)}
            </p>
          </div>
        </div>

        {version?.isLate && (
          <div className="ae-late-note">
            This submission was submitted after the assignment due date.
          </div>
        )}

        {version?.comment && (
          <div className="ae-comment">
            <span>Student comment</span>
            <p>{version.comment}</p>
          </div>
        )}

        <div className="ae-file-list">
          {(version?.files || []).length === 0 ? (
            <p className="ae-muted">No files were attached to this submission.</p>
          ) : (
            version.files.map((file) => (
              <div className="ae-file-row" key={file.id}>
                <div className="ae-file-info">
                  <FiFileText />
                  <div>
                    <strong>{file.originalName}</strong>
                    <span>{formatSize(file.fileSize)}</span>
                  </div>
                </div>

                <button
                  className="ae-download-button"
                  onClick={() => handleDownload(file)}
                  disabled={downloading === file.id}
                >
                  <FiDownload />
                  {downloading === file.id ? "Downloading..." : "Download"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="ae-card ae-evaluation-card">
        <div className="ae-section-heading">
          <div className="ae-section-icon">
            <FiCheckCircle />
          </div>
          <div>
            <h2>Evaluation and feedback</h2>
            <p>
              Save as Draft to keep the result private, or publish it for the
              student.
            </p>
          </div>
        </div>

        {isPublished && (
          <div className="ae-published-note">
            This result is published and visible to the student. If you edit
            and save it, it will return to Draft until published again.
          </div>
        )}

        <div className="ae-marks-field">
          <label htmlFor="ae-marks">
            Marks obtained <span>*</span>
          </label>

          <div className="ae-marks-input">
            <input
              id="ae-marks"
              type="number"
              min="0"
              max={totalMarks}
              step="0.01"
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
              placeholder="Enter marks"
            />

            <span>/ {totalMarks}</span>
          </div>

          <small>Enter a value from 0 to {totalMarks}.</small>
        </div>

        <div className="ae-feedback-field">
          <label htmlFor="ae-feedback">Feedback for student</label>

          <textarea
            id="ae-feedback"
            rows="6"
            maxLength={10000}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Write constructive feedback, corrections, and suggestions..."
          />

          <small>{feedback.length}/10000 characters</small>
        </div>

        <div className="ae-actions">
          <button
            className="ae-save-button"
            onClick={handleSaveDraft}
            disabled={saving || publishing}
          >
            <FiSave />
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            className="ae-publish-button"
            onClick={handlePublish}
            disabled={
              saving ||
              publishing ||
              !evaluation ||
              evaluation.status !== "Draft"
            }
          >
            <FiCheckCircle />
            {publishing ? "Publishing..." : "Publish Result"}
          </button>
        </div>

        {evaluation?.publishedAt && (
          <div className="ae-published-date">
            <FiCalendar />
            Published on {formatDate(evaluation.publishedAt)}
          </div>
        )}
      </section>
    </div>
  );
}