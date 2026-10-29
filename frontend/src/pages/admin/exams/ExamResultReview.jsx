import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiUnlock,
  FiUser,
} from "react-icons/fi";

import {
  getExamResultReview,
  unpublishExamResult,
  overrideQuestionMarks,
  previewAnswerKeyCorrection,
  applyAnswerKeyCorrection,
  publishExamResult,
} from "../../../services/examResultService";

import "../../../styles/ExamResultReview.css";

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const formatMarks = (value) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "0";
};

export default function ExamResultReview() {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [unpublishReason, setUnpublishReason] = useState("");
  const [marksReason, setMarksReason] = useState("");
  const [marksDrafts, setMarksDrafts] = useState({});

  const [keyQuestionId, setKeyQuestionId] = useState("");
  const [keySubjectId, setKeySubjectId] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [keyReason, setKeyReason] = useState("");
  const [preview, setPreview] = useState(null);

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getExamResultReview(resultId);
      const data = unwrap(response);

      setReview(data);
      setMarksDrafts(
        Object.fromEntries(
          (data?.answers || []).map((answer) => [
            answer.questionId,
            String(answer.marksAwarded ?? 0),
          ])
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    loadReview();
  }, [loadReview]);

  const isPublished = review?.resultStatus === "Published";
  const isSubmitted = review?.attemptStatus === "Submitted";

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleUnpublish = async (event) => {
    event.preventDefault();
    clearMessages();

    if (unpublishReason.trim().length < 5) {
      setError("Enter a correction reason of at least 5 characters.");
      return;
    }

    const confirmed = window.confirm(
      "Unpublish this student's result? The student will no longer see the published result until it is published again."
    );

    if (!confirmed) return;

    setWorking(true);

    try {
      const response = await unpublishExamResult(
        resultId,
        unpublishReason.trim()
      );

      const data = unwrap(response);
      setSuccess(data?.message || "Result unpublished for correction.");
      setUnpublishReason("");
      await loadReview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const handleMarksSave = async (answer) => {
    clearMessages();

    if (isPublished) {
      setError("Unpublish this result before correcting marks.");
      return;
    }

    if (!isSubmitted) {
      setError("Only submitted exam attempts can have marks overridden.");
      return;
    }

    const reason = marksReason.trim();

    if (reason.length < 5) {
      setError("Enter a reason for the marks correction.");
      return;
    }

    const rawMarks = marksDrafts[answer.questionId];
    const marks = Number(rawMarks);

    if (!Number.isFinite(marks) || marks < 0 || marks > Number(answer.maxMarks)) {
      setError(`Marks must be between 0 and ${answer.maxMarks}.`);
      return;
    }

    if (
      !window.confirm(
        `Save ${formatMarks(marks)} mark(s) for question ${answer.number}? The total result will be recalculated.`
      )
    ) {
      return;
    }

    setWorking(true);

    try {
      const response = await overrideQuestionMarks(
        resultId,
        answer.questionId,
        {
          subject_id: answer.subjectId,
          marksAwarded: marks,
          reason,
        }
      );

      const data = unwrap(response);
      setSuccess(data?.message || "Marks corrected successfully.");
      setMarksReason("");
      await loadReview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const handlePreviewKey = async (event) => {
    event.preventDefault();
    clearMessages();
    setPreview(null);

    if (isPublished) {
      setError(
        "Unpublish all published results for this exam before applying an answer-key correction."
      );
      return;
    }

    if (!keyQuestionId || !keySubjectId) {
      setError("Select a question to correct.");
      return;
    }

    if (!["A", "B", "C", "D"].includes(correctAnswer)) {
      setError("Select the new correct answer.");
      return;
    }

    if (keyReason.trim().length < 5) {
      setError("Enter the reason for the answer-key correction.");
      return;
    }

    setWorking(true);

    try {
      const response = await previewAnswerKeyCorrection(review.examId, {
        subject_id: keySubjectId,
        question_id: keyQuestionId,
        correctAnswer,
        reason: keyReason.trim(),
      });

      setPreview(unwrap(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const handleApplyKey = async () => {
    clearMessages();

    if (!preview) {
      setError("Preview the correction before applying it.");
      return;
    }

    if (preview.requiresUnpublish || Number(preview.publishedCount) > 0) {
      setError(
        `There are ${preview.publishedCount} published result(s) for this exam. Unpublish every affected published result, then preview the correction again.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Apply the answer-key correction? ${preview.affectedCount} result(s) may change. This action will recalculate affected draft results.`
    );

    if (!confirmed) return;

    setWorking(true);

    try {
      const response = await applyAnswerKeyCorrection(review.examId, {
        subject_id: keySubjectId,
        question_id: keyQuestionId,
        correctAnswer,
        reason: keyReason.trim(),
        confirm: true,
      });

      const data = unwrap(response);
      setSuccess(data?.message || "Answer key corrected successfully.");
      setPreview(null);
      setKeyReason("");
      await loadReview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const handlePublish = async () => {
    clearMessages();

    if (isPublished) {
      setError("This result is already published.");
      return;
    }

    if (!window.confirm("Publish this corrected result to the Student Portal?")) {
      return;
    }

    setWorking(true);

    try {
      const response = await publishExamResult(resultId);
      const data = unwrap(response);

      setSuccess(data?.message || "Result published successfully.");
      await loadReview();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <main className="err-page">
        <div className="err-state">Loading exam answer sheet…</div>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="err-page">
        <button
          type="button"
          className="err-btn err-btn-light"
          onClick={() => navigate("/admin/exams/results")}
        >
          <FiArrowLeft /> Back to Exam Results
        </button>
        {error && <div className="err-alert err-alert-error">{error}</div>}
      </main>
    );
  }

  return (
    <main className="err-page">
      <header className="err-header">
        <div>
          <button
            type="button"
            className="err-back"
            onClick={() => navigate("/admin/exams/results")}
          >
            <FiArrowLeft /> Back to Exam Results
          </button>

          <span className="err-eyebrow">ACADEMIC MANAGEMENT / RESULT REVIEW</span>
          <h1>Exam Answer Sheet</h1>
          <p>Review submitted answers, correct marks, and manage publication.</p>
        </div>

        <button
          type="button"
          className="err-btn err-btn-light"
          onClick={loadReview}
          disabled={working}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && (
        <div className="err-alert err-alert-error" role="alert">
          <FiAlertCircle /> {error}
        </div>
      )}

      {success && (
        <div className="err-alert err-alert-success" role="status">
          <FiCheckCircle /> {success}
        </div>
      )}

      <section className="err-card err-student-summary">
        <div className="err-student-icon">
          <FiUser />
        </div>

        <div className="err-student-details">
          <span className="err-eyebrow">STUDENT</span>
          <h2>{review.student?.name || "Student"}</h2>
          <p>
            Roll No: {review.student?.rollNo || "—"} ·{" "}
            {review.course || "Course unavailable"}
          </p>
          <p>Result last updated: {formatDate(review.updatedAt)}</p>
        </div>

        <div className="err-result-status">
          <span className={`err-status ${isPublished ? "published" : "draft"}`}>
            {review.resultStatus || "Draft"}
          </span>
          <span className="err-status-label">
            {isPublished ? "Visible to student" : "Not published to student"}
          </span>
        </div>
      </section>

      <section className="err-score-grid">
        <article className="err-score-card">
          <span>Obtained Marks</span>
          <strong>
            {formatMarks(review.obtainedMarks)} / {formatMarks(review.totalMarks)}
          </strong>
        </article>
        <article className="err-score-card">
          <span>Percentage</span>
          <strong>{formatMarks(review.percentage)}%</strong>
        </article>
        <article className="err-score-card">
          <span>Grade</span>
          <strong>{review.grade || "—"}</strong>
        </article>
        <article className="err-score-card">
          <span>Result</span>
          <strong>{review.passStatus || "Pending"}</strong>
        </article>
      </section>

      {isPublished && (
        <section className="err-card err-correction-panel">
          <div className="err-panel-heading">
            <FiShield />
            <div>
              <h2>Published result protection</h2>
              <p>
                Unpublish the result with a reason before changing individual
                marks or correcting this exam's answer key.
              </p>
            </div>
          </div>

          <form className="err-inline-form" onSubmit={handleUnpublish}>
            <label>
              Reason for unpublishing
              <input
                value={unpublishReason}
                onChange={(event) => setUnpublishReason(event.target.value)}
                placeholder="e.g. Academic review identified a scoring issue"
                minLength={5}
                maxLength={1000}
                required
              />
            </label>
            <button
              type="submit"
              className="err-btn err-btn-danger"
              disabled={working}
            >
              <FiUnlock /> Unpublish for correction
            </button>
          </form>
        </section>
      )}

      <section className="err-card">
        <div className="err-section-heading">
          <div>
            <span className="err-eyebrow">ANSWER REVIEW</span>
            <h2>Questions and submitted answers</h2>
            <p>
              Green indicates the correct answer; red indicates an incorrect
              student selection. Unanswered questions are shown separately.
            </p>
          </div>
          <span className="err-count">
            {review.answers?.length || 0} questions
          </span>
        </div>

        <div className="err-answer-list">
          {(review.answers || []).map((answer) => {
            const hasAnswer = Boolean(answer.selectedAnswer);
            const isCorrect =
              hasAnswer &&
              answer.selectedAnswer === answer.correctAnswer;

            return (
              <article className="err-question-card" key={answer.questionId}>
                <div className="err-question-heading">
                  <span className="err-question-number">
                    Question {answer.number}
                  </span>
                  <span
                    className={`err-answer-badge ${
                      !hasAnswer ? "unanswered" : isCorrect ? "correct" : "incorrect"
                    }`}
                  >
                    {!hasAnswer
                      ? "Unanswered"
                      : isCorrect
                      ? "Correct"
                      : "Incorrect"}
                  </span>
                </div>

                <h3>{answer.questionText}</h3>
                {answer.subjectName && (
                  <p className="err-subject-name">{answer.subjectName}</p>
                )}

                <div className="err-options-grid">
                  {(answer.options || []).map((option) => {
                    const selected = answer.selectedAnswer === option.key;
                    const correct = answer.correctAnswer === option.key;

                    const classNames = [
                      "err-option",
                      selected ? "student-selected" : "",
                      correct ? "correct-option" : "",
                      selected && !correct ? "wrong-option" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div className={classNames} key={option.key}>
                        <span className="err-option-key">{option.key}</span>
                        <span>{option.text || "—"}</span>
                        <div className="err-option-tags">
                          {selected && <small>Your answer</small>}
                          {correct && <small>Correct answer</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="err-question-footer">
                  <div>
                    <span>Marks awarded</span>
                    <strong>
                      {formatMarks(answer.marksAwarded)} /{" "}
                      {formatMarks(answer.maxMarks)}
                    </strong>
                    {answer.marksOverridden && (
                      <small className="err-override-label">
                        Manually overridden
                      </small>
                    )}
                  </div>

                  <div className="err-marks-editor">
                    <label>
                      Correct marks
                      <input
                        type="number"
                        min="0"
                        max={answer.maxMarks}
                        step="0.01"
                        value={marksDrafts[answer.questionId] ?? "0"}
                        onChange={(event) =>
                          setMarksDrafts((previous) => ({
                            ...previous,
                            [answer.questionId]: event.target.value,
                          }))
                        }
                        disabled={isPublished || !isSubmitted || working}
                      />
                    </label>

                    <button
                      type="button"
                      className="err-btn err-btn-light"
                      onClick={() => handleMarksSave(answer)}
                      disabled={isPublished || !isSubmitted || working}
                    >
                      <FiSave /> Save marks
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="err-global-reason">
          <label>
            Reason for individual marks correction
            <input
              value={marksReason}
              onChange={(event) => setMarksReason(event.target.value)}
              placeholder="Required before saving any marks override"
              minLength={5}
              maxLength={1000}
              disabled={isPublished || !isSubmitted}
            />
          </label>
        </div>
      </section>

      <section className="err-card">
        <div className="err-section-heading">
          <div>
            <span className="err-eyebrow">ANSWER KEY CORRECTION</span>
            <h2>Correct an exam question's answer key</h2>
            <p>
              Preview the impact on every saved result before applying the
              correction. This changes the key for this exam, not the shared
              Subject Question Bank.
            </p>
          </div>
        </div>

        <form className="err-key-form" onSubmit={handlePreviewKey}>
          <label>
            Question
            <select
              value={keyQuestionId}
              onChange={(event) => {
                const answer = (review.answers || []).find(
                  (item) => item.questionId === event.target.value
                );

                setKeyQuestionId(event.target.value);
                setKeySubjectId(answer?.subjectId || "");
                setCorrectAnswer("");
                setPreview(null);
              }}
              required
              disabled={isPublished || working}
            >
              <option value="">Select a question</option>
              {(review.answers || []).map((answer) => (
                <option key={answer.questionId} value={answer.questionId}>
                  Q{answer.number}. {answer.questionText}
                </option>
              ))}
            </select>
          </label>

          <label>
            New correct answer
            <select
              value={correctAnswer}
              onChange={(event) => {
                setCorrectAnswer(event.target.value);
                setPreview(null);
              }}
              required
              disabled={isPublished || working}
            >
              <option value="">Choose option</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>

          <label className="err-key-reason">
            Correction reason
            <input
              value={keyReason}
              onChange={(event) => {
                setKeyReason(event.target.value);
                setPreview(null);
              }}
              placeholder="Explain why the answer key needs correction"
              minLength={5}
              maxLength={1000}
              required
              disabled={isPublished || working}
            />
          </label>

          <button
            type="submit"
            className="err-btn err-btn-primary"
            disabled={isPublished || working}
          >
            Preview impact
          </button>
        </form>

        {isPublished && (
          <p className="err-muted-note">
            Unpublish this result and every other published result for the exam
            before previewing and applying an answer-key correction.
          </p>
        )}

        {preview && (
          <div className="err-preview">
            <div className="err-preview-heading">
              <div>
                <h3>Correction impact preview</h3>
                <p>
                  Answer key: {preview.oldCorrectAnswer} →{" "}
                  <strong>{preview.newCorrectAnswer}</strong>
                </p>
              </div>
              <span className="err-count">
                {preview.affectedCount || 0} result(s) affected
              </span>
            </div>

            {Number(preview.publishedCount) > 0 && (
              <div className="err-alert err-alert-error">
                {preview.publishedCount} published result(s) must be explicitly
                unpublished before the correction can be applied.
              </div>
            )}

            <div className="err-table-wrap">
              <table className="err-impact-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Status</th>
                    <th>Previous marks</th>
                    <th>New marks</th>
                    <th>Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {(preview.affectedResults || []).map((item) => (
                    <tr key={item.resultId}>
                      <td>{item.studentId}</td>
                      <td>{item.resultStatus}</td>
                      <td>{formatMarks(item.previousMarks)}</td>
                      <td>{formatMarks(item.newMarks)}</td>
                      <td>
                        {item.changed ? (
                          <span className="err-impact-change">Changes</span>
                        ) : (
                          <span className="err-impact-same">No change</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="err-preview-footer">
              <p>
                Confirm only after reviewing the affected students and marks.
              </p>
              <button
                type="button"
                className="err-btn err-btn-danger"
                onClick={handleApplyKey}
                disabled={
                  working ||
                  Boolean(preview.requiresUnpublish) ||
                  Number(preview.publishedCount) > 0
                }
              >
                Confirm and apply correction
              </button>
            </div>
          </div>
        )}
      </section>

      {!isPublished && (
        <section className="err-publish-footer">
          <div>
            <h2>Publish corrected result</h2>
            <p>
              Review the answer sheet and marks before making this result
              visible to the student.
            </p>
          </div>
          <button
            type="button"
            className="err-btn err-btn-primary"
            onClick={handlePublish}
            disabled={working || !isSubmitted}
          >
            <FiCheckCircle /> Publish result
          </button>
        </section>
      )}

      <section className="err-card">
        <div className="err-section-heading">
          <div>
            <span className="err-eyebrow">AUDIT TRAIL</span>
            <h2>Correction history</h2>
            <p>Recorded reasons for changes to this result.</p>
          </div>
        </div>

        {!review.auditHistory?.length ? (
          <div className="err-empty-audit">
            No correction history has been recorded for this result.
          </div>
        ) : (
          <div className="err-audit-list">
            {review.auditHistory
              .slice()
              .reverse()
              .map((item, index) => (
                <article className="err-audit-item" key={`${item.action}-${index}`}>
                  <span className="err-audit-dot" />
                  <div>
                    <strong>{String(item.action || "").replaceAll("_", " ")}</strong>
                    <p>{item.reason}</p>
                    <small>{formatDate(item.changedAt)}</small>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}