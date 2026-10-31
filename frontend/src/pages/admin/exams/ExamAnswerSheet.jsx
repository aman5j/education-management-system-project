
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiRefreshCw,
  FiXCircle,
} from "react-icons/fi";

import { getExamResultReview } from "../../../services/examResultService";

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

const format = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function ExamAnswerSheet() {
  const { resultId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getExamResultReview(resultId);
      setData(unwrap(response));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load this answer sheet."
      );
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <main className="um-page"><div className="um-empty">Loading answer sheet...</div></main>;
  }

  if (!data) {
    return (
      <main className="um-page">
        <button className="um-button um-light" onClick={() => navigate("/admin/exams/update-marks")}>
          <FiArrowLeft /> Back to Update Marks
        </button>
        {error && <div className="um-alert error">{error}</div>}
      </main>
    );
  }

  return (
    <main className="um-page">
      <header className="um-header">
        <div>
          <button
            type="button"
            className="um-back"
            onClick={() => navigate("/admin/exams/update-marks")}
          >
            <FiArrowLeft /> Back to Update Marks
          </button>
          <span className="um-eyebrow">ACADEMIC MANAGEMENT / ANSWER SHEET</span>
          <h1>Exam Answer Sheet</h1>
          <p>
            {data.student?.name || "Student"} · Roll No:{" "}
            {data.student?.rollNo || "—"} · {data.course || "Course"}
          </p>
        </div>

        <button
          type="button"
          className="um-button um-light"
          onClick={load}
          disabled={loading}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && <div className="um-alert error">{error}</div>}

      <section className="um-card">
        <div className="um-summary-grid">
          <article>
            <span>Total Marks</span>
            <strong>{format(data.totalMarks)}</strong>
          </article>
          <article>
            <span>Obtained Marks</span>
            <strong>{format(data.obtainedMarks)}</strong>
          </article>
          <article>
            <span>Percentage</span>
            <strong>{format(data.percentage)}%</strong>
          </article>
          <article>
            <span>Grade / Result</span>
            <strong>{data.grade || "—"}</strong>
            <small>{data.passStatus || "Pending"}</small>
          </article>
        </div>

        <div className="um-section-title">
          <div>
            <h2>Submitted Answers</h2>
            <p>{data.answers?.length || 0} questions in this exam</p>
          </div>
          <span className={`um-status ${data.resultStatus === "Published" ? "published" : "draft"}`}>
            {data.resultStatus || "Draft"}
          </span>
        </div>

        <div className="um-answer-list">
          {(data.answers || []).map((answer) => {
            const correct =
              answer.selectedAnswer &&
              answer.selectedAnswer === answer.correctAnswer;

            return (
              <article className="um-answer-card" key={`${answer.subjectId}-${answer.questionId}`}>
                <div className="um-answer-heading">
                  <strong>Question {answer.number}</strong>
                  <span className={`um-answer-result ${!answer.selectedAnswer ? "unanswered" : correct ? "correct" : "incorrect"}`}>
                    {!answer.selectedAnswer
                      ? "Unanswered"
                      : correct
                      ? "Correct"
                      : "Incorrect"}
                  </span>
                </div>

                <h3>{answer.questionText}</h3>
                {answer.subjectName && <p>{answer.subjectName}</p>}

                <div className="um-answer-options">
                  {(answer.options || []).map((option) => {
                    const isSelected = option.key === answer.selectedAnswer;
                    const isCorrect = option.key === answer.correctAnswer;

                    return (
                      <div
                        key={option.key}
                        className={[
                          "um-answer-option",
                          isSelected ? "selected" : "",
                          isCorrect ? "correct-option" : "",
                        ].filter(Boolean).join(" ")}
                      >
                        <strong>{option.key}.</strong> {option.text}
                        {isSelected && <span>Student answer</span>}
                        {isCorrect && <span>Correct answer</span>}
                      </div>
                    );
                  })}
                </div>

                <div className="um-answer-marks">
                  <span>
                    {correct ? <FiCheckCircle /> : <FiXCircle />}
                    Marks awarded: <strong>{format(answer.marksAwarded)}</strong>
                  </span>
                  <span>Maximum: {format(answer.maxMarks)}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
