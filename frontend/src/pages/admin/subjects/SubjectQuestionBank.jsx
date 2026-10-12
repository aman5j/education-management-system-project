
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  FiArrowLeft,
  FiDownload,
  FiUpload,
  FiPlus,
  FiSave,
  FiTrash2,
  FiEdit2,
  FiX,
} from "react-icons/fi";

import { getSubjectById } from "../../../services/subjectService";
import {
  getSubjectQuestionBank,
  addSubjectQuestion,
  updateSubjectQuestion,
  deleteSubjectQuestion,
  importSubjectQuestions,
} from "../../../services/subjectQuestionBankService";

import "../../../styles/SubjectQuestionBank.css";

const EMPTY_FORM = {
  questionText: "",
  topic: "",
  questionType: "MCQ",
  options: [
    { optionKey: "A", optionText: "" },
    { optionKey: "B", optionText: "" },
    { optionKey: "C", optionText: "" },
    { optionKey: "D", optionText: "" },
  ],
  correctAnswers: ["A"],
  expectedAnswer: "",
  explanation: "",
  difficulty: "Medium",
  marks: 1,
  status: "Draft",
};

const OPTION_TYPES = ["MCQ", "Multiple Select", "True/False"];

const messageFrom = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getPayload = (response) => response?.data?.data ?? response?.data;

const normalizeExcelRow = (row) => {
  const normalized = {};

  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[String(key).trim().toLowerCase().replace(/[\s_-]+/g, "")] =
      value;
  });

  const get = (...keys) => {
    for (const key of keys) {
      const value = normalized[key.toLowerCase().replace(/[\s_-]+/g, "")];
      if (value !== undefined && value !== null) return value;
    }
    return "";
  };

  const questionType = String(get("questionType") || "MCQ").trim();
  const options = ["A", "B", "C", "D", "E"]
    .map((key) => ({
      optionKey: key,
      optionText: String(get(`option${key}`) || "").trim(),
    }))
    .filter((option) => option.optionText);

  let correctAnswers = String(get("correctAnswers", "correctAnswer"))
    .split(/[,;|]/)
    .map((answer) => answer.trim().toUpperCase())
    .filter(Boolean);

  let finalOptions = options;

  if (questionType === "True/False" && !options.length) {
    finalOptions = [
      { optionKey: "A", optionText: "True" },
      { optionKey: "B", optionText: "False" },
    ];
  }

  if (
    questionType === "True/False" &&
    correctAnswers.length &&
    ["TRUE", "FALSE"].includes(correctAnswers[0])
  ) {
    correctAnswers = [correctAnswers[0] === "TRUE" ? "A" : "B"];
  }

  return {
    questionText: String(get("questionText", "question")).trim(),
    topic: String(get("topic") || "").trim(),
    questionType,
    options: finalOptions,
    correctAnswers,
    expectedAnswer: String(get("expectedAnswer", "answer") || "").trim(),
    explanation: String(get("explanation") || "").trim(),
    difficulty: String(get("difficulty") || "Medium").trim(),
    marks: Number(get("marks") || 1),
    status: String(get("status") || "Draft").trim(),
  };
};

export default function SubjectQuestionBank() {
  const { id: subjectId } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importReport, setImportReport] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [subjectResponse, questionResponse] = await Promise.all([
        getSubjectById(subjectId),
        getSubjectQuestionBank(subjectId),
      ]);

      const subjectPayload = getPayload(subjectResponse);
      const subjectData =
        subjectPayload?.subject || subjectPayload;

      const questionPayload = getPayload(questionResponse);
      const questionData = Array.isArray(questionPayload)
        ? questionPayload
        : questionPayload?.questions || questionPayload?.data || [];

      setSubject(subjectData);
      setQuestions(Array.isArray(questionData) ? questionData : []);
    } catch (err) {
      setError(messageFrom(err, "Unable to load the subject question bank."));
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch =
        !query ||
        question.questionText?.toLowerCase().includes(query) ||
        question.topic?.toLowerCase().includes(query);

      return (
        matchesSearch &&
        (!statusFilter || question.status === statusFilter) &&
        (!typeFilter || question.questionType === typeFilter)
      );
    });
  }, [questions, search, statusFilter, typeFilter]);

  const changeField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      if (name === "questionType") {
        const options =
          value === "True/False"
            ? [
                { optionKey: "A", optionText: "True" },
                { optionKey: "B", optionText: "False" },
              ]
            : value === "Short Answer" || value === "Long Answer"
              ? []
              : previous.options.length >= 2
                ? previous.options
                : EMPTY_FORM.options;

        return {
          ...previous,
          questionType: value,
          options,
          correctAnswers:
            value === "True/False" || value === "MCQ"
              ? [previous.correctAnswers[0] || "A"]
              : previous.correctAnswers,
        };
      }

      return { ...previous, [name]: value };
    });

    setError("");
    setNotice("");
  };

  const changeOption = (index, value) => {
    setForm((previous) => ({
      ...previous,
      options: previous.options.map((option, optionIndex) =>
        optionIndex === index
          ? { ...option, optionText: value }
          : option
      ),
    }));
  };

  const toggleCorrectAnswer = (key) => {
    setForm((previous) => {
      const isMultiple = previous.questionType === "Multiple Select";
      const selected = previous.correctAnswers.includes(key);

      return {
        ...previous,
        correctAnswers: isMultiple
          ? selected
            ? previous.correctAnswers.filter((answer) => answer !== key)
            : [...previous.correctAnswers, key]
          : [key],
      };
    });
  };

  const startNewQuestion = () => {
    setForm({ ...EMPTY_FORM, options: EMPTY_FORM.options.map((o) => ({ ...o })) });
    setEditingId("");
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const startEdit = (question) => {
    setForm({
      ...EMPTY_FORM,
      ...question,
      options: question.options?.length
        ? question.options.map((option) => ({ ...option }))
        : [],
      correctAnswers: question.correctAnswers || [],
    });
    setEditingId(question._id);
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.questionText.trim()) {
      setError("Please enter the question.");
      return;
    }

    if (
      OPTION_TYPES.includes(form.questionType) &&
      form.correctAnswers.length === 0
    ) {
      setError("Please select at least one correct answer.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      const payload = {
        ...form,
        questionText: form.questionText.trim(),
        marks: Number(form.marks),
      };

      if (editingId) {
        await updateSubjectQuestion(subjectId, editingId, payload);
        setNotice("Question updated successfully.");
      } else {
        await addSubjectQuestion(subjectId, payload);
        setNotice("Question added successfully.");
      }

      setShowForm(false);
      setEditingId("");
      setForm(EMPTY_FORM);
      await loadData();
    } catch (err) {
      setError(messageFrom(err, "Unable to save the question."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (question) => {
    if (
      !window.confirm(
        "Delete this question permanently from the subject?"
      )
    ) {
      return;
    }

    try {
      setError("");
      setNotice("");
      await deleteSubjectQuestion(subjectId, question._id);
      setQuestions((previous) =>
        previous.filter((item) => item._id !== question._id)
      );
      setNotice("Question deleted successfully.");
    } catch (err) {
      setError(messageFrom(err, "Unable to delete the question."));
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        questionText: "What does HTML stand for?",
        questionType: "MCQ",
        topic: "HTML Basics",
        optionA: "Hyper Text Markup Language",
        optionB: "High Text Machine Language",
        optionC: "Hyper Tool Multi Language",
        optionD: "Home Text Markup Language",
        optionE: "",
        correctAnswers: "A",
        expectedAnswer: "",
        explanation: "HTML is used to structure web pages.",
        difficulty: "Easy",
        marks: 1,
        status: "Draft",
      },
      {
        questionText: "JavaScript is a programming language.",
        questionType: "True/False",
        topic: "JavaScript Basics",
        optionA: "True",
        optionB: "False",
        optionC: "",
        optionD: "",
        optionE: "",
        correctAnswers: "A",
        expectedAnswer: "",
        explanation: "",
        difficulty: "Easy",
        marks: 1,
        status: "Draft",
      },
      {
        questionText: "Explain closures in JavaScript.",
        questionType: "Short Answer",
        topic: "JavaScript",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        optionE: "",
        correctAnswers: "",
        expectedAnswer: "A function retains access to its lexical scope.",
        explanation: "",
        difficulty: "Medium",
        marks: 3,
        status: "Draft",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
    XLSX.writeFile(workbook, "subject-question-bank-template.xlsx");
  };

  const handleExcelFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError("Please upload an Excel .xlsx or .xls file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Excel file must be 5 MB or smaller.");
      return;
    }

    try {
      setError("");
      setNotice("");
      setImportReport(null);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        setError("The selected Excel sheet has no question rows.");
        return;
      }

      setExcelRows(rows.map(normalizeExcelRow));
      setExcelFileName(file.name);
    } catch {
      setError("Unable to read the Excel file. Please check its format.");
    }
  };

  const handleImport = async () => {
    if (!excelRows.length) return;

    try {
      setImporting(true);
      setError("");
      setNotice("");
      setImportReport(null);

      const response = await importSubjectQuestions(subjectId, excelRows);
      const result = response?.data || {};

        setImportReport(result);
        setNotice(result.message || "Excel import completed.");

        if (result.importedCount > 0) {
        await loadData();
        }

        if (result.rejected?.length > 0) {
        // Keep only rejected rows in the preview so a retry
        // does not import already-successful rows again.
        const rejectedRowNumbers = new Set(
            result.rejected.map((item) => item.row)
        );

        setExcelRows((previous) =>
            previous.filter((_, index) =>
            rejectedRowNumbers.has(index + 2)
            )
        );

        setExcelFileName("Correct the rejected rows and retry");
        } else {
        setExcelRows([]);
        setExcelFileName("");
        }

    //   setImportReport(result);
    //   setNotice(result.message || "Excel import completed.");

    //   if (result.importedCount > 0) {
    //     await loadData();
    //   }

    //   if (result.importedCount === excelRows.length) {
    //     setExcelRows([]);
    //     setExcelFileName("");
    //   }
    } catch (err) {
      setError(messageFrom(err, "Excel import failed."));
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return <div className="sqb-page"><div className="sqb-card">Loading Question Bank...</div></div>;
  }

  return (
    <div className="sqb-page">
      <header className="sqb-header">
        <div>
          <button
            type="button"
            className="sqb-back"
            onClick={() => navigate("/admin/subjects")}
          >
            <FiArrowLeft /> Back to Subjects
          </button>
          <h1>Question Bank</h1>
          <p>
            {subject?.subjectName || "Subject"}{" "}
            {subject?.subjectCode ? `(${subject.subjectCode})` : ""}
          </p>
        </div>

        <button type="button" className="sqb-primary" onClick={startNewQuestion}>
          <FiPlus /> Add Question
        </button>
      </header>

      {error && <div className="sqb-alert sqb-error" role="alert">{error}</div>}
      {notice && <div className="sqb-alert sqb-success" role="status">{notice}</div>}

      <section className="sqb-card">
        <div className="sqb-section-heading">
          <div>
            <h2>Import questions from Excel</h2>
            <p>Download the template, fill it, and upload your completed file.</p>
          </div>
          <button type="button" className="sqb-secondary" onClick={downloadTemplate}>
            <FiDownload /> Download template
          </button>
        </div>

        <label className="sqb-upload">
          <FiUpload />
          <span>Choose Excel file (.xlsx or .xls)</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelFile}
          />
        </label>

        {excelFileName && (
          <div className="sqb-import-summary">
            <div>
              <strong>{excelFileName}</strong>
              <p>{excelRows.length} row(s) ready for preview</p>
            </div>
            <div className="sqb-inline-actions">
              <button
                type="button"
                className="sqb-secondary"
                onClick={() => {
                  setExcelRows([]);
                  setExcelFileName("");
                  setImportReport(null);
                }}
              >
                <FiX /> Clear
              </button>
              <button
                type="button"
                className="sqb-primary"
                onClick={handleImport}
                disabled={importing || !excelRows.length}
              >
                <FiUpload /> {importing ? "Importing..." : "Import questions"}
              </button>
            </div>
          </div>
        )}

        {excelRows.length > 0 && (
          <div className="sqb-preview">
            <h3>Import preview (first 5 rows)</h3>
            <div className="sqb-table-wrap">
              <table className="sqb-table">
                <thead>
                  <tr><th>Question</th><th>Type</th><th>Difficulty</th><th>Marks</th></tr>
                </thead>
                <tbody>
                  {excelRows.slice(0, 5).map((row, index) => (
                    <tr key={`${index}-${row.questionText}`}>
                      <td>{row.questionText || "Missing question text"}</td>
                      <td>{row.questionType}</td>
                      <td>{row.difficulty}</td>
                      <td>{row.marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importReport?.rejected?.length > 0 && (
              <div className="sqb-rejected">
                <strong>Rows needing correction</strong>
                <ul>
                  {importReport.rejected.map((item) => (
                    <li key={`${item.row}-${item.message}`}>
                      Excel row {item.row}: {item.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {showForm && (
        <section className="sqb-card">
          <div className="sqb-section-heading">
            <h2>{editingId ? "Edit Question" : "Add Question Manually"}</h2>
            <button
              type="button"
              className="sqb-icon-button"
              onClick={() => setShowForm(false)}
              aria-label="Close question form"
            >
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="sqb-form-grid">
              <label className="sqb-field sqb-full">
                Question *
                <textarea
                  name="questionText"
                  value={form.questionText}
                  onChange={changeField}
                  rows={3}
                  maxLength={5000}
                  required
                />
              </label>

              <label className="sqb-field">
                Topic
                <input name="topic" value={form.topic} onChange={changeField} maxLength={150} />
              </label>

              <label className="sqb-field">
                Question type
                <select name="questionType" value={form.questionType} onChange={changeField}>
                  {["MCQ", "Multiple Select", "True/False", "Short Answer", "Long Answer"].map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>

              <label className="sqb-field">
                Difficulty
                <select name="difficulty" value={form.difficulty} onChange={changeField}>
                  {["Easy", "Medium", "Hard"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label className="sqb-field">
                Marks
                <input name="marks" type="number" min="1" max="1000" step="1" value={form.marks} onChange={changeField} required />
              </label>

              <label className="sqb-field">
                Status
                <select name="status" value={form.status} onChange={changeField}>
                  {["Draft", "Active", "Archived"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              {OPTION_TYPES.includes(form.questionType) && (
                <div className="sqb-field sqb-full">
                  <span>Options — select the correct answer{form.questionType === "Multiple Select" ? "s" : ""}</span>
                  <div className="sqb-options">
                    {form.options.map((option, index) => (
                      <div className="sqb-option-row" key={option.optionKey}>
                        <label className="sqb-correct-choice">
                          <input
                            type={form.questionType === "Multiple Select" ? "checkbox" : "radio"}
                            name="correctAnswers"
                            checked={form.correctAnswers.includes(option.optionKey)}
                            onChange={() => toggleCorrectAnswer(option.optionKey)}
                          />
                          {option.optionKey}
                        </label>
                        <input
                          aria-label={`Option ${option.optionKey}`}
                          value={option.optionText}
                          maxLength={500}
                          onChange={(event) => changeOption(index, event.target.value)}
                          required
                        />
                        {form.questionType !== "True/False" && form.options.length > 2 && (
                          <button
                            type="button"
                            className="sqb-icon-button"
                            aria-label={`Remove option ${option.optionKey}`}
                            onClick={() => {
                              setForm((previous) => {
                                const nextOptions = previous.options.filter((_, i) => i !== index);
                                return {
                                  ...previous,
                                  options: nextOptions,
                                  correctAnswers: previous.correctAnswers.filter((key) =>
                                    nextOptions.some((item) => item.optionKey === key)
                                  ),
                                };
                              });
                            }}
                          >
                            <FiX />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {form.questionType !== "True/False" && form.options.length < 5 && (
                    <button
                      type="button"
                      className="sqb-secondary"
                      onClick={() => {
                        setForm((previous) => {
                          const nextKey = ["A", "B", "C", "D", "E"].find(
                            (key) => !previous.options.some((item) => item.optionKey === key)
                          );
                          if (!nextKey) return previous;
                          return {
                            ...previous,
                            options: [...previous.options, { optionKey: nextKey, optionText: "" }]
                          };
                        });
                      }}
                    >
                      <FiPlus /> Add option
                    </button>
                  )}
                </div>
              )}

              <label className="sqb-field sqb-full">
                Expected answer (for short/long answer questions)
                <textarea name="expectedAnswer" value={form.expectedAnswer} onChange={changeField} rows={3} maxLength={5000} />
              </label>

              <label className="sqb-field sqb-full">
                Explanation
                <textarea name="explanation" value={form.explanation} onChange={changeField} rows={2} maxLength={3000} />
              </label>
            </div>

            <div className="sqb-form-actions">
              <button type="button" className="sqb-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="sqb-primary" disabled={saving}>
                <FiSave /> {saving ? "Saving..." : editingId ? "Update Question" : "Save Question"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="sqb-card">
        <div className="sqb-section-heading">
          <div>
            <h2>Questions in this subject</h2>
            <p>{questions.length} total question(s)</p>
          </div>
        </div>

        <div className="sqb-filters">
          <input
            aria-label="Search questions"
            placeholder="Search question or topic..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {["Draft", "Active", "Archived"].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Filter by question type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All types</option>
            {["MCQ", "Multiple Select", "True/False", "Short Answer", "Long Answer"].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        {visibleQuestions.length === 0 ? (
          <div className="sqb-empty">
            <h3>No questions found</h3>
            <p>Add a question manually or import one from Excel.</p>
          </div>
        ) : (
          <div className="sqb-table-wrap">
            <table className="sqb-table">
              <thead>
                <tr><th>#</th><th>Question</th><th>Type</th><th>Difficulty</th><th>Marks</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {visibleQuestions.map((question, index) => (
                  <tr key={question._id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{question.questionText}</strong>
                      {question.topic && <small>{question.topic}</small>}
                    </td>
                    <td>{question.questionType}</td>
                    <td>{question.difficulty}</td>
                    <td>{question.marks}</td>
                    <td><span className={`sqb-status sqb-status-${question.status?.toLowerCase()}`}>{question.status}</span></td>
                    <td>
                      <div className="sqb-inline-actions">
                        <button type="button" className="sqb-icon-button" onClick={() => startEdit(question)} title="Edit question" aria-label="Edit question">
                          <FiEdit2 />
                        </button>
                        <button type="button" className="sqb-icon-button sqb-delete" onClick={() => handleDelete(question)} title="Delete question" aria-label="Delete question">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
