
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";

import { getCourses } from "../../../services/courseService";
import { getBatches } from "../../../services/batchService";
import { getSubjects } from "../../../services/subjectService";
import {
  getExams,
  createExam,
  updateExam,
  deleteExam,
} from "../../../services/examService";

import "../../../styles/ExamSchedule.css";

const PAGE_SIZE = 10;

const EMPTY_FORM = {
  examName: "",
  course_id: "",
  batch_id: "",
  subject_id: "",
  examType: "Theory",
  examDate: "",
  startTime: "10:00",
  endTime: "12:00",
  durationMinutes: 120,
  totalMarks: 100,
  passingMarks: 40,
  room: "",
  instructions: "",
  status: "Scheduled",
};

const getList = (response, keys = []) => {
  const root = response?.data ?? response;
  const data = root?.data ?? root;

  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

const getId = (value) =>
  typeof value === "object" ? value?._id : value;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
};

const getDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const getExamForm = (exam) => ({
  examName: exam.examName || "",
  course_id: getId(exam.course_id) || "",
  batch_id: getId(exam.batch_id) || "",
  subject_id: getId(exam.subject_id) || "",
  examType: exam.examType || "Theory",
  examDate: getDateInput(exam.examDate),
  startTime: exam.startTime || "10:00",
  endTime: exam.endTime || "12:00",
  durationMinutes: exam.durationMinutes ?? 120,
  totalMarks: exam.totalMarks ?? 100,
  passingMarks: exam.passingMarks ?? 40,
  room: exam.room || "",
  instructions: exam.instructions || "",
  status: exam.status || "Scheduled",
});

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

export default function ExamSchedule() {
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [viewExam, setViewExam] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setOptionsLoading(true);

      try {
        const [courseResponse, batchResponse, subjectResponse] =
          await Promise.all([
            getCourses({ page: 1, limit: 100 }),
            getBatches({ page: 1, limit: 100 }),
            getSubjects({ page: 1, limit: 100 }),
          ]);

        if (cancelled) return;

        setCourses(getList(courseResponse, ["courses"]));
        setBatches(getList(batchResponse, ["batches"]));
        setSubjects(getList(subjectResponse, ["subjects"]));
      } catch (err) {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Unable to load course, batch, and subject options.")
          );
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

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        search: search.trim(),
        course_id: filterCourse,
        batch_id: filterBatch,
        subject_id: filterSubject,
        status: filterStatus,
        from,
        to,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const response = await getExams(params);
      const payload = response?.data?.data ?? {};

      setExams(
        Array.isArray(payload.exams) ? payload.exams : []
      );

      setPagination(
        payload.pagination || { total: 0, totalPages: 0 }
      );
    } catch (err) {
      setExams([]);
      setError(getErrorMessage(err, "Unable to load exam schedules."));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    filterCourse,
    filterBatch,
    filterSubject,
    filterStatus,
    from,
    to,
  ]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const formBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          !form.course_id ||
          getId(batch.course_id) === form.course_id
      ),
    [batches, form.course_id]
  );

  const formSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          (!form.course_id ||
            getId(subject.course_id) === form.course_id) &&
          subject.status === "Active"
      ),
    [subjects, form.course_id]
  );

  const filterBatches = useMemo(
    () =>
      batches.filter(
        (batch) =>
          !filterCourse ||
          getId(batch.course_id) === filterCourse
      ),
    [batches, filterCourse]
  );

  const filterSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          !filterCourse ||
          getId(subject.course_id) === filterCourse
      ),
    [subjects, filterCourse]
  );

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId("");
    setFormError("");
    setFormOpen(false);
  };

  const openCreate = () => {
    setNotice("");
    setError("");
    setViewExam(null);
    setEditingId("");
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (exam) => {
    setNotice("");
    setError("");
    setViewExam(null);
    setEditingId(exam._id);
    setForm(getExamForm(exam));
    setFormError("");
    setFormOpen(true);
  };

  const changeForm = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "course_id") {
        next.batch_id = "";
        next.subject_id = "";
      }

      if (name === "batch_id") {
        next.subject_id = "";
      }

      return next;
    });

    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    setError("");
    setNotice("");

    if (form.startTime >= form.endTime) {
      setFormError("End time must be later than start time.");
      return;
    }

    if (Number(form.passingMarks) > Number(form.totalMarks)) {
      setFormError("Passing marks cannot exceed total marks.");
      return;
    }

    const payload = {
      ...form,
      durationMinutes: Number(form.durationMinutes),
      totalMarks: Number(form.totalMarks),
      passingMarks: Number(form.passingMarks),
    };

    setSaving(true);

    try {
      if (editingId) {
        await updateExam(editingId, payload);
        setNotice("Exam schedule updated successfully.");
      } else {
        await createExam(payload);
        setNotice("Exam scheduled successfully.");
      }

      resetForm();
      setPage(1);
      await loadExams();
    } catch (err) {
      setFormError(
        getErrorMessage(err, "Unable to save the exam schedule.")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam) => {
    if (!window.confirm(`Delete "${exam.examName}"? This cannot be undone.`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await deleteExam(exam._id);
      setNotice("Exam schedule deleted successfully.");

      if (exams.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await loadExams();
      }
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete the exam schedule."));
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilterCourse("");
    setFilterBatch("");
    setFilterSubject("");
    setFilterStatus("");
    setFrom("");
    setTo("");
    setPage(1);
    setNotice("");
  };

  const countLabel =
    pagination.total === 1 ? "exam" : "exams";

  return (
    <div className="exam-page">
      <header className="exam-page-header">
        <div>
          <span className="exam-eyebrow">ASSESSMENT MANAGEMENT</span>
          <h1>Exam Schedule</h1>
          <p>Create and manage examinations for your courses and batches.</p>
        </div>

        <button
          type="button"
          className="exam-primary-btn"
          onClick={openCreate}
        >
          <FiPlus aria-hidden="true" />
          Schedule Exam
        </button>
      </header>

      {error && (
        <div className="exam-alert exam-alert-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
            <FiX />
          </button>
        </div>
      )}

      {notice && (
        <div className="exam-alert exam-alert-success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            <FiX />
          </button>
        </div>
      )}

      {formOpen && (
        <section className="exam-card exam-form-card">
          <div className="exam-section-heading">
            <div>
              <h2>{editingId ? "Edit Exam Schedule" : "Schedule New Exam"}</h2>
              <p>Fields marked * are required.</p>
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

          {formError && (
            <div className="exam-alert exam-alert-error" role="alert">
              {formError}
            </div>
          )}

          {optionsLoading ? (
            <div className="exam-empty">Loading course options...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="exam-form-grid">
                <label className="exam-field exam-field-wide">
                  Exam name *
                  <input
                    name="examName"
                    value={form.examName}
                    onChange={changeForm}
                    required
                    minLength={2}
                    maxLength={150}
                    placeholder="e.g. MERN Stack Mid-Term Examination"
                  />
                </label>

                <label className="exam-field">
                  Course *
                  <select name="course_id" value={form.course_id} onChange={changeForm} required>
                    <option value="">Select course</option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.courseTitle}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="exam-field">
                  Batch *
                  <select
                    name="batch_id"
                    value={form.batch_id}
                    onChange={changeForm}
                    required
                    disabled={!form.course_id}
                  >
                    <option value="">Select batch</option>
                    {formBatches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.batch_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="exam-field">
                  Subject *
                  <select
                    name="subject_id"
                    value={form.subject_id}
                    onChange={changeForm}
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

                <label className="exam-field">
                  Exam type *
                  <select name="examType" value={form.examType} onChange={changeForm} required>
                    {["Theory", "Practical", "Oral", "Online"].map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="exam-field">
                  Exam date *
                  <input
                    type="date"
                    name="examDate"
                    value={form.examDate}
                    onChange={changeForm}
                    required
                  />
                </label>

                <label className="exam-field">
                  Start time *
                  <input
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={changeForm}
                    required
                  />
                </label>

                <label className="exam-field">
                  End time *
                  <input
                    type="time"
                    name="endTime"
                    value={form.endTime}
                    onChange={changeForm}
                    required
                  />
                </label>

                <label className="exam-field">
                  Duration (minutes) *
                  <input
                    type="number"
                    name="durationMinutes"
                    min="1"
                    max="1440"
                    value={form.durationMinutes}
                    onChange={changeForm}
                    required
                  />
                </label>

                <label className="exam-field">
                  Total marks *
                  <input
                    type="number"
                    name="totalMarks"
                    min="1"
                    step="1"
                    value={form.totalMarks}
                    onChange={changeForm}
                    required
                  />
                </label>

                <label className="exam-field">
                  Passing marks *
                  <input
                    type="number"
                    name="passingMarks"
                    min="0"
                    step="1"
                    value={form.passingMarks}
                    onChange={changeForm}
                    required
                  />
                </label>

                <label className="exam-field">
                  Room / venue
                  <input
                    name="room"
                    value={form.room}
                    onChange={changeForm}
                    maxLength={100}
                    placeholder="e.g. Room 101"
                  />
                </label>

                <label className="exam-field">
                  Status *
                  <select name="status" value={form.status} onChange={changeForm} required>
                    {["Scheduled", "Completed", "Cancelled"].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>

                <label className="exam-field exam-field-wide">
                  Instructions
                  <textarea
                    name="instructions"
                    value={form.instructions}
                    onChange={changeForm}
                    maxLength={2000}
                    rows={3}
                    placeholder="Enter exam instructions for students..."
                  />
                </label>
              </div>

              <div className="exam-form-actions">
                <button type="button" className="exam-secondary-btn" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="exam-primary-btn" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Schedule"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="exam-card">
        <div className="exam-section-heading">
          <div>
            <h2>Scheduled Examinations</h2>
            <p>
              {pagination.total} {countLabel} found
            </p>
          </div>

          <button
            type="button"
            className="exam-secondary-btn"
            onClick={loadExams}
            disabled={loading}
          >
            <FiRefreshCw aria-hidden="true" />
            Refresh
          </button>
        </div>

        <div className="exam-filter-grid">
          <label className="exam-field">
            Search exam
            <input
              type="search"
              value={search}
              placeholder="Search by exam name"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="exam-field">
            Course
            <select
              value={filterCourse}
              onChange={(event) => {
                setFilterCourse(event.target.value);
                setFilterBatch("");
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

          <label className="exam-field">
            Batch
            <select
              value={filterBatch}
              onChange={(event) => {
                setFilterBatch(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All batches</option>
              {filterBatches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.batch_name}
                </option>
              ))}
            </select>
          </label>

          <label className="exam-field">
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

          <label className="exam-field">
            Status
            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {["Scheduled", "Completed", "Cancelled"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="exam-field">
            From date
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="exam-field">
            To date
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <div className="exam-filter-action">
            <button type="button" className="exam-secondary-btn" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        </div>

        <div className="exam-table-wrap">
          <table className="exam-table">
            <thead>
              <tr>
                <th>Exam</th>
                <th>Course / Subject</th>
                <th>Batch</th>
                <th>Date & time</th>
                <th>Duration</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="exam-empty">Loading exam schedules...</td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan="8" className="exam-empty">
                    <FiCalendar aria-hidden="true" />
                    <strong>No exam schedules found</strong>
                    <span>Change your filters or schedule a new exam.</span>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => (
                  <tr key={exam._id}>
                    <td>
                      <button
                        type="button"
                        className="exam-name-link"
                        onClick={() => setViewExam(exam)}
                      >
                        {exam.examName}
                      </button>
                      <span className="exam-subtext">{exam.examType}</span>
                    </td>

                    <td>
                      <strong>{exam.course_id?.courseTitle || "—"}</strong>
                      <span className="exam-subtext">
                        {exam.subject_id?.subjectName || "—"}
                        {exam.subject_id?.subjectCode
                          ? ` (${exam.subject_id.subjectCode})`
                          : ""}
                      </span>
                    </td>

                    <td>{exam.batch_id?.batch_name || "—"}</td>

                    <td>
                      <strong>{formatDate(exam.examDate)}</strong>
                      <span className="exam-subtext">
                        {exam.startTime}–{exam.endTime}
                      </span>
                    </td>

                    <td>{exam.durationMinutes} min</td>

                    <td>
                      <strong>{exam.totalMarks}</strong>
                      <span className="exam-subtext">
                        Pass: {exam.passingMarks}
                      </span>
                    </td>

                    <td>
                      <span className={`exam-status exam-status-${exam.status?.toLowerCase()}`}>
                        {exam.status}
                      </span>
                    </td>

                    <td>
                      <div className="exam-row-actions">
                        <button
                          type="button"
                          className="exam-icon-btn"
                          title="Edit exam"
                          aria-label={`Edit ${exam.examName}`}
                          onClick={() => openEdit(exam)}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          className="exam-icon-btn exam-icon-danger"
                          title="Delete exam"
                          aria-label={`Delete ${exam.examName}`}
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

        {!loading && pagination.totalPages > 0 && (
          <div className="exam-pagination">
            <span>
              Page {page} of {pagination.totalPages}
            </span>
            <div>
              <button
                type="button"
                className="exam-secondary-btn"
                disabled={page <= 1}
                onClick={() => setPage((previous) => previous - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="exam-secondary-btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((previous) => previous + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {viewExam && (
        <div
          className="exam-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setViewExam(null);
          }}
        >
          <section
            className="exam-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-detail-title"
          >
            <div className="exam-section-heading">
              <div>
                <span className="exam-eyebrow">EXAM DETAILS</span>
                <h2 id="exam-detail-title">{viewExam.examName}</h2>
              </div>
              <button
                type="button"
                className="exam-icon-btn"
                onClick={() => setViewExam(null)}
                aria-label="Close details"
              >
                <FiX />
              </button>
            </div>

            <dl className="exam-detail-grid">
              <div><dt>Course</dt><dd>{viewExam.course_id?.courseTitle || "—"}</dd></div>
              <div><dt>Batch</dt><dd>{viewExam.batch_id?.batch_name || "—"}</dd></div>
              <div><dt>Subject</dt><dd>{viewExam.subject_id?.subjectName || "—"}</dd></div>
              <div><dt>Subject code</dt><dd>{viewExam.subject_id?.subjectCode || "—"}</dd></div>
              <div><dt>Type</dt><dd>{viewExam.examType}</dd></div>
              <div><dt>Date</dt><dd>{formatDate(viewExam.examDate)}</dd></div>
              <div><dt>Time</dt><dd>{viewExam.startTime}–{viewExam.endTime}</dd></div>
              <div><dt>Duration</dt><dd>{viewExam.durationMinutes} minutes</dd></div>
              <div><dt>Total marks</dt><dd>{viewExam.totalMarks}</dd></div>
              <div><dt>Passing marks</dt><dd>{viewExam.passingMarks}</dd></div>
              <div><dt>Room / venue</dt><dd>{viewExam.room || "—"}</dd></div>
              <div><dt>Status</dt><dd>{viewExam.status}</dd></div>
              <div className="exam-detail-wide">
                <dt>Instructions</dt>
                <dd>{viewExam.instructions || "No instructions added."}</dd>
              </div>
            </dl>

            <div className="exam-form-actions">
              <button type="button" className="exam-secondary-btn" onClick={() => setViewExam(null)}>
                Close
              </button>
              <button type="button" className="exam-primary-btn" onClick={() => openEdit(viewExam)}>
                <FiEdit2 /> Edit Schedule
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
