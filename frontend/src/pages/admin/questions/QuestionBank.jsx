
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FiBookOpen,
  FiCheckCircle,
  FiEdit2,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { getCourses } from "../../../services/courseService";
import { getSubjects } from "../../../services/subjectService";
import {
  getQuestions,
  getQuestion,
  createQuestion,
  updateQuestion,
  updateQuestionStatus,
  deleteQuestion,
} from "../../../services/questionService";

import "../../../styles/QuestionBank.css";

const PAGE_SIZE = 10;

const QUESTION_TYPES = [
  "MCQ",
  "Multiple Select",
  "True/False",
  "Short Answer",
  "Long Answer",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STATUSES = ["Draft", "Active", "Archived"];

const createOption = (index, text = "") => ({
  optionKey: `option-${index}`,
  optionText: text,
});

const emptyForm = () => ({
  questionText: "",
  course_id: "",
  subject_id: "",
  topic: "",
  questionType: "MCQ",
  options: [
    createOption(1),
    createOption(2),
    createOption(3),
    createOption(4),
  ],
  correctAnswers: [],
  expectedAnswer: "",
  explanation: "",
  difficulty: "Medium",
  marks: "1",
  status: "Draft",
});

const readList = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.questions)) return payload.data.questions;
  if (Array.isArray(payload)) return payload;
  return [];
};

const readError = (error, fallback) =>
  error?.response?.data?.message || fallback;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export default function QuestionBank() {
  const questionFormRef = useRef(null);

  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [detailQuestion, setDetailQuestion] = useState(null);

  const selectedFormCourse = form.course_id;


  useEffect(() => {
    if (!formOpen) return;

    questionFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
    }, [formOpen, editingId]);

  const formSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          String(subject.course_id?._id || subject.course_id) ===
          String(selectedFormCourse)
      ),
    [subjects, selectedFormCourse]
  );

  const filterSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          !filterCourse ||
          String(subject.course_id?._id || subject.course_id) ===
            String(filterCourse)
      ),
    [subjects, filterCourse]
  );

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setOptionsLoading(true);

      try {
        const [courseResponse, subjectResponse] = await Promise.all([
          getCourses({ limit: 100 }),
          getSubjects({ limit: 100, status: "Active" }),
        ]);

        if (cancelled) return;

        setCourses(readList(courseResponse));
        setSubjects(readList(subjectResponse));
      } catch (err) {
        if (!cancelled) {
          setError(readError(err, "Unable to load course and subject options."));
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadQuestions = useCallback(async () => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    try {
      const response = await getQuestions(
        {
          page,
          limit: PAGE_SIZE,
          search: search.trim(),
          course_id: filterCourse,
          subject_id: filterSubject,
          questionType: filterType,
          difficulty: filterDifficulty,
          status: filterStatus,
        },
        { signal: controller.signal }
      );

      const payload = response?.data || {};
      setQuestions(Array.isArray(payload.data) ? payload.data : []);
      setPagination(
        payload.pagination || { total: 0, totalPages: 0 }
      );
    } catch (err) {
      if (err.code === "ERR_CANCELED" || err.name === "CanceledError") {
        return;
      }

      setQuestions([]);
      setError(readError(err, "Unable to load questions."));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }

    return () => controller.abort();
  }, [
    page,
    search,
    filterCourse,
    filterSubject,
    filterType,
    filterDifficulty,
    filterStatus,
    refreshKey,
  ]);

  useEffect(() => {
    let cancelled = false;

    const fetchQuestions = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getQuestions({
          page,
          limit: PAGE_SIZE,
          search: search.trim(),
          course_id: filterCourse,
          subject_id: filterSubject,
          questionType: filterType,
          difficulty: filterDifficulty,
          status: filterStatus,
        });

        if (cancelled) return;

        const payload = response?.data || {};
        setQuestions(Array.isArray(payload.data) ? payload.data : []);
        setPagination(
          payload.pagination || { total: 0, totalPages: 0 }
        );
      } catch (err) {
        if (!cancelled) {
          setQuestions([]);
          setError(readError(err, "Unable to load questions."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    search,
    filterCourse,
    filterSubject,
    filterType,
    filterDifficulty,
    filterStatus,
    refreshKey,
  ]);

  const resetForm = () => {
    setFormOpen(false);
    setEditingId("");
    setForm(emptyForm());
    setFormError("");
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId("");
    setFormError("");
    setError("");
    setNotice("");
    setFormOpen(true);
  };

  const openEdit = (question) => {
    setEditingId(question._id);

    setForm({
      questionText: question.questionText || "",
      course_id: question.course_id?._id || question.course_id || "",
      subject_id: question.subject_id?._id || question.subject_id || "",
      topic: question.topic || "",
      questionType: question.questionType || "MCQ",
      options: (question.options || []).map((option, index) => ({
        optionKey: option.optionKey || `option-${index + 1}`,
        optionText: option.optionText || "",
      })),
      correctAnswers: question.correctAnswers || [],
      expectedAnswer: question.expectedAnswer || "",
      explanation: question.explanation || "",
      difficulty: question.difficulty || "Medium",
      marks: String(question.marks ?? 1),
      status: question.status || "Draft",
    });

    setFormError("");
    setNotice("");
    setFormOpen(true);
    setDetailQuestion(null);
  };

  const changeField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "course_id") {
        next.subject_id = "";
      }

      if (name === "questionType") {
        if (["Short Answer", "Long Answer"].includes(value)) {
          next.options = [];
          next.correctAnswers = [];
        } else if (value === "True/False") {
          next.options = [
            createOption(1, "True"),
            createOption(2, "False"),
          ];
          next.correctAnswers = [];
        } else {
          next.options = [
            createOption(1),
            createOption(2),
            createOption(3),
            createOption(4),
          ];
          next.correctAnswers = [];
        }
      }

      return next;
    });

    setFormError("");
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

  const toggleCorrectAnswer = (optionKey, checked) => {
    setForm((previous) => {
      let correctAnswers;

      if (previous.questionType === "Multiple Select") {
        correctAnswers = checked
          ? [...new Set([...previous.correctAnswers, optionKey])]
          : previous.correctAnswers.filter((key) => key !== optionKey);
      } else {
        correctAnswers = checked ? [optionKey] : [];
      }

      return { ...previous, correctAnswers };
    });
  };

  const addOption = () => {
    setForm((previous) => {
      if (previous.options.length >= 5) return previous;

      let index = previous.options.length + 1;
      let key = `option-${index}`;

      while (previous.options.some((option) => option.optionKey === key)) {
        index += 1;
        key = `option-${index}`;
      }

      return {
        ...previous,
        options: [...previous.options, createOption(index)],
      };
    });
  };

  const removeOption = (index) => {
    setForm((previous) => {
      const removed = previous.options[index];

      return {
        ...previous,
        options: previous.options.filter(
          (_, optionIndex) => optionIndex !== index
        ),
        correctAnswers: previous.correctAnswers.filter(
          (key) => key !== removed.optionKey
        ),
      };
    });
  };

  const validateForm = () => {
    if (form.questionText.trim().length < 3) {
      return "Enter a question with at least 3 characters.";
    }

    if (!form.course_id || !form.subject_id) {
      return "Select a course and subject.";
    }

    if (!Number.isInteger(Number(form.marks)) || Number(form.marks) < 1) {
      return "Marks must be a whole number greater than zero.";
    }

    if (["MCQ", "Multiple Select", "True/False"].includes(form.questionType)) {
      if (form.options.length < 2 || form.options.length > 5) {
        return "This question type requires 2 to 5 options.";
      }

      if (form.options.some((option) => !option.optionText.trim())) {
        return "Fill in every option or remove empty options.";
      }

      if (!form.correctAnswers.length) {
        return "Select at least one correct answer.";
      }

      if (
        form.questionType === "MCQ" &&
        form.correctAnswers.length !== 1
      ) {
        return "MCQ must have exactly one correct answer.";
      }

      if (
        form.questionType === "True/False" &&
        (
          form.options.length !== 2 ||
          !["true", "false"].every((value) =>
            form.options.some(
              (option) => option.optionText.trim().toLowerCase() === value
            )
          )
        )
      ) {
        return 'True/False must contain exactly "True" and "False".';
      }
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      ...form,
      questionText: form.questionText.trim(),
      topic: form.topic.trim(),
      expectedAnswer: form.expectedAnswer.trim(),
      explanation: form.explanation.trim(),
      marks: Number(form.marks),
    };

    setSaving(true);
    setFormError("");
    setError("");
    setNotice("");

    try {
      if (editingId) {
        await updateQuestion(editingId, payload);
        setNotice("Question updated successfully.");
      } else {
        await createQuestion(payload);
        setNotice("Question created successfully.");
        setPage(1);
      }

      resetForm();
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setFormError(readError(err, "Unable to save the question."));
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (question) => {
    try {
      const response = await getQuestion(question._id);
      setDetailQuestion(response?.data?.data || question);
      setError("");
    } catch (err) {
      setError(readError(err, "Unable to load question details."));
    }
  };

  const handleDelete = async (question) => {
    if (
      !window.confirm(
        `Delete this question?\n\n${question.questionText}`
      )
    ) {
      return;
    }

    try {
      setError("");
      setNotice("");
      await deleteQuestion(question._id);
      setNotice("Question deleted successfully.");

      if (questions.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (err) {
      setError(readError(err, "Unable to delete the question."));
    }
  };

  const handleStatusChange = async (question, status) => {
    try {
      setError("");
      setNotice("");
      await updateQuestionStatus(question._id, status);
      setNotice(`Question status changed to ${status}.`);
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(readError(err, "Unable to update question status."));
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterCourse("");
    setFilterSubject("");
    setFilterType("");
    setFilterDifficulty("");
    setFilterStatus("");
    setPage(1);
    setNotice("");
  };

  const totalPages = pagination.totalPages || 0;

  return (
    <div className="question-page">
      <header className="question-page-header">
        <div>
          <span className="question-eyebrow">ASSESSMENT MANAGEMENT</span>
          <h1>Question Bank</h1>
          <p>Create and organize reusable questions by course and subject.</p>
        </div>

        <button
          type="button"
          className="question-primary-btn"
          onClick={openCreate}
        >
          <FiPlus />
          Add Question
        </button>
      </header>

      {error && (
        <div className="question-alert question-alert-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <FiX />
          </button>
        </div>
      )}

      {notice && (
        <div className="question-alert question-alert-success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            <FiX />
          </button>
        </div>
      )}

      {formOpen && (
        <section  ref={questionFormRef} className="question-card question-form-card">
          <div className="question-section-heading">
            <div>
              <h2>{editingId ? "Edit Question" : "Add New Question"}</h2>
              <p>Complete the question details and answer configuration.</p>
            </div>
            <button
              type="button"
              className="question-icon-btn"
              onClick={resetForm}
              aria-label="Close form"
              disabled={saving}
            >
              <FiX />
            </button>
          </div>

          {formError && (
            <div className="question-alert question-alert-error" role="alert">
              {formError}
            </div>
          )}

          {optionsLoading ? (
            <p className="question-helper-text">Loading courses and subjects...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="question-form-grid">
                <label className="question-field question-field-wide">
                  Question text *
                  <textarea
                    name="questionText"
                    value={form.questionText}
                    onChange={changeField}
                    minLength={3}
                    maxLength={5000}
                    rows={3}
                    required
                    placeholder="Enter the question..."
                  />
                </label>

                <label className="question-field">
                  Course *
                  <select
                    name="course_id"
                    value={form.course_id}
                    onChange={changeField}
                    required
                  >
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseTitle}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="question-field">
                  Subject *
                  <select
                    name="subject_id"
                    value={form.subject_id}
                    onChange={changeField}
                    required
                    disabled={!form.course_id}
                  >
                    <option value="">Select subject</option>
                    {formSubjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.subjectName} ({subject.subjectCode})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="question-field">
                  Topic
                  <input
                    name="topic"
                    value={form.topic}
                    onChange={changeField}
                    maxLength={150}
                    placeholder="e.g. React Hooks"
                  />
                </label>

                <label className="question-field">
                  Question type *
                  <select
                    name="questionType"
                    value={form.questionType}
                    onChange={changeField}
                    required
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="question-field">
                  Difficulty *
                  <select
                    name="difficulty"
                    value={form.difficulty}
                    onChange={changeField}
                    required
                  >
                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty} value={difficulty}>
                        {difficulty}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="question-field">
                  Marks *
                  <input
                    type="number"
                    name="marks"
                    value={form.marks}
                    onChange={changeField}
                    min="1"
                    max="1000"
                    step="1"
                    required
                  />
                </label>

                <label className="question-field">
                  Status *
                  <select
                    name="status"
                    value={form.status}
                    onChange={changeField}
                    required
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                {["MCQ", "Multiple Select", "True/False"].includes(
                  form.questionType
                ) && (
                  <div className="question-options question-field-wide">
                    <div className="question-options-heading">
                      <div>
                        <h3>Answer options *</h3>
                        <p>
                          {form.questionType === "Multiple Select"
                            ? "Select all correct answers."
                            : "Select the one correct answer."}
                        </p>
                      </div>

                      {form.questionType !== "True/False" && (
                        <button
                          type="button"
                          className="question-secondary-btn"
                          onClick={addOption}
                          disabled={form.options.length >= 5}
                        >
                          <FiPlus /> Add option
                        </button>
                      )}
                    </div>

                    {form.options.map((option, index) => (
                      <div className="question-option-row" key={option.optionKey}>
                        <span className="question-option-letter">
                          {String.fromCharCode(65 + index)}
                        </span>

                        <input
                          value={option.optionText}
                          onChange={(event) =>
                            changeOption(index, event.target.value)
                          }
                          maxLength={500}
                          aria-label={`Option ${index + 1}`}
                          placeholder={`Enter option ${index + 1}`}
                          required
                          readOnly={form.questionType === "True/False"}
                        />

                        <label className="question-correct-toggle">
                          <input
                            type={
                              form.questionType === "Multiple Select"
                                ? "checkbox"
                                : "radio"
                            }
                            name="correctAnswer"
                            checked={form.correctAnswers.includes(option.optionKey)}
                            onChange={(event) =>
                              toggleCorrectAnswer(
                                option.optionKey,
                                event.target.checked
                              )
                            }
                          />
                          Correct
                        </label>

                        {form.questionType !== "True/False" && (
                          <button
                            type="button"
                            className="question-icon-btn question-danger-icon"
                            onClick={() => removeOption(index)}
                            disabled={form.options.length <= 2}
                            aria-label={`Remove option ${index + 1}`}
                            title="Remove option"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <label className="question-field question-field-wide">
                  Expected answer
                  <textarea
                    name="expectedAnswer"
                    value={form.expectedAnswer}
                    onChange={changeField}
                    rows={3}
                    maxLength={5000}
                    placeholder="Reference answer for short/long answer questions (optional)"
                  />
                </label>

                <label className="question-field question-field-wide">
                  Explanation
                  <textarea
                    name="explanation"
                    value={form.explanation}
                    onChange={changeField}
                    rows={2}
                    maxLength={3000}
                    placeholder="Explain why the answer is correct (optional)"
                  />
                </label>
              </div>

              <div className="question-form-actions">
                <button
                  type="button"
                  className="question-secondary-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="question-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Question"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="question-card">
        <div className="question-section-heading">
          <div>
            <h2>Questions</h2>
            <p>{pagination.total || 0} questions found</p>
          </div>

          <button
            type="button"
            className="question-secondary-btn"
            onClick={() => setRefreshKey((previous) => previous + 1)}
            disabled={loading}
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>

        <div className="question-filter-grid">
          <label className="question-field">
            Search
            <span className="question-search-input">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Question text or topic"
                type="search"
              />
            </span>
          </label>

          <label className="question-field">
            Course
            <select
              value={filterCourse}
              onChange={(event) => {
                setFilterCourse(event.target.value);
                setFilterSubject("");
                setPage(1);
              }}
            >
              <option value="">All courses</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseTitle}
                </option>
              ))}
            </select>
          </label>

          <label className="question-field">
            Subject
            <select
              value={filterSubject}
              onChange={(event) => {
                setFilterSubject(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All subjects</option>
              {filterSubjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.subjectName}
                </option>
              ))}
            </select>
          </label>

          <label className="question-field">
            Type
            <select
              value={filterType}
              onChange={(event) => {
                setFilterType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All types</option>
              {QUESTION_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="question-field">
            Difficulty
            <select
              value={filterDifficulty}
              onChange={(event) => {
                setFilterDifficulty(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All difficulties</option>
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>
          </label>

          <label className="question-field">
            Status
            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <div className="question-filter-action">
            <button
              type="button"
              className="question-secondary-btn"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
        </div>

        <div className="question-table-wrap">
          <table className="question-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Course / Subject</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="question-empty">
                    Loading questions...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="question-empty">
                    <FiBookOpen />
                    <strong>No questions found</strong>
                    <span>Try changing the filters or add a new question.</span>
                  </td>
                </tr>
              ) : (
                questions.map((question) => (
                  <tr key={question._id}>
                    <td>
                      <button
                        type="button"
                        className="question-name-link"
                        onClick={() => handleView(question)}
                      >
                        {question.questionText}
                      </button>
                      {question.topic && (
                        <span className="question-subtext">{question.topic}</span>
                      )}
                    </td>

                    <td>
                      <strong>{question.course_id?.courseTitle || "—"}</strong>
                      <span className="question-subtext">
                        {question.subject_id?.subjectName || "—"}
                      </span>
                    </td>

                    <td>{question.questionType}</td>

                    <td>
                      <span
                        className={`question-difficulty question-difficulty-${question.difficulty?.toLowerCase()}`}
                      >
                        {question.difficulty}
                      </span>
                    </td>

                    <td>{question.marks}</td>

                    <td>
                      <select
                        className={`question-status-select question-status-${question.status?.toLowerCase()}`}
                        value={question.status}
                        aria-label={`Status for question ${question._id}`}
                        onChange={(event) =>
                          handleStatusChange(question, event.target.value)
                        }
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>

                    <td>{formatDate(question.updatedAt)}</td>

                    <td>
                      <div className="question-row-actions">
                        <button
                          type="button"
                          className="question-icon-btn"
                          onClick={() => handleView(question)}
                          title="View question"
                          aria-label="View question"
                        >
                          <FiEye />
                        </button>
                        <button
                          type="button"
                          className="question-icon-btn"
                          onClick={() => openEdit(question)}
                          title="Edit question"
                          aria-label="Edit question"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="question-icon-btn question-danger-icon"
                          onClick={() => handleDelete(question)}
                          title="Delete question"
                          aria-label="Delete question"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 0 && (
          <div className="question-pagination">
            <span>Page {page} of {totalPages}</span>
            <div>
              <button
                type="button"
                className="question-secondary-btn"
                disabled={page <= 1}
                onClick={() => setPage((previous) => previous - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="question-secondary-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {detailQuestion && (
        <div
          className="question-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailQuestion(null);
          }}
        >
          <section
            className="question-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-detail-title"
          >
            <div className="question-section-heading">
              <div>
                <span className="question-eyebrow">QUESTION DETAILS</span>
                <h2 id="question-detail-title">Question</h2>
              </div>
              <button
                type="button"
                className="question-icon-btn"
                onClick={() => setDetailQuestion(null)}
                aria-label="Close details"
              >
                <FiX />
              </button>
            </div>

            <p className="question-detail-text">{detailQuestion.questionText}</p>

            <dl className="question-detail-grid">
              <div><dt>Course</dt><dd>{detailQuestion.course_id?.courseTitle || "—"}</dd></div>
              <div><dt>Subject</dt><dd>{detailQuestion.subject_id?.subjectName || "—"}</dd></div>
              <div><dt>Topic</dt><dd>{detailQuestion.topic || "—"}</dd></div>
              <div><dt>Type</dt><dd>{detailQuestion.questionType}</dd></div>
              <div><dt>Difficulty</dt><dd>{detailQuestion.difficulty}</dd></div>
              <div><dt>Marks</dt><dd>{detailQuestion.marks}</dd></div>
              <div><dt>Status</dt><dd>{detailQuestion.status}</dd></div>
              <div><dt>Updated</dt><dd>{formatDate(detailQuestion.updatedAt)}</dd></div>
            </dl>

            {detailQuestion.options?.length > 0 && (
              <div className="question-detail-options">
                <h3>Options</h3>
                {detailQuestion.options.map((option, index) => (
                  <div className="question-detail-option" key={option.optionKey || option._id}>
                    <span>{String.fromCharCode(65 + index)}.</span>
                    <span>{option.optionText}</span>
                    {detailQuestion.correctAnswers?.includes(option.optionKey) && (
                      <FiCheckCircle className="question-correct-icon" title="Correct answer" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {detailQuestion.expectedAnswer && (
              <div className="question-detail-block">
                <h3>Expected answer</h3>
                <p>{detailQuestion.expectedAnswer}</p>
              </div>
            )}

            {detailQuestion.explanation && (
              <div className="question-detail-block">
                <h3>Explanation</h3>
                <p>{detailQuestion.explanation}</p>
              </div>
            )}

            <div className="question-form-actions">
              <button
                type="button"
                className="question-secondary-btn"
                onClick={() => setDetailQuestion(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="question-primary-btn"
                onClick={() => openEdit(detailQuestion)}
              >
                <FiEdit2 /> Edit Question
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
