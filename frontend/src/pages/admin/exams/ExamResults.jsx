
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
} from "react-icons/fi";

import { getExams, getExam } from "../../../services/examService";
import { getExamCandidates, saveExamResult, publishExamResult } from "../../../services/examResultService";
import { getSubjectQuestionBank } from "../../../services/subjectQuestionBankService";

import "../../../styles/ExamResults.css";

const PAGE_SIZE = 10;

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

const getArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const getId = (value) =>
  typeof value === "object" && value !== null ? value._id : value;

const getFullName = (student) =>
  [student?.firstName, student?.surname].filter(Boolean).join(" ") || "Unnamed student";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Something went wrong.";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-IN");
};

export default function ExamResults() {
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState("");
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedStudent = candidates.find(
    (student) => String(student._id) === String(selectedStudentId)
  );

  const filteredCandidates = useMemo(() => {
    const value = search.trim().toLowerCase();

    return candidates.filter((student) => {
      const matchesSearch =
        !value ||
        [getFullName(student), student.rollNo, student.hallTicketNo]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(value);

      const resultStatus = student.result?.resultStatus || "Not Started";
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Not Started" && !student.result) ||
        resultStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const visibleCandidates = filteredCandidates.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    setError("");

    try {
      const response = await getExams({ page: 1, limit: 100 });
      const data = unwrap(response);
      setExams(getArray(data, ["exams"]));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const loadCandidates = async (nextExamId) => {
    setExamId(nextExamId);
    setExam(null);
    setQuestions([]);
    setCandidates([]);
    setSelectedStudentId("");
    setAnswers({});
    setPage(1);
    setError("");
    setSuccess("");

    if (!nextExamId) return;

    setLoading(true);

    try {
      const [candidateResponse, examResponse] = await Promise.all([
        getExamCandidates(nextExamId),
        getExam(nextExamId),
      ]);

      const candidateData = unwrap(candidateResponse);
      const examDataRoot = unwrap(examResponse);
      const examData = examDataRoot?.exam ?? examDataRoot;

      const rows = getArray(candidateData, ["candidates"]);
      const selectedQuestions = examData?.selectedQuestions || [];

      if (!selectedQuestions.length) {
        throw new Error("This exam has no selected questions.");
      }

      const subjectIds = [
        ...new Set(selectedQuestions.map((item) => String(item.subject_id))),
      ];

      const questionResponses = await Promise.all(
        subjectIds.map(async (subjectId) => {
          const response = await getSubjectQuestionBank(subjectId);
          const data = unwrap(response);
          return getArray(data, ["questions"]).map((question) => ({
            ...question,
            subject_id: subjectId,
          }));
        })
      );

      const questionMap = new Map(
        questionResponses.flat().map((question) => [
          `${String(question.subject_id)}:${String(question._id)}`,
          question,
        ])
      );

      const orderedQuestions = selectedQuestions.map((item, index) => {
        const question = questionMap.get(
          `${String(item.subject_id)}:${String(item.question_id)}`
        );

        if (!question) {
          throw new Error(
            `Question ${index + 1} could not be loaded from Subject Question Bank.`
          );
        }

        return {
          ...question,
          subject_id: String(item.subject_id),
          question_id: String(item.question_id),
          number: index + 1,
        };
      });

      setExam(examData);
      setQuestions(orderedQuestions);
      setCandidates(rows);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const openStudent = (student) => {
    setSelectedStudentId(String(student._id));
    const existingAnswers = {};

    (student.result?.answers || []).forEach((item) => {
      existingAnswers[`${item.subject_id}:${item.question_id}`] =
        item.answer || "";
    });

    setAnswers(existingAnswers);
    setError("");
    setSuccess("");
  };

  const updateAnswer = (question, answer) => {
    setAnswers((previous) => ({
      ...previous,
      [`${question.subject_id}:${question.question_id}`]: answer,
    }));
  };

  const handleSave = async () => {
    if (!exam || !selectedStudent) {
      setError("Select an exam and student first.");
      return;
    }

    const payload = {
      exam_id: exam._id,
      student_id: selectedStudent._id,
      answers: questions.map((question) => ({
        subject_id: question.subject_id,
        question_id: question.question_id,
        answer:
          answers[`${question.subject_id}:${question.question_id}`] || "",
      })),
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await saveExamResult(payload);
      const result = unwrap(response);

      setSuccess(result?.message || "Result draft saved successfully.");
      await loadCandidatesAfterSave();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const loadCandidatesAfterSave = async () => {
    if (!examId) return;

    const response = await getExamCandidates(examId);
    const data = unwrap(response);
    const rows = getArray(data, ["candidates"]);
    setCandidates(rows);

    const student = rows.find(
      (item) => String(item._id) === String(selectedStudentId)
    );

    if (student) {
      const nextAnswers = {};
      (student.result?.answers || []).forEach((item) => {
        nextAnswers[`${item.subject_id}:${item.question_id}`] =
          item.answer || "";
      });
      setAnswers(nextAnswers);
    }
  };

  const handlePublish = async (student) => {
    const resultId = student.result?._id;

    if (!resultId) {
      setError("Save the student's draft before publishing.");
      return;
    }

    if (
      !window.confirm(
        `Publish the result for ${getFullName(student)}? Published results cannot be edited in this version.`
      )
    ) {
      return;
    }

    setPublishingId(String(student._id));
    setError("");
    setSuccess("");

    try {
      const response = await publishExamResult(resultId);
      const data = unwrap(response);
      setSuccess(data?.message || "Result published successfully.");
      await loadCandidatesAfterSave();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPublishingId("");
    }
  };

  const handleRefresh = () => {
    if (examId) loadCandidates(examId);
    else loadExams();
  };

  const publishedCount = candidates.filter(
    (student) => student.result?.resultStatus === "Published"
  ).length;
  const draftCount = candidates.filter(
    (student) => student.result?.resultStatus === "Draft"
  ).length;

  return (
    <div className="exam-results-page">
      <header className="exam-results-header">
        <div>
          <span className="exam-results-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Exam Results Management</h1>
          <p>Enter answers, review calculated marks and publish student results.</p>
        </div>
        <button
          type="button"
          className="er-secondary-btn"
          onClick={handleRefresh}
          disabled={loading || loadingExams}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && <div className="er-alert er-alert-error" role="alert">{error}</div>}
      {success && <div className="er-alert er-alert-success" role="status">{success}</div>}

      <section className="er-card">
        <div className="er-section-heading">
          <div>
            <h2>Select Exam</h2>
            <p>Only students with active hall tickets can receive a result.</p>
          </div>
        </div>

        <label className="er-field">
          Scheduled Exam
          <select
            value={examId}
            onChange={(event) => loadCandidates(event.target.value)}
            disabled={loadingExams || loading}
          >
            <option value="">Choose an exam</option>
            {exams.map((item) => (
              <option key={item._id} value={item._id}>
                {(item.course_id?.courseTitle || "Course") +
                  ` · ${item.totalQuestions} questions · ${item.totalMarks} marks`}
              </option>
            ))}
          </select>
        </label>

        {exam && (
          <div className="er-exam-details">
            <div><span>Course</span><strong>{exam.course_id?.courseTitle || "Selected course"}</strong></div>
            <div><span>Total Questions</span><strong>{exam.totalQuestions}</strong></div>
            <div><span>Total Marks</span><strong>{exam.totalMarks}</strong></div>
            <div><span>Marks / Question</span><strong>{Number(exam.marksPerQuestion || 0).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}</strong></div>
          </div>
        )}
      </section>

      {examId && (
        <>
          <section className="er-summary-grid">
            <article className="er-summary-card"><span>Eligible Students</span><strong>{candidates.length}</strong></article>
            <article className="er-summary-card"><span>Draft Results</span><strong>{draftCount}</strong></article>
            <article className="er-summary-card"><span>Published Results</span><strong>{publishedCount}</strong></article>
          </section>

          <section className="er-card">
            <div className="er-section-heading er-candidate-heading">
              <div>
                <h2>Eligible Students</h2>
                <p>Select a student to enter or review their result.</p>
              </div>
              <div className="er-toolbar">
                <label className="er-search">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                    placeholder="Search name, roll number..."
                  />
                </label>
                <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                  <option value="All">All results</option>
                  <option value="Not Started">Not started</option>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="er-state">Loading exam candidates and questions...</div>
            ) : !visibleCandidates.length ? (
              <div className="er-state">
                <FiClipboard />
                <strong>No eligible students found</strong>
                <span>Check that hall tickets exist and are active for this exam.</span>
              </div>
            ) : (
              <div className="er-table-wrap">
                <table className="er-table">
                  <thead>
                    <tr><th>Roll No.</th><th>Student</th><th>Hall Ticket</th><th>Status</th><th>Marks</th><th>Percentage</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {visibleCandidates.map((student) => (
                      <tr key={student._id}>
                        <td>{student.rollNo || "-"}</td>
                        <td><strong>{getFullName(student)}</strong></td>
                        <td>{student.hallTicketNo || "-"}</td>
                        <td><span className={`er-status ${(student.result?.resultStatus || "not-started").toLowerCase().replace(" ", "-")}`}>{student.result?.resultStatus || "Not Started"}</span></td>
                        <td>{student.result ? `${student.result.obtainedMarks} / ${exam.totalMarks}` : "-"}</td>
                        <td>{student.result ? `${Number(student.result.percentage || 0).toFixed(2)}%` : "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="er-secondary-btn er-small-btn"
                            onClick={() => openStudent(student)}
                          >
                            {student.result ? "Review / Edit" : "Enter Result"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="er-pagination">
              <span>{filteredCandidates.length ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredCandidates.length)} of ${filteredCandidates.length}` : "0 students"}</span>
              <div>
                <button type="button" className="er-secondary-btn" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><FiChevronLeft /> Previous</button>
                <button type="button" className="er-secondary-btn" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next <FiChevronRight /></button>
              </div>
            </div>
          </section>
        </>
      )}

      {selectedStudent && exam && (
        <section className="er-card er-answer-card">
          <div className="er-section-heading">
            <div>
              <span className="exam-results-eyebrow">RESULT ENTRY</span>
              <h2>{getFullName(selectedStudent)}</h2>
              <p>
                Roll No: {selectedStudent.rollNo || "-"} · Hall Ticket: {selectedStudent.hallTicketNo || "-"}
              </p>
            </div>
            <button type="button" className="er-secondary-btn" onClick={() => setSelectedStudentId("")}>Close</button>
          </div>

          {selectedStudent.result?.resultStatus === "Published" ? (
            <div className="er-alert er-alert-info">
              <FiCheckCircle />
              This result is published and cannot be edited in the current workflow.
            </div>
          ) : (
            <>
              <div className="er-answer-list">
                {questions.map((question) => {
                  const key = `${question.subject_id}:${question.question_id}`;
                  const options = [
                    ["A", question.optionA],
                    ["B", question.optionB],
                    ["C", question.optionC],
                    ["D", question.optionD],
                  ];

                  return (
                    <article className="er-question" key={key}>
                      <div className="er-question-title">
                        <span>Question {question.number}</span>
                        <strong>{question.questionText}</strong>
                      </div>
                      <div className="er-options">
                        {options.map(([letter, label]) => (
                          <label className={`er-option ${answers[key] === letter ? "selected" : ""}`} key={letter}>
                            <input
                              type="radio"
                              name={`answer-${key}`}
                              value={letter}
                              checked={answers[key] === letter}
                              onChange={() => updateAnswer(question, letter)}
                            />
                            <span className="er-option-letter">{letter}</span>
                            <span>{label}</span>
                          </label>
                        ))}
                        <label className={`er-option er-unanswered ${!answers[key] ? "selected" : ""}`}>
                          <input
                            type="radio"
                            name={`answer-${key}`}
                            value=""
                            checked={!answers[key]}
                            onChange={() => updateAnswer(question, "")}
                          />
                          <span>Unanswered</span>
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="er-answer-footer">
                <span>{questions.filter((question) => answers[`${question.subject_id}:${question.question_id}`]).length} of {questions.length} answered</span>
                <button type="button" className="er-primary-btn" onClick={handleSave} disabled={saving || !questions.length}>
                  <FiSave /> {saving ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </>
          )}

          {selectedStudent.result?.resultStatus === "Draft" && (
            <div className="er-publish-panel">
              <div>
                <strong>Draft result saved</strong>
                <p>Review the saved marks before publishing. Published results cannot be edited in this version.</p>
              </div>
              <button
                type="button"
                className="er-primary-btn"
                onClick={() => handlePublish(selectedStudent)}
                disabled={publishingId === String(selectedStudent._id)}
              >
                <FiSend /> {publishingId === String(selectedStudent._id) ? "Publishing..." : "Publish Result"}
              </button>
            </div>
          )}

          {selectedStudent.result && (
            <div className="er-saved-result">
              <div><span>Obtained Marks</span><strong>{selectedStudent.result.obtainedMarks} / {selectedStudent.result.totalMarks}</strong></div>
              <div><span>Percentage</span><strong>{Number(selectedStudent.result.percentage || 0).toFixed(2)}%</strong></div>
              <div><span>Grade</span><strong>{selectedStudent.result.grade}</strong></div>
              <div><span>Result</span><strong>{selectedStudent.result.passStatus}</strong></div>
              <div><span>Last Updated</span><strong>{formatDate(selectedStudent.result.updatedAt)}</strong></div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
