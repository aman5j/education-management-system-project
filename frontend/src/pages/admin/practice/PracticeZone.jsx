import { useCallback, useEffect, useState } from "react";
import {
  FiArchive,
  FiBookOpen,
  FiCheckCircle,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
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

import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/PracticeZone.css";

const DEFAULT_LIMIT = 10;

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

  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  return [];
};

const getId = (value) =>
  typeof value === "object" ? value?._id : value;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClass = (status) =>
  `practice-status practice-status-${String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

const getInitialStats = () => ({
  total: 0,
  published: 0,
  draft: 0,
  archived: 0,
});

export default function PracticeZone() {
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tests, setTests] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  });

  const [stats, setStats] = useState(getInitialStats);

  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");

  const [error, setError] = useState("");

  const totalQuestions = Number(form.totalQuestions);
  const durationMinutes = Number(form.durationMinutes);
  const marksPerQuestion = Number(form.marksPerQuestion);

  const totalMarks =
    totalQuestions > 0 &&
    marksPerQuestion > 0 &&
    Number.isFinite(totalQuestions * marksPerQuestion)
      ? Number((totalQuestions * marksPerQuestion).toFixed(2))
      : 0;

  // ---------------------------------------------------------
  // LOAD COURSES
  // ---------------------------------------------------------

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);

    try {
      const response = await getCourses({
        page: 1,
        limit: 100,
      });

      setCourses(getArray(response, ["courses"]));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // ---------------------------------------------------------
  // LOAD PRACTICE TESTS
  // Server-side pagination and search
  // ---------------------------------------------------------

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await getPracticeTests(params);
      const root = unwrap(response);
      const data = root?.data ?? root;

      setTests(Array.isArray(data?.tests) ? data.tests : []);

      setPagination({
        page: Number(data?.pagination?.page) || page,
        limit: Number(data?.pagination?.limit) || limit,
        total: Number(data?.pagination?.total) || 0,
        totalPages: Number(data?.pagination?.totalPages) || 0,
      });

      setStats({
        total: Number(data?.stats?.total) || 0,
        published: Number(data?.stats?.published) || 0,
        draft: Number(data?.stats?.draft) || 0,
        archived: Number(data?.stats?.archived) || 0,
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setTests([]);
      setPagination({
        page,
        limit,
        total: 0,
        totalPages: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  // If the last record on the current page is deleted,
  // move back to the last page that still exists.
  useEffect(() => {
    const lastPage = Math.max(pagination.totalPages, 1);

    if (page > lastPage) {
      setPage(lastPage);
    }
  }, [page, pagination.totalPages]);

  // ---------------------------------------------------------
  // COURSE / SUBJECT HANDLING
  // ---------------------------------------------------------

  const loadSubjectsForCourse = async (courseId) => {
    setSubjects([]);

    setForm((current) => ({
      ...current,
      course_id: courseId,
      subject_id: "",
    }));

    if (!courseId) {
      return;
    }

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

        if (
          course.subjects.some(
            (item) => typeof item === "object"
          )
        ) {
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

      const activeSubjects = linkedSubjects.filter(
        (subject) => subject.status === "Active"
      );

      setSubjects(activeSubjects);

      if (!activeSubjects.length) {
        setError(
          "No active linked subjects found. Add subjects to this course first."
        );
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadSubjectsForEdit = async (
    courseId,
    selectedSubjectId
  ) => {
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

        if (
          course.subjects.some(
            (item) => typeof item === "object"
          )
        ) {
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

      // Keep the selected subject available when editing,
      // provided it is still active.
      if (
        selectedSubjectId &&
        !linkedSubjects.some(
          (subject) =>
            String(subject._id) === String(selectedSubjectId)
        )
      ) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });

        const allSubjects = getArray(response, ["subjects"]);

        const selectedSubject = allSubjects.find(
          (subject) =>
            String(subject._id) === String(selectedSubjectId)
        );

        if (selectedSubject) {
          linkedSubjects.push(selectedSubject);
        }
      }

      setSubjects(
        linkedSubjects.filter(
          (subject) => subject.status === "Active"
        )
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ---------------------------------------------------------
  // FORM HANDLING
  // ---------------------------------------------------------

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSubjects([]);
    setEditingId("");
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setError("");
    setFormOpen(true);
  };

  const openEdit = async (test) => {
    setError("");
    setEditingId(test._id);
    setFormOpen(true);

    const courseId = String(getId(test.course_id) || "");
    const subjectId = String(getId(test.subject_id) || "");

    setForm({
      title: test.title || "",
      description: test.description || "",
      course_id: courseId,
      subject_id: subjectId,
      totalQuestions: String(test.totalQuestions ?? 10),
      durationMinutes: String(test.durationMinutes ?? 20),
      marksPerQuestion: String(test.marksPerQuestion ?? 1),
    });

    await loadSubjectsForEdit(courseId, subjectId);
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

    if (form.title.trim().length > 150) {
      return "Test title cannot exceed 150 characters.";
    }

    if (form.description.length > 1000) {
      return "Description cannot exceed 1000 characters.";
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
      marksPerQuestion <= 0 ||
      marksPerQuestion > 1000
    ) {
      return "Marks per question must be greater than zero.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      notification.warning(validationError);
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
        notification.success(
          "Practice test updated successfully."
        );
      } else {
        await createPracticeTest(payload);
        notification.success(
          "Practice test created successfully as Draft."
        );
      }

      resetForm();
      setPage(1);

      // The page state change triggers the list reload.
      // If already on page 1, explicitly reload.
      if (page === 1) {
        await loadTests();
      }
    } catch (err) {
      notification.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------
  // STATUS ACTIONS
  // ---------------------------------------------------------

  const handleStatusChange = async (test, status) => {
    let confirmed = false;
    let actionLabel = "";

    if (status === "Published") {
      confirmed = await notification.confirmPublish(
        `"${test.title}"`
      );
      actionLabel = "published";
    } else if (status === "Archived") {
      confirmed = await notification.confirmArchive(
        `"${test.title}"`
      );
      actionLabel = "archived";
    } else {
      confirmed = await notification.confirm({
        title: "Move test back to Draft?",
        text: `"${test.title}" will no longer be available to students.`,
        icon: "question",
        confirmText: "Yes, move to Draft",
        confirmButtonColor: "#d97706",
      });
      actionLabel = "moved to Draft";
    }

    if (!confirmed) return;

    setError("");
    setActionId(test._id);

    try {
      await updatePracticeTestStatus(test._id, status);

      notification.success(
        `Practice test ${actionLabel} successfully.`
      );

      await loadTests();
    } catch (err) {
      notification.error(getApiErrorMessage(err));
    } finally {
      setActionId("");
    }
  };

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------

  const handleDelete = async (test) => {
    const confirmed = await notification.confirmDelete(
      `"${test.title}"`
    );

    if (!confirmed) return;

    setError("");
    setActionId(test._id);

    try {
      await deletePracticeTest(test._id);

      notification.success(
        "Practice test deleted successfully."
      );

      await loadTests();
    } catch (err) {
      notification.error(getApiErrorMessage(err));
    } finally {
      setActionId("");
    }
  };

  // ---------------------------------------------------------
  // SEARCH / FILTER / PAGINATION
  // ---------------------------------------------------------

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleRefresh = () => {
    loadTests();
  };

  const totalPages = Math.max(pagination.totalPages, 1);

  return (
    <main className="practice-page">
      <header className="practice-page-header">
        <div>
          <span className="practice-eyebrow">
            PRACTICE / MANAGEMENT
          </span>

          <h1>Practice Zone</h1>

          <p>
            Create and manage practice tests using your existing
            Subject Question Bank.
          </p>
        </div>

        <div className="practice-header-actions">
          <button
            type="button"
            className="practice-secondary-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="practice-primary-btn"
            onClick={openCreate}
            disabled={saving}
          >
            <FiPlus />
            Create Practice Test
          </button>
        </div>
      </header>

      {error && (
        <div
          className="practice-alert practice-alert-error"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* DATABASE-WIDE STATISTICS */}
      <section className="practice-stats-grid">
        <article className="practice-stat-card">
          <span className="practice-stat-icon">
            <FiFileText />
          </span>

          <div>
            <small>Total Tests</small>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article className="practice-stat-card">
          <span className="practice-stat-icon practice-stat-green">
            <FiCheckCircle />
          </span>

          <div>
            <small>Published</small>
            <strong>{stats.published}</strong>
          </div>
        </article>

        <article className="practice-stat-card">
          <span className="practice-stat-icon practice-stat-orange">
            <FiEdit2 />
          </span>

          <div>
            <small>Draft</small>
            <strong>{stats.draft}</strong>
          </div>
        </article>

        <article className="practice-stat-card">
          <span className="practice-stat-icon practice-stat-grey">
            <FiArchive />
          </span>

          <div>
            <small>Archived</small>
            <strong>{stats.archived}</strong>
          </div>
        </article>
      </section>

      {/* CREATE / EDIT FORM */}
      {formOpen && (
        <section className="practice-card practice-form-card">
          <div className="practice-section-heading">
            <div>
              <span className="practice-eyebrow">
                {editingId
                  ? "EDIT PRACTICE TEST"
                  : "NEW PRACTICE TEST"}
              </span>

              <h2>
                {editingId
                  ? "Edit Practice Test"
                  : "Create Practice Test"}
              </h2>

              <p>
                Questions will be randomly selected from the
                selected subject when a student starts an attempt.
              </p>
            </div>

            <button
              type="button"
              className="practice-icon-btn"
              onClick={resetForm}
              aria-label="Close form"
              disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
                />
              </label>

              <label className="practice-field">
                Select Course <span>*</span>

                <select
                  value={form.course_id}
                  onChange={(event) =>
                    loadSubjectsForCourse(event.target.value)
                  }
                  disabled={
                    loadingCourses ||
                    loadingSubjects ||
                    saving
                  }
                  required
                >
                  <option value="">
                    {loadingCourses
                      ? "Loading courses..."
                      : "Select course"}
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course._id}
                      value={course._id}
                    >
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
                  disabled={
                    !form.course_id ||
                    loadingSubjects ||
                    saving
                  }
                  required
                >
                  <option value="">
                    {loadingSubjects
                      ? "Loading subjects..."
                      : "Select subject"}
                  </option>

                  {subjects.map((subject) => (
                    <option
                      key={subject._id}
                      value={subject._id}
                    >
                      {subject.subjectName}
                      {subject.subjectCode
                        ? ` (${subject.subjectCode})`
                        : ""}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                Make sure the selected subject has enough MCQs in
                its Question Bank. The backend checks the available
                question count before saving and publishing.
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

      {/* PRACTICE TEST LIST */}
      <section className="practice-card">
        <div className="practice-section-heading practice-list-heading">
          <div>
            <h2>Practice Tests</h2>

            <p>
              {loading
                ? "Loading practice tests..."
                : `${pagination.total} test(s) found`}
            </p>
          </div>

          <div className="practice-list-filters">
            <label className="practice-search">
              <FiSearch />

              <input
                type="search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search title, course or subject..."
                aria-label="Search practice tests"
              />
            </label>

            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
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
                  <td
                    colSpan="9"
                    className="practice-empty"
                  >
                    Loading practice tests...
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="practice-empty"
                  >
                    {search.trim() || statusFilter
                      ? "No practice tests match your search or filter."
                      : "No practice tests found. Create your first practice test."}
                  </td>
                </tr>
              ) : (
                tests.map((test, index) => (
                  <tr key={test._id}>
                    <td>
                      {(page - 1) * limit + index + 1}
                    </td>

                    <td>
                      <strong>{test.title}</strong>

                      {test.description && (
                        <small className="practice-description">
                          {test.description}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {test.course_id?.courseTitle || "—"}
                      </strong>

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
                          aria-label={`Edit ${test.title}`}
                          onClick={() => openEdit(test)}
                          disabled={
                            Boolean(actionId) ||
                            saving ||
                            loading
                          }
                        >
                          <FiEdit2 />
                        </button>

                        {test.status !== "Published" && (
                          <button
                            type="button"
                            className="practice-icon-btn practice-action-publish"
                            title="Publish test"
                            aria-label={`Publish ${test.title}`}
                            onClick={() =>
                              handleStatusChange(
                                test,
                                "Published"
                              )
                            }
                            disabled={
                              Boolean(actionId) ||
                              saving ||
                              loading
                            }
                          >
                            <FiCheckCircle />
                          </button>
                        )}

                        {test.status === "Published" && (
                          <button
                            type="button"
                            className="practice-icon-btn"
                            title="Move to Draft"
                            aria-label={`Move ${test.title} to Draft`}
                            onClick={() =>
                              handleStatusChange(test, "Draft")
                            }
                            disabled={
                              Boolean(actionId) ||
                              saving ||
                              loading
                            }
                          >
                            <FiEdit2 />
                          </button>
                        )}

                        {test.status !== "Archived" && (
                          <button
                            type="button"
                            className="practice-icon-btn"
                            title="Archive test"
                            aria-label={`Archive ${test.title}`}
                            onClick={() =>
                              handleStatusChange(
                                test,
                                "Archived"
                              )
                            }
                            disabled={
                              Boolean(actionId) ||
                              saving ||
                              loading
                            }
                          >
                            <FiArchive />
                          </button>
                        )}

                        <button
                          type="button"
                          className="practice-icon-btn practice-action-delete"
                          title="Delete test"
                          aria-label={`Delete ${test.title}`}
                          onClick={() => handleDelete(test)}
                          disabled={
                            Boolean(actionId) ||
                            saving ||
                            loading
                          }
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

        <Pagination
          page={page}
          totalPages={totalPages}
          total={pagination.total}
          itemCount={tests.length}
          itemLabel="practice tests"
          limit={limit}
          loading={loading}
          onPageChange={setPage}
          onLimitChange={handleLimitChange}
        />
      </section>
    </main>
  );
}