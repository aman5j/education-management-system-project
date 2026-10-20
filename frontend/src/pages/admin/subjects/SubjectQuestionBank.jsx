import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
};

const REQUIRED_COLUMNS = [
  "questionText",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctAnswer",
];

const messageFrom = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getPayload = (response) =>
  response?.data?.data ?? response?.data;

const normalizeExcelRow = (row = {}) => {
  const normalized = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[String(key).trim().toLowerCase()] = value;
  });

  return {
    questionText: String(normalized.questiontext ?? "").trim(),
    optionA: String(normalized.optiona ?? "").trim(),
    optionB: String(normalized.optionb ?? "").trim(),
    optionC: String(normalized.optionc ?? "").trim(),
    optionD: String(normalized.optiond ?? "").trim(),
    correctAnswer: String(normalized.correctanswer ?? "")
      .trim()
      .toUpperCase(),
  };
};


export default function SubjectQuestionBank() {
  const { id: subjectId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const canViewQuestionBank = hasPermission(
    user,
    "question_bank.view"
  );

  const canManageQuestionBank = hasPermission(
    user,
    "question_bank.manage"
  );


  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [excelRows, setExcelRows] = useState([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importReport, setImportReport] = useState(null);

  const formSectionRef = useRef(null);
  const questionInputRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [subjectResponse, questionResponse] = await Promise.all([
        getSubjectById(subjectId),
        getSubjectQuestionBank(subjectId),
      ]);

      const subjectPayload = getPayload(subjectResponse);
      const subjectData = subjectPayload?.subject || subjectPayload;
      const questionPayload = getPayload(questionResponse);

      const questionData = Array.isArray(questionPayload)
        ? questionPayload
        : questionPayload?.questions || questionPayload?.data || [];

      setSubject(subjectData);
      setQuestions(Array.isArray(questionData) ? questionData : []);
    } catch (err) {
      setError(messageFrom(err, "Unable to load the subject MCQs."));
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
      if (!showForm) return;

      const frameId = requestAnimationFrame(() => {
          formSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          });

          questionInputRef.current?.focus({ preventScroll: true });
      });

      return () => cancelAnimationFrame(frameId);
      }, [showForm, editingId]);

  useEffect(() => {
    if (authLoading || !canViewQuestionBank) {
      setLoading(false);
      return;
    }

    loadData();
  }, [authLoading, canViewQuestionBank, loadData]);

  const visibleQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return questions.filter(
      (question) =>
        !query ||
        question.questionText?.toLowerCase().includes(query) ||
        question.optionA?.toLowerCase().includes(query) ||
        question.optionB?.toLowerCase().includes(query) ||
        question.optionC?.toLowerCase().includes(query) ||
        question.optionD?.toLowerCase().includes(query)
    );
  }, [questions, search]);

  const changeField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setNotice("");
  };

  const startNewQuestion = () => {

    if (!canManageQuestionBank) return;

    setForm({ ...EMPTY_FORM });
    setEditingId("");
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const startEdit = (question) => {

    if (!canManageQuestionBank) return;

    setForm({
      questionText: question.questionText || "",
      optionA: question.optionA || "",
      optionB: question.optionB || "",
      optionC: question.optionC || "",
      optionD: question.optionD || "",
      correctAnswer: question.correctAnswer || "A",
    });

    setEditingId(question._id);
    setShowForm(true);
    setError("");
    setNotice("");
  };

  const handleSave = async (event) => {
    if (!canManageQuestionBank) {
      setError("You do not have permission to manage MCQs.");
      return;
    }

    event.preventDefault();

    const payload = {
      questionText: form.questionText.trim(),
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      optionC: form.optionC.trim(),
      optionD: form.optionD.trim(),
      correctAnswer: form.correctAnswer,
    };

    if (
      !payload.questionText ||
      !payload.optionA ||
      !payload.optionB ||
      !payload.optionC ||
      !payload.optionD
    ) {
      setError("Please fill in the question and all four options.");
      return;
    }

    if (!["A", "B", "C", "D"].includes(payload.correctAnswer)) {
      setError("Please select the correct answer.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      if (editingId) {
        await updateSubjectQuestion(subjectId, editingId, payload);
        setNotice("MCQ updated successfully.");
      } else {
        await addSubjectQuestion(subjectId, payload);
        setNotice("MCQ added successfully.");
      }

      setShowForm(false);
      setEditingId("");
      setForm({ ...EMPTY_FORM });

      await loadData();
    } catch (err) {
      setError(messageFrom(err, "Unable to save the MCQ."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (question) => {
    if (!canManageQuestionBank) {
      setError("You do not have permission to manage MCQs.");
      return;
    }

    if (!window.confirm("Delete this MCQ permanently?")) {
      return;
    }

    try {
      setError("");
      setNotice("");

      await deleteSubjectQuestion(subjectId, question._id);

      setQuestions((previous) =>
        previous.filter((item) => item._id !== question._id)
      );

      setNotice("MCQ deleted successfully.");
    } catch (err) {
      setError(messageFrom(err, "Unable to delete the MCQ."));
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        questionText: "What does HTML stand for?",
        optionA: "Hyper Text Markup Language",
        optionB: "High Text Machine Language",
        optionC: "Hyper Tool Multi Language",
        optionD: "Home Text Markup Language",
        correctAnswer: "A",
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(template, {
      header: REQUIRED_COLUMNS,
    });

    XLSX.utils.book_append_sheet(workbook, worksheet, "MCQs");
    XLSX.writeFile(workbook, "subject-mcq-template.xlsx");
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

      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: "array",
      });

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!firstSheet) {
        setError("The Excel file does not contain a worksheet.");
        return;
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        setError("The selected Excel sheet has no MCQ rows.");
        return;
      }

      const actualColumns = Object.keys(rows[0]).map((key) =>
        key.trim().toLowerCase()
      );

      const missingColumns = REQUIRED_COLUMNS.filter(
        (column) => !actualColumns.includes(column.toLowerCase())
      );

      if (missingColumns.length) {
        setError(
          `Missing Excel column(s): ${missingColumns.join(", ")}. Download the template and use its exact column names.`
        );
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

      const response = await importSubjectQuestions(
        subjectId,
        excelRows
      );

      const result = response?.data || {};

      setImportReport(result);
      setNotice(result.message || "Excel import completed.");

      if (result.importedCount > 0) {
        await loadData();
      }

      if (result.rejected?.length > 0) {
        const rejectedRows = new Set(
          result.rejected.map((item) => item.row)
        );

        setExcelRows((previous) =>
          previous.filter((_, index) => rejectedRows.has(index + 2))
        );

        setExcelFileName("Rejected rows — correct them and retry");
      } else {
        setExcelRows([]);
        setExcelFileName("");
      }
    } catch (err) {
      setError(messageFrom(err, "Excel import failed."));
    } finally {
      setImporting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="sqb-page">
        <div className="sqb-card">Checking permissions...</div>
      </div>
    );
  }

  if (!canViewQuestionBank) {
    return (
      <div className="sqb-page">
        <div className="sqb-card" role="alert">
          <h2>Access Denied</h2>
          <p>You do not have permission to view the Question Bank.</p>
          <button
            type="button"
            className="sqb-secondary"
            onClick={() => navigate(`${basePath}/subjects`)}
          >
            <FiArrowLeft /> Back to Subjects
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="sqb-page">
        <div className="sqb-card">Loading Question Bank...</div>
      </div>
    );
  }

  return (
    <div className="sqb-page">
      <div className="sqb-page-header">
        <button
          type="button"
          className="sqb-secondary"
          onClick={() => navigate(`${basePath}/subjects`)}
        >
          <FiArrowLeft /> Back to Subjects
        </button>

        <div>
          <h1>Subject MCQ Question Bank</h1>
          <p>
            Subject: <strong>{subject?.subjectName || "Subject"}</strong>
          </p>
        </div>

        {canManageQuestionBank && (
          <button
            type="button"
            className="sqb-primary"
            onClick={startNewQuestion}
          >
            <FiPlus /> Add MCQ
          </button>
        )}

      </div>

      {error && (
        <div className="sqb-alert sqb-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="sqb-alert sqb-alert-success" role="status">
          {notice}
        </div>
      )}

      {canManageQuestionBank && (
      <section className="sqb-card">
        <div className="sqb-section-heading">
          <div>
            <h2>Excel MCQ Import</h2>
            <p>
              Use the six required columns. No marks column is needed.
            </p>
          </div>

          <button
            type="button"
            className="sqb-secondary"
            onClick={downloadTemplate}
          >
            <FiDownload /> Download Excel Template
          </button>
        </div>

        <div className="sqb-import-controls">
          <label className="sqb-secondary">
            <FiUpload /> Select Excel File
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFile}
              hidden
            />
          </label>

          {excelFileName && <span>{excelFileName}</span>}

          <button
            type="button"
            className="sqb-primary"
            disabled={!excelRows.length || importing}
            onClick={handleImport}
          >
            {importing
              ? "Importing..."
              : `Import ${excelRows.length} MCQ(s)`}
          </button>
        </div>

        {excelRows.length > 0 && (
          <div className="sqb-table-wrap">
            <table className="sqb-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Option A</th>
                  <th>Option B</th>
                  <th>Option C</th>
                  <th>Option D</th>
                  <th>Correct Answer</th>
                </tr>
              </thead>

              <tbody>
                {excelRows.map((row, index) => (
                  <tr key={`${index}-${row.questionText}`}>
                    <td>{row.questionText}</td>
                    <td>{row.optionA}</td>
                    <td>{row.optionB}</td>
                    <td>{row.optionC}</td>
                    <td>{row.optionD}</td>
                    <td>{row.correctAnswer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
      </section>
      )}

      {canManageQuestionBank && showForm && (
        <section ref={formSectionRef} className="sqb-card">
          <div className="sqb-section-heading">
            <h2>{editingId ? "Edit MCQ" : "Add MCQ Manually"}</h2>

            <button
              type="button"
              className="sqb-icon-button"
              onClick={() => setShowForm(false)}
              aria-label="Close form"
            >
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSave}>
            <div className="sqb-form-grid">
              <label className="sqb-field sqb-full">
                Question *
                <textarea
                  ref={questionInputRef}
                  name="questionText"
                  value={form.questionText}
                  onChange={changeField}
                  rows={3}
                  maxLength={5000}
                  required
                />
              </label>

              {["A", "B", "C", "D"].map((key) => (
                <label className="sqb-field" key={key}>
                  Option {key} *
                  <input
                    name={`option${key}`}
                    value={form[`option${key}`]}
                    onChange={changeField}
                    maxLength={1000}
                    required
                  />
                </label>
              ))}

              <fieldset className="sqb-field sqb-full">
                <legend>Correct Answer *</legend>

                <div className="sqb-options">
                  {["A", "B", "C", "D"].map((key) => (
                    <label
                      className="sqb-correct-choice"
                      key={key}
                    >
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={key}
                        checked={form.correctAnswer === key}
                        onChange={changeField}
                      />
                      Option {key}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="sqb-form-actions">
              <button
                type="button"
                className="sqb-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="sqb-primary"
                disabled={saving}
              >
                <FiSave />
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update MCQ"
                    : "Save MCQ"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="sqb-card">
        <div className="sqb-section-heading">
          <div>
            <h2>MCQs in this Subject</h2>
            <p>{questions.length} question(s)</p>
          </div>
        </div>

        <div className="sqb-filters">
          <input
            aria-label="Search MCQs"
            placeholder="Search question or option..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {visibleQuestions.length === 0 ? (
          <div className="sqb-empty">
            <h3>No MCQs found</h3>
            <p>Add an MCQ manually or import one from Excel.</p>
          </div>
        ) : (
          <div className="sqb-table-wrap">
            <table className="sqb-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Option A</th>
                  <th>Option B</th>
                  <th>Option C</th>
                  <th>Option D</th>
                  <th>Correct Answer</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visibleQuestions.map((question, index) => (
                  <tr key={question._id}>
                    <td>{index + 1}</td>
                    <td>{question.questionText}</td>
                    <td>{question.optionA}</td>
                    <td>{question.optionB}</td>
                    <td>{question.optionC}</td>
                    <td>{question.optionD}</td>
                    <td>{question.correctAnswer}</td>
                    <td>
                      <div className="sqb-inline-actions">
                        {canManageQuestionBank && (
                          <>
                            <button
                              type="button"
                              className="sqb-icon-button"
                              title="Edit MCQ"
                              aria-label="Edit MCQ"
                              onClick={() => startEdit(question)}
                            >
                              <FiEdit2 />
                            </button>

                            <button
                              type="button"
                              className="sqb-icon-button sqb-delete"
                              title="Delete MCQ"
                              aria-label="Delete MCQ"
                              onClick={() => handleDelete(question)}
                            >
                              <FiTrash2 />
                            </button>
                          </>
                        )}

                        {!canManageQuestionBank && (
                          <span>Read only</span>
                        )}
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
