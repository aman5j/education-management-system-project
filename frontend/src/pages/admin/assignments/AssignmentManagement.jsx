import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit2,
  FiFileText,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";

import { getCourses, getCourse } from "../../../services/courseService";
import { getSubjects } from "../../../services/subjectService";
import { getBatches } from "../../../services/batchService";

import {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  updateAssignmentStatus,
  deleteAssignment,
  addAssignmentAttachments,
  removeAssignmentAttachment,
  downloadAssignmentFile,
} from "../../../services/assignmentService";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import "./AssignmentManagement.css";

const EMPTY_FORM = {
  title: "",
  description: "",
  instructions: "",
  course_id: "",
  subject_id: "",
  batch_ids: [],
  total_marks: "100",
  assignedAt: "",
  dueAt: "",
  allowLateSubmission: false,
  allowResubmission: false,
};

const PAGE_SIZE = 10;

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getRoot = (response) =>
  response?.data?.data ?? response?.data ?? {};

const getArray = (response, key) => {
  const root = getRoot(response);
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.[key])) return root[key];
  if (Array.isArray(response?.data?.[key])) return response.data[key];
  return [];
};

const getId = (item) =>
  String(item?._id || item?.id || item || "");

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const formatSize = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "assignment-file";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

export default function AssignmentManagement() {
  const { user } = useAuth();

  const can = (action) =>
    user?.role === "admin" ||
    hasPermission(user, `assignments.${action}`);

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [loadingRelations, setLoadingRelations] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const stats = useMemo(() => ({
    total: pagination.total,
    drafts: assignments.filter((item) => item.status === "Draft").length,
    published: assignments.filter((item) => item.status === "Published").length,
    archived: assignments.filter((item) => item.status === "Archived").length,
  }), [assignments, pagination.total]);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, limit: PAGE_SIZE };

      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (courseFilter) params.course_id = courseFilter;

      const response = await getAssignments(params);
      const root = getRoot(response);

      setAssignments(
        Array.isArray(root.assignments) ? root.assignments : []
      );

      setPagination(
        root.pagination || { total: 0, totalPages: 1 }
      );
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, courseFilter]);

  const loadCourses = useCallback(async () => {
    try {
      const response = await getCourses({ page: 1, limit: 200 });
      setCourses(getArray(response, "courses"));
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, courseFilter]);

  const loadCourseRelations = async (
    courseId,
    selectedSubjectId = "",
    selectedBatchIds = []
  ) => {
    setSubjects([]);
    setBatches([]);

    if (!courseId) return;

    setLoadingRelations(true);

    try {
      const [courseResponse, batchResponse] = await Promise.all([
        getCourse(courseId),
        getBatches({ page: 1, limit: 200, course_id: courseId }),
      ]);

      const courseRoot = getRoot(courseResponse);
      const course = courseRoot.course || courseRoot;

      const linkedSubjects = Array.isArray(course?.subjects)
        ? course.subjects
        : [];

      let subjectList = linkedSubjects.filter(
        (item) => typeof item === "object"
      );

      if (
        linkedSubjects.length &&
        subjectList.length !== linkedSubjects.length
      ) {
        const subjectResponse = await getSubjects({
          page: 1,
          limit: 200,
          status: "Active",
        });

        const allSubjects = getArray(subjectResponse, "subjects");
        const linkedIds = linkedSubjects.map(getId);

        subjectList = allSubjects.filter((subject) =>
          linkedIds.includes(getId(subject))
        );
      }

      if (selectedSubjectId) {
        const subjectResponse = await getSubjects({
          page: 1,
          limit: 200,
          status: "Active",
        });

        const allSubjects = getArray(subjectResponse, "subjects");
        const selected = allSubjects.find(
          (subject) => getId(subject) === String(selectedSubjectId)
        );

        if (
          selected &&
          !subjectList.some((item) => getId(item) === getId(selected))
        ) {
          subjectList.push(selected);
        }
      }

      const batchList = getArray(batchResponse, "batches");

      setSubjects(
        subjectList.filter((subject) => subject.status === "Active")
      );
      setBatches(batchList);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoadingRelations(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setSelectedFiles([]);
    setSubjects([]);
    setBatches([]);
    setFormOpen(false);
  };

  const openCreate = () => {
    if (!can("create")) return;

    setError("");
    setSuccess("");
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      assignedAt: toDateTimeLocal(new Date()),
    });
    setSelectedFiles([]);
    setSubjects([]);
    setBatches([]);
    setFormOpen(true);
  };

  const openEdit = async (item) => {
    if (!can("update") || item.status !== "Draft") return;

    setError("");
    setSuccess("");

    try {
      const response = await getAssignment(item.id);
      const assignment = getRoot(response);

      setEditing(assignment);

      setForm({
        title: assignment.title || "",
        description: assignment.description || "",
        instructions: assignment.instructions || "",
        course_id: assignment.course?.id || "",
        subject_id: assignment.subject?.id || "",
        batch_ids: (assignment.batches || []).map((batch) =>
          String(batch.id)
        ),
        total_marks: String(assignment.total_marks ?? 100),
        assignedAt: toDateTimeLocal(assignment.assignedAt),
        dueAt: toDateTimeLocal(assignment.dueAt),
        allowLateSubmission: Boolean(assignment.allowLateSubmission),
        allowResubmission: Boolean(assignment.allowResubmission),
      });

      setSelectedFiles([]);
      setFormOpen(true);

      await loadCourseRelations(
        assignment.course?.id,
        assignment.subject?.id || "",
        (assignment.batches || []).map((batch) => String(batch.id))
      );
    } catch (err) {
      setError(getError(err));
    }
  };

  const handleCourseChange = async (courseId) => {
    setForm((current) => ({
      ...current,
      course_id: courseId,
      subject_id: "",
      batch_ids: [],
    }));

    await loadCourseRelations(courseId);
  };

  const toggleBatch = (batchId) => {
    setForm((current) => {
      const exists = current.batch_ids.includes(String(batchId));

      return {
        ...current,
        batch_ids: exists
          ? current.batch_ids.filter((id) => id !== String(batchId))
          : [...current.batch_ids, String(batchId)],
      };
    });
  };

  const validateForm = () => {
    if (form.title.trim().length < 2) {
      return "Please enter an assignment title (at least 2 characters).";
    }

    if (!form.course_id) {
      return "Please select a course.";
    }

    if (!form.total_marks || Number(form.total_marks) <= 0) {
      return "Total marks must be greater than zero.";
    }

    if (!form.assignedAt || !form.dueAt) {
      return "Please select the assigned date and due date.";
    }

    if (new Date(form.dueAt) <= new Date(form.assignedAt)) {
      return "Due date must be later than the assigned date.";
    }

    if (selectedFiles.length > 10) {
      return "You can upload a maximum of 10 files at a time.";
    }

    const maxSize = 20 * 1024 * 1024;
    const allowed = /\.(pdf|doc|docx|jpg|jpeg|png|webp|zip)$/i;

    for (const file of selectedFiles) {
      if (!allowed.test(file.name)) {
        return `Unsupported file type: ${file.name}`;
      }

      if (file.size > maxSize) {
        return `${file.name} exceeds the 20 MB file limit.`;
      }
    }

    return "";
  };

  const makePayload = () => {
    const data = new FormData();

    data.append("title", form.title.trim());
    data.append("description", form.description.trim());
    data.append("instructions", form.instructions.trim());
    data.append("course_id", form.course_id);
    data.append("subject_id", form.subject_id || "");
    data.append("batch_ids", JSON.stringify(form.batch_ids));
    data.append("total_marks", String(Number(form.total_marks)));
    data.append("assignedAt", new Date(form.assignedAt).toISOString());
    data.append("dueAt", new Date(form.dueAt).toISOString());
    data.append("allowLateSubmission", String(form.allowLateSubmission));
    data.append("allowResubmission", String(form.allowResubmission));

    selectedFiles.forEach((file) => data.append("attachments", file));

    return data;
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

    setSaving(true);

    try {
      const payload = makePayload();

      if (editing) {
        await updateAssignment(editing.id, payload);
        setSuccess("Assignment updated successfully.");
      } else {
        await createAssignment(payload);
        setSuccess("Assignment created successfully as Draft.");
      }

      resetForm();
      await loadAssignments();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item) => {
    if (!can("publish") || item.status !== "Draft") return;

    if (!window.confirm(`Publish "${item.title}"? Students will be able to see it.`)) {
      return;
    }

    setActionId(item.id);
    setError("");
    setSuccess("");

    try {
      await updateAssignmentStatus(item.id, "Published");
      setSuccess("Assignment published successfully.");
      await loadAssignments();
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleArchive = async (item) => {
    if (!can("publish") || item.status !== "Published") return;

    if (!window.confirm(`Archive "${item.title}"? Students will no longer see it as an active assignment.`)) {
      return;
    }

    setActionId(item.id);
    setError("");
    setSuccess("");

    try {
      await updateAssignmentStatus(item.id, "Archived");
      setSuccess("Assignment archived successfully.");
      await loadAssignments();
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (item) => {
    if (!can("delete") || item.status !== "Draft") return;

    if (!window.confirm(`Permanently delete draft "${item.title}"? This cannot be undone.`)) {
      return;
    }

    setActionId(item.id);
    setError("");
    setSuccess("");

    try {
      await deleteAssignment(item.id);
      setSuccess("Draft assignment deleted.");
      await loadAssignments();
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleRemoveAttachment = async (file) => {
    if (!editing || !can("update")) return;

    if (!window.confirm(`Remove "${file.originalName}"?`)) return;

    setActionId(file.id);
    setError("");

    try {
      await removeAssignmentAttachment(editing.id, file.id);

      const response = await getAssignment(editing.id);
      const refreshed = getRoot(response);

      setEditing(refreshed);
      setSuccess("Attachment removed.");
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleDownload = async (assignment, file) => {
    setActionId(file.id);
    setError("");

    try {
      const response = await downloadAssignmentFile(assignment.id, file.id);
      saveBlob(response.data, file.originalName);
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const statsCards = [
    { label: "Total assignments", value: stats.total, icon: FiFileText },
    { label: "Drafts", value: stats.drafts, icon: FiEdit2 },
    { label: "Published", value: stats.published, icon: FiCheckCircle },
    { label: "Archived", value: stats.archived, icon: FiClock },
  ];

  return (
    <div className="assignment-page">
      <div className="assignment-page-header">
        <div>
          <span className="assignment-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Assignments</h1>
          <p>Create, manage and publish coursework for your students.</p>
        </div>

        {can("create") && (
          <button className="assignment-primary-btn" onClick={openCreate}>
            <FiPlus /> Create Assignment
          </button>
        )}
      </div>

      {error && (
        <div className="assignment-alert assignment-alert-error">
          <span>{error}</span>
          <button onClick={() => setError("")}><FiX /></button>
        </div>
      )}

      {success && (
        <div className="assignment-alert assignment-alert-success">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><FiX /></button>
        </div>
      )}

      <div className="assignment-stats-grid">
        {statsCards.map(({ label, value, icon: Icon }) => (
          <div className="assignment-stat-card" key={label}>
            <div className="assignment-stat-icon"><Icon /></div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>

      <section className="assignment-panel">
        <div className="assignment-toolbar">
          <div className="assignment-search">
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search assignment title..."
            />
          </div>

          <div className="assignment-filter">
            <FiFilter />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <select
            className="assignment-course-filter"
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value)}
          >
            <option value="">All courses</option>
            {courses.map((course) => (
              <option key={getId(course)} value={getId(course)}>
                {course.courseTitle || course.title || "Course"}
              </option>
            ))}
          </select>

          <button
            className="assignment-icon-btn"
            title="Refresh"
            onClick={loadAssignments}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? "assignment-spin" : ""} />
          </button>
        </div>

        <div className="assignment-table-wrap">
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course / Subject</th>
                <th>Target batches</th>
                <th>Due date</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="assignment-empty">
                    Loading assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="assignment-empty">
                    <FiBookOpen />
                    <strong>No assignments found</strong>
                    <span>Create an assignment to get started.</span>
                  </td>
                </tr>
              ) : (
                assignments.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="assignment-title-cell">
                        <strong>{item.title}</strong>
                        <span>
                          {item.attachments?.length || 0} reference file(s)
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="assignment-course-cell">
                        <strong>{item.course?.title || "—"}</strong>
                        <span>{item.subject?.name || "General assignment"}</span>
                      </div>
                    </td>

                    <td>
                      {item.batches?.length
                        ? item.batches.map((batch) => batch.name).join(", ")
                        : "All eligible batches"}
                    </td>

                    <td>{formatDate(item.dueAt)}</td>
                    <td>{item.total_marks}</td>

                    <td>
                      <span className={`assignment-status status-${item.status?.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <div className="assignment-actions">
                        {item.status === "Draft" && can("update") && (
                          <button
                            title="Edit draft"
                            onClick={() => openEdit(item)}
                            disabled={actionId === item.id}
                          >
                            <FiEdit2 />
                          </button>
                        )}

                        {item.status === "Draft" && can("publish") && (
                          <button
                            title="Publish"
                            className="action-publish"
                            onClick={() => handlePublish(item)}
                            disabled={actionId === item.id}
                          >
                            <FiCheckCircle />
                          </button>
                        )}

                        {item.status === "Published" && can("publish") && (
                          <button
                            title="Archive"
                            onClick={() => handleArchive(item)}
                            disabled={actionId === item.id}
                          >
                            <FiClock />
                          </button>
                        )}

                        {item.status === "Draft" && can("delete") && (
                          <button
                            title="Delete draft"
                            className="action-delete"
                            onClick={() => handleDelete(item)}
                            disabled={actionId === item.id}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="assignment-pagination">
          <span>
            Showing {assignments.length} of {pagination.total} assignments
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <strong>{page} / {Math.max(1, pagination.totalPages)}</strong>

            <button
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {formOpen && (
        <div className="assignment-modal-backdrop">
          <div className="assignment-modal">
            <div className="assignment-modal-header">
              <div>
                <span className="assignment-eyebrow">
                  {editing ? "UPDATE DRAFT" : "NEW COURSEWORK"}
                </span>
                <h2>{editing ? "Edit Assignment" : "Create Assignment"}</h2>
              </div>

              <button className="assignment-modal-close" onClick={resetForm}>
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="assignment-form-body">
                <div className="assignment-form-section">
                  <h3>Basic information</h3>

                  <label className="assignment-field full">
                    <span>Assignment title <b>*</b></span>
                    <input
                      value={form.title}
                      maxLength={200}
                      onChange={(event) =>
                        setForm({ ...form, title: event.target.value })
                      }
                      placeholder="e.g. React JS Module Assignment"
                      required
                    />
                  </label>

                  <label className="assignment-field full">
                    <span>Description</span>
                    <textarea
                      rows="3"
                      maxLength={10000}
                      value={form.description}
                      onChange={(event) =>
                        setForm({ ...form, description: event.target.value })
                      }
                      placeholder="Briefly describe this assignment..."
                    />
                  </label>

                  <label className="assignment-field full">
                    <span>Instructions</span>
                    <textarea
                      rows="4"
                      maxLength={15000}
                      value={form.instructions}
                      onChange={(event) =>
                        setForm({ ...form, instructions: event.target.value })
                      }
                      placeholder="Explain what students need to complete and submit..."
                    />
                  </label>
                </div>

                <div className="assignment-form-section">
                  <h3>Student targeting</h3>
                  <p className="assignment-section-hint">
                    Course is required. Subject and batches are optional.
                  </p>

                  <div className="assignment-form-grid">
                    <label className="assignment-field">
                      <span>Course <b>*</b></span>
                      <select
                        value={form.course_id}
                        onChange={(event) => handleCourseChange(event.target.value)}
                        required
                      >
                        <option value="">Select course</option>
                        {courses.map((course) => (
                          <option key={getId(course)} value={getId(course)}>
                            {course.courseTitle || course.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="assignment-field">
                      <span>Subject (optional)</span>
                      <select
                        value={form.subject_id}
                        disabled={!form.course_id || loadingRelations}
                        onChange={(event) =>
                          setForm({ ...form, subject_id: event.target.value })
                        }
                      >
                        <option value="">General course assignment</option>
                        {subjects.map((subject) => (
                          <option key={getId(subject)} value={getId(subject)}>
                            {subject.subjectName}
                            {subject.subjectCode ? ` (${subject.subjectCode})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="assignment-field full">
                    <span>Target batches (optional)</span>
                    <div className="assignment-batch-box">
                      {!form.course_id ? (
                        <span>Select a course first.</span>
                      ) : loadingRelations ? (
                        <span>Loading batches...</span>
                      ) : batches.length === 0 ? (
                        <span>No batches found for this course.</span>
                      ) : (
                        batches.map((batch) => {
                          const id = getId(batch);
                          return (
                            <label className="assignment-batch-option" key={id}>
                              <input
                                type="checkbox"
                                checked={form.batch_ids.includes(id)}
                                onChange={() => toggleBatch(id)}
                              />
                              <span>
                                {batch.batch_name || batch.name || "Batch"}
                                {batch.status ? ` · ${batch.status}` : ""}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <small>
                      Leave all batches unchecked to assign this to all eligible
                      students admitted to the selected course.
                    </small>
                  </div>
                </div>

                <div className="assignment-form-section">
                  <h3>Marks and schedule</h3>

                  <div className="assignment-form-grid">
                    <label className="assignment-field">
                      <span>Total marks <b>*</b></span>
                      <input
                        type="number"
                        min="0.01"
                        max="100000"
                        step="0.01"
                        value={form.total_marks}
                        onChange={(event) =>
                          setForm({ ...form, total_marks: event.target.value })
                        }
                        required
                      />
                    </label>

                    <label className="assignment-field">
                      <span>Assigned date <b>*</b></span>
                      <input
                        type="datetime-local"
                        value={form.assignedAt}
                        onChange={(event) =>
                          setForm({ ...form, assignedAt: event.target.value })
                        }
                        required
                      />
                    </label>

                    <label className="assignment-field">
                      <span>Submission deadline <b>*</b></span>
                      <input
                        type="datetime-local"
                        value={form.dueAt}
                        onChange={(event) =>
                          setForm({ ...form, dueAt: event.target.value })
                        }
                        required
                      />
                    </label>
                  </div>
                </div>

                <div className="assignment-form-section">
                  <h3>Submission settings</h3>

                  <label className="assignment-toggle">
                    <input
                      type="checkbox"
                      checked={form.allowLateSubmission}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          allowLateSubmission: event.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>Allow late submissions</strong>
                      <small>Students can submit after the deadline.</small>
                    </span>
                  </label>

                  <label className="assignment-toggle">
                    <input
                      type="checkbox"
                      checked={form.allowResubmission}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          allowResubmission: event.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>Allow resubmission</strong>
                      <small>
                        Resubmission is also controlled individually by Admin.
                      </small>
                    </span>
                  </label>
                </div>

                <div className="assignment-form-section">
                  <h3>Reference attachments</h3>

                  {editing?.attachments?.length > 0 && (
                    <div className="assignment-existing-files">
                      {editing.attachments.map((file) => (
                        <div className="assignment-file-row" key={file.id}>
                          <FiFileText />
                          <span>{file.originalName}</span>
                          <small>{formatSize(file.fileSize)}</small>

                          <button
                            type="button"
                            title="Download"
                            onClick={() => handleDownload(editing, file)}
                          >
                            <FiDownload />
                          </button>

                          <button
                            type="button"
                            title="Remove attachment"
                            onClick={() => handleRemoveAttachment(file)}
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label className="assignment-upload">
                    <FiUpload />
                    <strong>Choose reference files</strong>
                    <span>PDF, DOC, DOCX, JPG, PNG, WEBP or ZIP · Max 20 MB each</span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                      onChange={(event) =>
                        setSelectedFiles(Array.from(event.target.files || []))
                      }
                    />
                  </label>

                  {selectedFiles.length > 0 && (
                    <div className="assignment-selected-files">
                      {selectedFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`}>
                          <FiFileText />
                          <span>{file.name}</span>
                          <small>{formatSize(file.size)}</small>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFiles((current) =>
                                current.filter((_, i) => i !== index)
                              )
                            }
                          >
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="assignment-modal-footer">
                <button
                  type="button"
                  className="assignment-secondary-btn"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="assignment-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editing ? "Save Changes" : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}