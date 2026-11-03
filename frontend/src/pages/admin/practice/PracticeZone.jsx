
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiArchive,
  FiX,
} from "react-icons/fi";

import { getCourses, getCourse } from "../../../services/courseService";
import { getSubjects } from "../../../services/subjectService";

import {
  getPracticeTests,
  createPracticeTest,
  updatePracticeTest,
  updatePracticeTestStatus,
  deletePracticeTest,
} from "../../../services/practiceService";

import "../../../styles/PracticeZone.css";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  title: "",
  description: "",
  course_id: "",
  subject_id: "",
  totalQuestions: "10",
  durationMinutes: "20",
  marksPerQuestion: "1",
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

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClass = (status) =>
  `practice-status practice-status-${String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

export default function PracticeZone() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tests, setTests] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const totalQuestions = Number(form.totalQuestions);
  const durationMinutes = Number(form.durationMinutes);
  const marksPerQuestion = Number(form.marksPerQuestion);

  const totalMarks =
    totalQuestions > 0 && marksPerQuestion > 0
      ? Number((totalQuestions * marksPerQuestion).toFixed(2))
      : 0;

  const stats = useMemo(() => ({
    total: tests.length,
    published: tests.filter((item) => item.status === "Published").length,
    draft: tests.filter((item) => item.status === "Draft").length,
    archived: tests.filter((item) => item.status === "Archived").length,
  }), [tests]);

  const filteredTests = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return tests.filter((test) => {
      const matchesSearch =
        !keyword ||
        test.title?.toLowerCase().includes(keyword) ||
        test.course_id?.courseTitle?.toLowerCase().includes(keyword) ||
        test.subject_id?.subjectName?.toLowerCase().includes(keyword);

      const matchesStatus =
        !statusFilter || test.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tests, search, statusFilter]);

  const totalPages = Math.max(
    Math.ceil(filteredTests.length / PAGE_SIZE),
    1
  );

  const visibleTests = filteredTests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);

    try {
      const response = await getCourses({
        page: 1,
        limit: 100,
      });

      setCourses(getArray(response, ["courses"]));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page: 1,
        limit: 100,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await getPracticeTests(params);
      const root = unwrap(response);
      const data = root?.data ?? root;

      setTests(Array.isArray(data?.tests) ? data.tests : []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const loadSubjectsForCourse = async (courseId) => {
    setSubjects([]);
    setForm((current) => ({
      ...current,
      course_id: courseId,
      subject_id: "",
    }));

    if (!courseId) return;

    setLoadingSubjects(true);
    setError("");

    try {
      const courseResponse = await getCourse(courseId);
      const root = unwrap(courseResponse);
      const course = root?.data?.course ?? root?.data ?? root;

      let linkedSubjects = [];

      if (Array.isArray(course?.subjects)) {
        const ids = course.subjects.map((item) =>
          String(getId(item))
        );

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

      setSubjects(
        linkedSubjects.filter(
          (subject) => subject.status === "Active"
        )
      );

      if (!linkedSubjects.length) {
        setError(
          "No linked subjects found. Add subjects to this course first."
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSubjects([]);
    setEditingId("");
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const openEdit = async (test) => {
    setError("");
    setSuccess("");
    setEditingId(test._id);
    setFormOpen(true);

    setForm({
      title: test.title || "",
      description: test.description || "",
      course_id: String(getId(test.course_id) || ""),
      subject_id: String(getId(test.subject_id) || ""),
      totalQuestions: String(test.totalQuestions ?? 10),
      durationMinutes: String(test.durationMinutes ?? 20),
      marksPerQuestion: String(test.marksPerQuestion ?? 1),
    });

    await loadSubjectsForEdit(
      String(getId(test.course_id) || ""),
      String(getId(test.subject_id) || "")
    );
  };

  const loadSubjectsForEdit = async (courseId, selectedSubjectId) => {
    if (!courseId) return;

    setLoadingSubjects(true);

    try {
      const courseResponse = await getCourse(courseId);
      const root = unwrap(courseResponse);
      const course = root?.data?.course ?? root?.data ?? root;

      let linkedSubjects = [];

      if (Array.isArray(course?.subjects)) {
        const ids = course.subjects.map((item) =>
          String(getId(item))
        );

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

      // Include the selected subject if it is still active.
      if (
        selectedSubjectId &&
        !linkedSubjects.some(
          (subject) => String(subject._id) === selectedSubjectId
        )
      ) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });

        const allSubjects = getArray(response, ["subjects"]);
        const selected = allSubjects.find(
          (subject) => String(subject._id) === selectedSubjectId
        );

        if (selected) linkedSubjects.push(selected);
      }

      setSubjects(
        linkedSubjects.filter(
          (subject) => subject.status === "Active"
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      return "Please enter a test title.";
    }

    if (!form.course_id || !form.subject_id) {
      return "Please select a course and subject.";
    }

    if (
      !Number.isInteger(totalQuestions) ||
      totalQuestions < 1 ||
      totalQuestions > 500
    ) {
      return "Questions must be between 1 and 500.";
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1 ||
      durationMinutes > 300
    ) {
      return "Duration must be between 1 and 300 minutes.";
    }

    if (
      !Number.isFinite(marksPerQuestion) ||
      marksPerQuestion <= 0
    ) {
      return "Marks per question must be greater than zero.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      course_id: form.course_id,
      subject_id: form.subject_id,
      totalQuestions,
      durationMinutes,
      marksPerQuestion,
    };

    setSaving(true);

    try {
      if (editingId) {
        await updatePracticeTest(editingId, payload);
        setSuccess("Practice test updated successfully.");
      } else {
        await createPracticeTest(payload);
        setSuccess("Practice test created successfully as Draft.");
      }

      resetForm();
      setPage(1);
      await loadTests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (test, status) => {
    const action =
      status === "Published"
        ? "publish"
        : status === "Archived"
          ? "archive"
          : "move back to Draft";

    if (!window.confirm(`Are you sure you want to ${action} this test?`)) {
      return;
    }

    setError("");
    setSuccess("");
    setActionId(test._id);

    try {
      await updatePracticeTestStatus(test._id, status);
      setSuccess(`Practice test ${action}ed successfully.`);
      await loadTests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (test) => {
    if (
      !window.confirm(
        `Delete "${test.title}" permanently? Tests with student attempts cannot be deleted.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setActionId(test._id);

    try {
      await deletePracticeTest(test._id);
      setSuccess("Practice test deleted successfully.");
      await loadTests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="practice-page">
      <header className="practice-page-header">
        <div>
          <span className="practice-eyebrow">PRACTICE / MANAGEMENT</span>
          <h1>Practice Zone</h1>
          <p>
            Create and manage practice tests using your existing Subject Question Bank.
          </p>
        </div>

        <div className="practice-header-actions">
          <button
            type="button"
            className="practice-secondary-btn"
            onClick={loadTests}
            disabled={loading}
          >
            <FiRefreshCw /> Refresh
          </button>

          <button
            type="button"
            className="practice-primary-btn"
            onClick={openCreate}
          >
            <FiPlus /> Create Practice Test
          </button>
        </div>
      </header>

      {error && (
        <div className="practice-alert practice-alert-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            <FiX />
          </button>
        </div>
      )}

      {success && (
        <div className="practice-alert practice-alert-success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss"
          >
            <FiX />
          </button>
        </div>
      )}

      <section className="practice-stats-grid">
        <article className="practice-stat-card">
          <span className="practice-stat-icon"><FiFileText /></span>
          <div>
            <small>Total Tests</small>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="practice-stat-card">
          <span className="practice-stat-icon practice-stat-green"><FiCheckCircle /></span>
          <div>
            <small>Published</small>
            <strong>{stats.published}</strong>
          </div>
        </article>

        <article className="practice-stat-card">
          <span className="practice-stat-icon practice-stat-orange"><FiEdit2 /></span>
          <div>
            <small>Draft</small>
            <strong>{stats.draft}</strong>
          </div>
        </article>

        <article className="practice-stat-card">
          <span className="practice-stat-icon practice-stat-grey"><FiArchive /></span>
          <div>
            <small>Archived</small>
            <strong>{stats.archived}</strong>
          </div>
        </article>
      </section>

      {formOpen && (
        <section className="practice-card practice-form-card">
          <div className="practice-section-heading">
            <div>
              <span className="practice-eyebrow">
                {editingId ? "EDIT PRACTICE TEST" : "NEW PRACTICE TEST"}
              </span>
              <h2>{editingId ? "Edit Practice Test" : "Create Practice Test"}</h2>
              <p>
                Questions will be randomly selected from the selected subject when a student starts an attempt.
              </p>
            </div>

            <button
              type="button"
              className="practice-icon-btn"
              onClick={resetForm}
              aria-label="Close form"
            >
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="practice-form-grid">
              <label className="practice-field practice-field-wide">
                Test Title <span>*</span>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="Example: HTML Fundamentals Practice"
                  required
                />
              </label>

              <label className="practice-field practice-field-wide">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={1000}
                  placeholder="Enter a short description..."
                />
              </label>

              <label className="practice-field">
                Select Course <span>*</span>
                <select
                  value={form.course_id}
                  onChange={(event) =>
                    loadSubjectsForCourse(event.target.value)
                  }
                  disabled={loadingCourses || loadingSubjects || saving}
                  required
                >
                  <option value="">
                    {loadingCourses ? "Loading courses..." : "Select course"}
                  </option>

                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.courseTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="practice-field">
                Select Subject <span>*</span>
                <select
                  name="subject_id"
                  value={form.subject_id}
                  onChange={handleChange}
                  disabled={!form.course_id || loadingSubjects || saving}
                  required
                >
                  <option value="">
                    {loadingSubjects ? "Loading subjects..." : "Select subject"}
                  </option>

                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.subjectName}
                      {subject.subjectCode ? ` (${subject.subjectCode})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="practice-field">
                Number of Questions <span>*</span>
                <input
                  type="number"
                  name="totalQuestions"
                  min="1"
                  max="500"
                  step="1"
                  value={form.totalQuestions}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="practice-field">
                Duration (Minutes) <span>*</span>
                <input
                  type="number"
                  name="durationMinutes"
                  min="1"
                  max="300"
                  step="1"
                  value={form.durationMinutes}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="practice-field">
                Marks per Question <span>*</span>
                <input
                  type="number"
                  name="marksPerQuestion"
                  min="0.01"
                  max="1000"
                  step="any"
                  value={form.marksPerQuestion}
                  onChange={handleChange}
                  required
                />
              </label>

              <div className="practice-calculated-card">
                <span>Total Marks</span>
                <strong>{totalMarks || "—"}</strong>
                <small>Automatically calculated</small>
              </div>
            </div>

            <div className="practice-form-note">
              <FiBookOpen />
              <span>
                Make sure the selected subject has enough MCQs in its Question Bank.
                The backend checks the available question count before saving and publishing.
              </span>
            </div>

            <div className="practice-form-actions">
              <button
                type="button"
                className="practice-secondary-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="practice-primary-btn"
                disabled={
                  saving ||
                  loadingSubjects ||
                  !form.course_id ||
                  !form.subject_id ||
                  totalMarks <= 0
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Test"
                    : "Create Draft"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="practice-card">
        <div className="practice-section-heading practice-list-heading">
          <div>
            <h2>Practice Tests</h2>
            <p>{filteredTests.length} test(s) found</p>
          </div>

          <div className="practice-list-filters">
            <label className="practice-search">
              <FiSearch />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tests..."
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="practice-table-wrap">
          <table className="practice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Test</th>
                <th>Course / Subject</th>
                <th>Questions</th>
                <th>Duration</th>
                <th>Total Marks</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="practice-empty">
                    Loading practice tests...
                  </td>
                </tr>
              ) : visibleTests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="practice-empty">
                    No practice tests found.
                  </td>
                </tr>
              ) : (
                visibleTests.map((test, index) => (
                  <tr key={test._id}>
                    <td>{(page - 1) * PAGE_SIZE + index + 1}</td>

                    <td>
                      <strong>{test.title}</strong>
                      {test.description && (
                        <small className="practice-description">
                          {test.description}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>{test.course_id?.courseTitle || "—"}</strong>
                      <small className="practice-description">
                        {test.subject_id?.subjectName || "—"}
                      </small>
                    </td>

                    <td>{test.totalQuestions}</td>
                    <td>{test.durationMinutes} min</td>
                    <td>{test.totalMarks}</td>

                    <td>
                      <span className={getStatusClass(test.status)}>
                        {test.status}
                      </span>
                    </td>

                    <td>{formatDate(test.createdAt)}</td>

                    <td>
                      <div className="practice-row-actions">
                        <button
                          type="button"
                          className="practice-icon-btn"
                          title="Edit test"
                          onClick={() => openEdit(test)}
                          disabled={
                            Boolean(actionId) ||
                            saving
                          }
                        >
                          <FiEdit2 />
                        </button>

                        {test.status !== "Published" && (
                          <button
                            type="button"
                            className="practice-icon-btn practice-action-publish"
                            title="Publish test"
                            onClick={() =>
                              handleStatusChange(test, "Published")
                            }
                            disabled={actionId === test._id}
                          >
                            <FiCheckCircle />
                          </button>
                        )}

                        {test.status === "Published" && (
                          <button
                            type="button"
                            className="practice-icon-btn"
                            title="Move to Draft"
                            onClick={() =>
                              handleStatusChange(test, "Draft")
                            }
                            disabled={actionId === test._id}
                          >
                            <FiFileText />
                          </button>
                        )}

                        {test.status !== "Archived" && (
                          <button
                            type="button"
                            className="practice-icon-btn"
                            title="Archive test"
                            onClick={() =>
                              handleStatusChange(test, "Archived")
                            }
                            disabled={actionId === test._id}
                          >
                            <FiArchive />
                          </button>
                        )}

                        <button
                          type="button"
                          className="practice-icon-btn practice-action-delete"
                          title="Delete test"
                          onClick={() => handleDelete(test)}
                          disabled={actionId === test._id}
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

        <div className="practice-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              type="button"
              className="practice-secondary-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <button
              type="button"
              className="practice-secondary-btn"
              disabled={page >= totalPages || loading}
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
