import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import { getCourses, getCourse } from "../../../services/courseService";
import { getSubjects } from "../../../services/subjectService";
import {
  getSubjectQuestionBank,
} from "../../../services/subjectQuestionBankService";
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
} from "../../../services/examService";

import "../../../styles/ExamSchedule.css";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  course_id: "",
  totalQuestions: "10",
  totalMarks: "10",
  selectedQuestions: [],
};

const unwrap = (response) => response?.data ?? response;

const getArray = (response, keys = []) => {
  const root = unwrap(response);
  const data = root?.data ?? root;

  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

const getId = (value) =>
  typeof value === "object" ? value?._id : value;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getQuestionText = (question) =>
  question.questionText || "Untitled question";

const getOptionSummary = (question) =>
  [question.optionA, question.optionB, question.optionC, question.optionD]
    .filter(Boolean)
    .join(" · ");

export default function ExamSchedule() {
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [search, setSearch] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalQuestions = Number(form.totalQuestions);
  const totalMarks = Number(form.totalMarks);

  const marksPerQuestion =
    totalQuestions > 0 && totalMarks > 0
      ? totalMarks / totalQuestions
      : 0;

  const selectedKeys = useMemo(
    () => new Set(form.selectedQuestions.map((item) =>
      `${item.subject_id}:${item.question_id}`
    )),
    [form.selectedQuestions]
  );

  const filteredQuestions = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return questions;

    return questions.filter((item) => {
      const searchable = [
        item.questionText,
        item.subjectName,
        item.optionA,
        item.optionB,
        item.optionC,
        item.optionD,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [questions, search]);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);

    try {
      const response = await getCourses({ limit: 100 });
      setCourses(getArray(response, ["courses"]));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getExams({
        page,
        limit: PAGE_SIZE,
        course_id: courseSearch || undefined,
      });

      const root = unwrap(response);
      const data = root?.data ?? root;

      setExams(Array.isArray(data?.exams) ? data.exams : []);
      setPagination(
        data?.pagination || { total: 0, totalPages: 1 }
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, courseSearch]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSubjects([]);
    setQuestions([]);
    setSearch("");
    setEditingId("");
    setFormOpen(false);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
    setSuccess("");
  };

  const loadCourseQuestions = async (courseId) => {
    setSubjects([]);
    setQuestions([]);
    setForm((current) => ({
      ...current,
      course_id: courseId,
      selectedQuestions: [],
    }));

    if (!courseId) return;

    setLoadingQuestions(true);
    setError("");

    try {
      let linkedSubjects = [];

      // The course model stores linked subjects in Course.subjects.
      try {
        const courseResponse = await getCourse(courseId);
        const courseRoot = unwrap(courseResponse);
        const courseData = courseRoot?.data ?? courseRoot;
        const course = courseData?.course ?? courseData;

        const courseSubjects = course?.subjects;

        if (
          Array.isArray(courseSubjects) &&
          courseSubjects.length > 0 &&
          typeof courseSubjects[0] === "object"
        ) {
          linkedSubjects = courseSubjects;
        } else if (
          Array.isArray(courseSubjects) &&
          courseSubjects.length > 0
        ) {
          const ids = new Set(courseSubjects.map(String));
          const allResponse = await getSubjects({
            page: 1,
            limit: 100,
            status: "Active",
          });

          linkedSubjects = getArray(allResponse, ["subjects"]).filter(
            (subject) => ids.has(String(subject._id))
          );
        }
      } catch {
        // Fall back to the subjects API below.
      }

      if (linkedSubjects.length === 0) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });

        const allSubjects = getArray(response, ["subjects"]);

        // Only use legacy course_id as a fallback when the course's
        // explicit subjects relationship could not be read.
        linkedSubjects = allSubjects.filter(
          (subject) => String(getId(subject.course_id)) === String(courseId)
        );
      }

      linkedSubjects = linkedSubjects.filter(
        (subject) => subject.status !== "Inactive"
      );

      setSubjects(linkedSubjects);

      const questionResults = await Promise.all(
        linkedSubjects.map(async (subject) => {
          const subjectId = subject._id;

          try {
            const response = await getSubjectQuestionBank(subjectId);
            const rows = getArray(response, ["questions"]);

            return rows.map((question) => ({
              ...question,
              subject_id: subjectId,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode,
            }));
          } catch {
            return [];
          }
        })
      );

      setQuestions(questionResults.flat());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingQuestions(false);
    }
  };

  const toggleQuestion = (question) => {
    const subjectId = String(question.subject_id);
    const questionId = String(question._id);
    const key = `${subjectId}:${questionId}`;

    setForm((current) => {
      const exists = current.selectedQuestions.some(
        (item) =>
          `${item.subject_id}:${item.question_id}` === key
      );

      return {
        ...current,
        selectedQuestions: exists
          ? current.selectedQuestions.filter(
              (item) =>
                `${item.subject_id}:${item.question_id}` !== key
            )
          : [
              ...current.selectedQuestions,
              {
                subject_id: subjectId,
                question_id: questionId,
              },
            ],
      };
    });
  };

  const selectVisibleQuestions = (checked) => {
    setForm((current) => {
      const next = new Map(
        current.selectedQuestions.map((item) => [
          `${item.subject_id}:${item.question_id}`,
          item,
        ])
      );

      filteredQuestions.forEach((question) => {
        const item = {
          subject_id: String(question.subject_id),
          question_id: String(question._id),
        };

        const key = `${item.subject_id}:${item.question_id}`;

        if (checked) next.set(key, item);
        else next.delete(key);
      });

      return {
        ...current,
        selectedQuestions: Array.from(next.values()),
      };
    });
  };

  const openEdit = async (exam) => {
    setError("");
    setSuccess("");
    setEditingId(exam._id);
    setFormOpen(true);
    setSearch("");

    const courseId = String(getId(exam.course_id) || "");

    setForm({
      course_id: courseId,
      totalQuestions: String(exam.totalQuestions ?? ""),
      totalMarks: String(exam.totalMarks ?? ""),
      selectedQuestions: (exam.selectedQuestions || []).map((item) => ({
        subject_id: String(getId(item.subject_id)),
        question_id: String(getId(item.question_id)),
      })),
    });

    await loadCourseQuestionsForEdit(courseId, exam.selectedQuestions || []);
  };

  const loadCourseQuestionsForEdit = async (courseId, selected) => {
    setLoadingQuestions(true);

    try {
      let linkedSubjects = [];
      const courseResponse = await getCourse(courseId);
      const root = unwrap(courseResponse);
      const course = root?.data?.course ?? root?.data ?? root;

      if (Array.isArray(course?.subjects)) {
        const ids = course.subjects.map((item) => String(getId(item)));

        if (course.subjects.some((item) => typeof item === "object")) {
          linkedSubjects = course.subjects;
        } else {
          const response = await getSubjects({
            page: 1,
            limit: 100,
            status: "Active",
          });
          linkedSubjects = getArray(response, ["subjects"]).filter(
            (subject) => ids.includes(String(subject._id))
          );
        }
      }

      if (linkedSubjects.length === 0) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });
        const ids = new Set(
          selected.map((item) => String(getId(item.subject_id)))
        );
        linkedSubjects = getArray(response, ["subjects"]).filter(
          (subject) =>
            ids.has(String(subject._id)) ||
            String(getId(subject.course_id)) === String(courseId)
        );
      }

      setSubjects(linkedSubjects);

      const results = await Promise.all(
        linkedSubjects.map(async (subject) => {
          try {
            const response = await getSubjectQuestionBank(subject._id);
            return getArray(response, ["questions"]).map((question) => ({
              ...question,
              subject_id: subject._id,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode,
            }));
          } catch {
            return [];
          }
        })
      );

      setQuestions(results.flat());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.course_id) {
      setError("Please select a course.");
      return;
    }

    if (!Number.isInteger(totalQuestions) || totalQuestions < 1) {
      setError("Total questions must be a positive whole number.");
      return;
    }

    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      setError("Total marks must be greater than zero.");
      return;
    }

    if (form.selectedQuestions.length !== totalQuestions) {
      setError(
        `Select exactly ${totalQuestions} questions. You selected ${form.selectedQuestions.length}.`
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        course_id: form.course_id,
        totalQuestions,
        totalMarks,
        selectedQuestions: form.selectedQuestions,
      };

      if (editingId) {
        await updateExam(editingId, payload);
        setSuccess("Exam updated successfully.");
      } else {
        await createExam(payload);
        setSuccess("Exam created successfully.");
      }

      resetForm();
      setPage(1);
      await loadExams();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm("Delete this exam? This action cannot be undone.")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await deleteExam(exam._id);
      setSuccess("Exam deleted successfully.");
      await loadExams();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const filteredCourses = courses;

  return (
    <main className="exam-page">
      <header className="exam-page-header">
        <div>
          <span className="exam-eyebrow">EXAMS / MANAGEMENT</span>
          <h1>Create Exam</h1>
          <p>
            Create an exam first. Hall tickets and exam timings will be
            managed separately.
          </p>
        </div>

        <div className="exam-header-actions">
          <button
            type="button"
            className="exam-secondary-btn"
            onClick={loadExams}
            disabled={loading}
          >
            <FiRefreshCw /> Refresh
          </button>
          <button
            type="button"
            className="exam-primary-btn"
            onClick={openCreate}
          >
            <FiPlus /> Create Exam
          </button>
        </div>
      </header>

      {error && (
        <div className="exam-alert exam-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}

      {success && (
        <div className="exam-alert exam-alert-success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}

      {formOpen && (
        <section className="exam-card exam-form-card">
          <div className="exam-section-heading">
            <div>
              <span className="exam-eyebrow">
                {editingId ? "EDIT EXAM" : "NEW EXAM"}
              </span>
              <h2>{editingId ? "Edit Exam" : "Exam Details"}</h2>
              <p>Select a course, set marks, then choose its MCQs.</p>
            </div>

            <button
              type="button"
              className="exam-icon-btn"
              onClick={resetForm}
              aria-label="Close form"
            >
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="exam-form-grid exam-create-grid">
              <label className="exam-field exam-field-wide">
                Select Course <span className="required">*</span>
                <select
                  value={form.course_id}
                  onChange={(event) => loadCourseQuestions(event.target.value)}
                  disabled={loadingCourses || loadingQuestions || saving}
                  required
                >
                  <option value="">
                    {loadingCourses ? "Loading courses..." : "Select course"}
                  </option>
                  {filteredCourses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="exam-field">
                Total Questions <span className="required">*</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  step="1"
                  value={form.totalQuestions}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      totalQuestions: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="exam-field">
                Total Marks <span className="required">*</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.totalMarks}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      totalMarks: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <div className="exam-calculated-marks">
                <span>Marks per Question</span>
                <strong>
                  {marksPerQuestion > 0
                    ? Number(marksPerQuestion.toFixed(4)).toString()
                    : "—"}
                </strong>
                <small>Calculated automatically</small>
              </div>

              <div className="exam-question-summary">
                <span>Available questions</span>
                <strong>{questions.length}</strong>
                <span>Selected {form.selectedQuestions.length} of {totalQuestions || 0}</span>
              </div>
            </div>

            <section className="exam-question-section">
              <div className="exam-section-heading exam-question-heading">
                <div>
                  <h2>Select Exam Questions</h2>
                  <p>
                    Questions are loaded from the selected course's linked
                    subjects.
                  </p>
                </div>
                <div className="exam-question-count">
                  {form.selectedQuestions.length} selected
                </div>
              </div>

              <div className="exam-question-toolbar">
                <label className="exam-search-box">
                  <FiSearch aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search question or subject..."
                    disabled={!form.course_id}
                  />
                </label>

                <label className="exam-select-all">
                  <input
                    type="checkbox"
                    checked={
                      filteredQuestions.length > 0 &&
                      filteredQuestions.every((question) =>
                        selectedKeys.has(
                          `${question.subject_id}:${question._id}`
                        )
                      )
                    }
                    onChange={(event) =>
                      selectVisibleQuestions(event.target.checked)
                    }
                    disabled={filteredQuestions.length === 0}
                  />
                  Select visible
                </label>
              </div>

              {!form.course_id ? (
                <div className="exam-question-empty">
                  <FiBookOpen />
                  <strong>Select a course first</strong>
                  <span>Its linked subjects and MCQs will appear here.</span>
                </div>
              ) : loadingQuestions ? (
                <div className="exam-question-empty">
                  Loading subjects and questions...
                </div>
              ) : questions.length === 0 ? (
                <div className="exam-question-empty">
                  <FiBookOpen />
                  <strong>No questions found</strong>
                  <span>
                    Add MCQs to the selected course's linked subjects first.
                  </span>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="exam-question-empty">
                  No questions match your search.
                </div>
              ) : (
                <div className="exam-question-list">
                  {filteredQuestions.map((question, index) => {
                    const key = `${question.subject_id}:${question._id}`;
                    const checked = selectedKeys.has(key);

                    return (
                      <label
                        key={key}
                        className={`exam-question-item ${checked ? "is-selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleQuestion(question)}
                        />

                        <span className="exam-question-number">
                          {index + 1}
                        </span>

                        <span className="exam-question-content">
                          <strong>{getQuestionText(question)}</strong>
                          <span>{getOptionSummary(question)}</span>
                          <small>
                            {question.subjectName}
                            {question.subjectCode
                              ? ` (${question.subjectCode})`
                              : ""}
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="exam-selection-footer">
                <span>
                  {form.selectedQuestions.length} of {totalQuestions || 0} required
                  questions selected
                </span>
                {form.selectedQuestions.length !== totalQuestions && (
                  <span className="exam-selection-warning">
                    Select the exact number before saving.
                  </span>
                )}
              </div>
            </section>

            <div className="exam-form-actions">
              <button
                type="button"
                className="exam-secondary-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="exam-primary-btn"
                disabled={
                  saving ||
                  loadingQuestions ||
                  !form.course_id ||
                  form.selectedQuestions.length !== totalQuestions ||
                  totalQuestions < 1 ||
                  totalMarks <= 0
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Exam"
                    : "Create Exam"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="exam-card">
        <div className="exam-section-heading">
          <div>
            <h2>Created Exams</h2>
            <p>{pagination.total} exam(s)</p>
          </div>
          <label className="exam-list-course-filter">
            Filter by course
            <select
              value={courseSearch}
              onChange={(event) => {
                setCourseSearch(event.target.value);
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
        </div>

        <div className="exam-table-wrap">
          <table className="exam-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Course</th>
                <th>Total Questions</th>
                <th>Total Marks</th>
                <th>Marks / Question</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="exam-empty">Loading exams...</td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan="7" className="exam-empty">
                    No exams created yet.
                  </td>
                </tr>
              ) : (
                exams.map((exam, index) => (
                  <tr key={exam._id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <strong>{exam.course_id?.courseTitle || "Course"}</strong>
                    </td>
                    <td>{exam.totalQuestions}</td>
                    <td>{exam.totalMarks}</td>
                    <td>{exam.marksPerQuestion}</td>
                    <td>
                      {exam.createdAt
                        ? new Date(exam.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td>
                      <div className="exam-row-actions">
                        <button
                          type="button"
                          className="exam-icon-btn"
                          title="Edit exam"
                          onClick={() => openEdit(exam)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="exam-icon-btn exam-icon-danger"
                          title="Delete exam"
                          onClick={() => handleDelete(exam)}
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

        <div className="exam-pagination">
          <span>
            Page {page} of {Math.max(pagination.totalPages || 1, 1)}
          </span>
          <div>
            <button
              type="button"
              className="exam-secondary-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="exam-secondary-btn"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}