
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

import {
  getSubmissionEvaluation,
  saveSubmissionEvaluation,
  publishSubmissionEvaluation,
  downloadSubmissionFile,
} from "../../../services/assignmentService";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "./AssignmentEvaluation.css";

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

const getRoot = (response) =>
  response?.data?.data ?? response?.data ?? {};

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
  const size = Number(bytes) || 0;

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const saveBlob = (blob, filename) => {
  if (!blob) {
    throw new Error("Downloaded file is empty.");
  }

  const fileBlob =
    blob instanceof Blob
      ? blob
      : new Blob([blob]);

  const url = window.URL.createObjectURL(fileBlob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename || "submission-file";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Give the browser time to start the download.
  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
};

const getEvaluationStatus = (evaluation) => {
  if (!evaluation) return "Not evaluated";

  if (evaluation.status === "Published") return "Published";

  if (evaluation.status === "Draft") return "Draft";

  return evaluation.status || "Not evaluated";
};

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------

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

  const [loadError, setLoadError] = useState("");

  // --------------------------------------------------
  // LOAD EVALUATION DETAILS
  // --------------------------------------------------

  const loadDetails = useCallback(async (showErrorToast = false) => {
    if (!submissionId) {
      setLoadError("Submission ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");

    try {
      const response = await getSubmissionEvaluation(submissionId);
      const root = getRoot(response);

      if (
        !root.assignment ||
        !root.submission
      ) {
        throw new Error(
          "The server returned incomplete submission details."
        );
      }

      setDetails(root);

      const evaluation = root.evaluation;

      setMarks(
        evaluation?.marksObtained !== undefined &&
        evaluation?.marksObtained !== null
          ? String(evaluation.marksObtained)
          : ""
      );

      setFeedback(evaluation?.feedback || "");

    } catch (error) {
      const message = getApiErrorMessage(error);

      setLoadError(message);

      if (showErrorToast) {
        notification.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // --------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------

  const assignment = details?.assignment;
  const submission = details?.submission;
  const student = submission?.student;
  const version = submission?.latestVersion;
  const evaluation = details?.evaluation;

  const totalMarks = Number(assignment?.total_marks || 0);

  const isPublished = evaluation?.status === "Published";

  const isDraft = evaluation?.status === "Draft";

  const evaluationStatus = getEvaluationStatus(evaluation);

  const studentName = [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown student";

  const savedMarks =
    evaluation?.marksObtained !== undefined &&
    evaluation?.marksObtained !== null
      ? String(evaluation.marksObtained)
      : "";

  const savedFeedback = evaluation?.feedback || "";

  // Detect changes that have not yet been saved.
  const isDirty = useMemo(() => {
    return (
      marks !== savedMarks ||
      feedback !== savedFeedback
    );
  }, [marks, feedback, savedMarks, savedFeedback]);

  // Check whether an existing evaluation belongs to
  // the latest submission version.
  const isStaleEvaluation = Boolean(
    evaluation?.submissionVersion_id &&
    version?.id &&
    String(evaluation.submissionVersion_id) !==
      String(version.id)
  );

  // --------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------

  const handleBack = () => {
    navigate(`/admin/assignments/${id}/submissions`);
  };

  // --------------------------------------------------
  // FORM VALIDATION
  // --------------------------------------------------

  const validateForm = () => {
    if (
      marks === "" ||
      marks === null ||
      marks === undefined
    ) {
      notification.warning("Please enter marks obtained.");
      return false;
    }

    const numericMarks = Number(marks);

    if (
      !Number.isFinite(numericMarks) ||
      numericMarks < 0
    ) {
      notification.warning(
        "Marks must be a valid non-negative number."
      );
      return false;
    }

    if (numericMarks > totalMarks) {
      notification.warning(
        `Marks cannot exceed ${totalMarks}.`
      );
      return false;
    }

    if (feedback.length > 10000) {
      notification.warning(
        "Feedback cannot exceed 10,000 characters."
      );
      return false;
    }

    return true;
  };

  // --------------------------------------------------
  // DOWNLOAD SUBMISSION FILE
  // --------------------------------------------------

  const handleDownload = async (file) => {
    if (!file?.id || downloading) return;

    setDownloading(file.id);

    try {
      const response = await downloadSubmissionFile(
        submissionId,
        file.id
      );

      saveBlob(response?.data, file.originalName);

      notification.success("File download started.");
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setDownloading("");
    }
  };

  // --------------------------------------------------
  // SAVE EVALUATION AS DRAFT
  // --------------------------------------------------

  const handleSaveDraft = async () => {
    if (saving || publishing) return;

    if (!validateForm()) return;

    // Editing a published result makes it private again.
    if (isPublished) {
      const confirmed = await notification.confirm({
        title: "Edit published result?",
        text:
          "Saving changes will move this result back to Draft. " +
          "The student will temporarily lose access to the published result until you publish it again.",
        confirmText: "Yes, save as Draft",
        cancelText: "Cancel",
        icon: "warning",
        confirmButtonColor: "#d97706",
      });

      if (!confirmed) return;
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

      notification.success(
        response?.data?.message ||
        "Evaluation saved as Draft."
      );

      await loadDetails(true);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // PUBLISH EVALUATION
  // --------------------------------------------------

  const handlePublish = async () => {
    if (saving || publishing) return;

    if (!evaluation) {
      notification.warning(
        "Save the evaluation as Draft before publishing."
      );
      return;
    }

    if (!isDraft) {
      notification.warning(
        "Only a Draft evaluation can be published."
      );
      return;
    }

    if (isStaleEvaluation) {
      notification.warning(
        "This evaluation belongs to an older submission version. Save a new evaluation for the latest submission first."
      );
      return;
    }

    if (isDirty) {
      notification.warning(
        "You have unsaved changes. Save the Draft before publishing."
      );
      return;
    }

    if (!validateForm()) return;

    const confirmed = await notification.confirm({
      title: "Publish evaluation?",
      text:
        `Publish ${marks} out of ${totalMarks} marks for ${studentName}? ` +
        "The student will be able to view the marks and feedback.",
      confirmText: "Yes, publish result",
      cancelText: "Review again",
      icon: "question",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmed) return;

    setPublishing(true);

    try {
      const response = await publishSubmissionEvaluation(
        submissionId
      );

      notification.success(
        response?.data?.message ||
        "Evaluation published successfully."
      );

      await loadDetails(true);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  };

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="ae-page">
        <div className="ae-loading">
          Loading submission details...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------

  if (!details || !assignment || !submission) {
    return (
      <div className="ae-page">
        <div className="ae-alert ae-error">
          {loadError || "Submission details could not be loaded."}
        </div>

        <div className="ae-actions">
          <button
            type="button"
            className="ae-secondary-button"
            onClick={handleBack}
          >
            <FiArrowLeft />
            Back to Submissions
          </button>

          <button
            type="button"
            className="ae-save-button"
            onClick={() => loadDetails(true)}
          >
            <FiRefreshCw />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <div className="ae-page">

      {/* HEADER */}
      <div className="ae-header">
        <div>
          <button
            type="button"
            className="ae-back-button"
            onClick={handleBack}
          >
            <FiArrowLeft />
            Back to Submissions
          </button>

          <span className="ae-eyebrow">
            ASSIGNMENT MANAGEMENT
          </span>

          <h1>Evaluate Submission</h1>

          <p>
            Review the student's latest work, award marks,
            provide feedback and publish the result.
          </p>
        </div>

        <span
          className={`ae-status ${
            isPublished
              ? "ae-status-published"
              : "ae-status-draft"
          }`}
        >
          {evaluationStatus}
        </span>
      </div>

      {/* ASSIGNMENT DETAILS */}
      <section className="ae-card">
        <div className="ae-card-heading">
          <FiBookOpen />

          <div>
            <h2>{assignment.title || "Assignment"}</h2>

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
            <strong>{submission.status || "—"}</strong>
          </div>

          <div>
            <span>Submission versions</span>
            <strong>{submission.submissionCount || 1}</strong>
          </div>
        </div>
      </section>

      {/* STUDENT INFORMATION */}
      <section className="ae-card">
        <div className="ae-section-heading">
          <div className="ae-section-icon">
            <FiUser />
          </div>

          <div>
            <h2>Student information</h2>
            <p>
              Student linked to this assignment submission.
            </p>
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

      {/* LATEST SUBMISSION */}
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
            <p className="ae-muted">
              No files were attached to this submission.
            </p>
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
                  type="button"
                  className="ae-download-button"
                  onClick={() => handleDownload(file)}
                  disabled={Boolean(downloading)}
                >
                  <FiDownload />

                  {downloading === file.id
                    ? "Downloading..."
                    : "Download"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* EVALUATION */}
      <section className="ae-card ae-evaluation-card">
        <div className="ae-section-heading">
          <div className="ae-section-icon">
            <FiCheckCircle />
          </div>

          <div>
            <h2>Evaluation and feedback</h2>

            <p>
              Save as Draft to keep the result private,
              or publish it for the student.
            </p>
          </div>
        </div>

        {/* PUBLISHED STATUS */}
        {isPublished && (
          <div className="ae-published-note">
            This result is published and visible to the student.
            If you edit and save it, it will return to Draft until
            published again.
          </div>
        )}

        {/* STALE VERSION WARNING */}
        {isStaleEvaluation && (
          <div className="ae-late-note">
            <FiAlertCircle style={{ marginRight: 7 }} />

            A newer submission version exists. This evaluation
            belongs to an older version. Review the latest submitted
            work and save a new Draft before publishing.
          </div>
        )}

        {/* UNSAVED CHANGES */}
        {isDirty && (
          <div className="ae-late-note">
            You have unsaved evaluation changes. Save the Draft
            before publishing.
          </div>
        )}

        {/* MARKS */}
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
              disabled={saving || publishing}
            />

            <span>/ {totalMarks}</span>
          </div>

          <small>
            Enter a value from 0 to {totalMarks}.
          </small>
        </div>

        {/* FEEDBACK */}
        <div className="ae-feedback-field">
          <label htmlFor="ae-feedback">
            Feedback for student
          </label>

          <textarea
            id="ae-feedback"
            rows="6"
            maxLength={10000}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Write constructive feedback, corrections, and suggestions..."
            disabled={saving || publishing}
          />

          <small>
            {feedback.length}/10000 characters
          </small>
        </div>

        {/* ACTIONS */}
        <div className="ae-actions">
          <button
            type="button"
            className="ae-save-button"
            onClick={handleSaveDraft}
            disabled={saving || publishing}
          >
            <FiSave />

            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            className="ae-publish-button"
            onClick={handlePublish}
            disabled={
              saving ||
              publishing ||
              !isDraft ||
              isStaleEvaluation ||
              isDirty
            }
          >
            <FiCheckCircle />

            {publishing
              ? "Publishing..."
              : "Publish Result"}
          </button>
        </div>

        {/* PUBLISHED DATE */}
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
