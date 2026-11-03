
// import { useCallback, useEffect, useMemo, useState } from "react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCheckCircle,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";

import { getCourses, getCourse } from "../../../services/courseService";
import { getSubjects } from "../../../services/subjectService";
import {
  getNotes,
  createNote,
  updateNote,
  addNoteAttachments,
  removeNoteAttachment,
  updateNoteStatus,
  deleteNote,
  getNoteFile,
} from "../../../services/notesService";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import "../../../styles/NotesManagement.css";

const EMPTY_FORM = {
  title: "",
  description: "",
  course_id: "",
  subject_id: "",
};

const PAGE_SIZE = 20;

const getError = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getData = (response) => response?.data?.data ?? response?.data ?? {};

const getArray = (response, key) => {
  const data = getData(response);
  return Array.isArray(data?.[key]) ? data[key] : [];
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function NotesManagement() {
  const { user } = useAuth();

  const can = (permission) => hasPermission(user, `notes.${permission}`);

  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const stats = useMemo(() => ({
    total: pagination.total,
    published: notes.filter((note) => note.status === "Published").length,
    drafts: notes.filter((note) => note.status === "Draft").length,
  }), [notes, pagination.total]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (courseFilter) params.courseId = courseFilter;
      if (subjectFilter) params.subjectId = subjectFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await getNotes(params);
      const data = getData(response);

      setNotes(Array.isArray(data.notes) ? data.notes : []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, courseFilter, subjectFilter, statusFilter]);

  const loadCourses = useCallback(async () => {
    try {
      const response = await getCourses({ page: 1, limit: 100 });
      setCourses(getArray(response, "courses"));
    } catch (err) {
      setError(getError(err));
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    setPage(1);
  }, [search, courseFilter, subjectFilter, statusFilter]);

  const loadCourseSubjects = async (courseId, selectedSubjectId = "") => {
    setSubjects([]);

    if (!courseId) return;

    setLoadingSubjects(true);
    try {
      const courseResponse = await getCourse(courseId);
      const root = courseResponse?.data?.data ?? courseResponse?.data;
      const course = root?.course ?? root;

      const linked = Array.isArray(course?.subjects) ? course.subjects : [];
      const linkedIds = linked.map((item) =>
        String(typeof item === "object" ? item?._id : item)
      );

      let subjectList = linked.filter((item) => typeof item === "object");

      if (linked.length && subjectList.length !== linked.length) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });
        subjectList = getArray(response, "subjects").filter((subject) =>
          linkedIds.includes(String(subject._id))
        );
      }

      if (selectedSubjectId && !subjectList.some(
        (subject) => String(subject._id) === String(selectedSubjectId)
      )) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });
        const allSubjects = getArray(response, "subjects");
        const selected = allSubjects.find(
          (subject) => String(subject._id) === String(selectedSubjectId)
        );
        if (selected) subjectList.push(selected);
      }

      setSubjects(subjectList.filter((subject) => subject.status === "Active"));
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedFiles([]);
    setEditingNote(null);
    setSubjects([]);
    setFormOpen(false);
  };

  const openCreate = () => {
    setError("");
    setSuccess("");
    setEditingNote(null);
    setForm(EMPTY_FORM);
    setSelectedFiles([]);
    setSubjects([]);
    setFormOpen(true);
  };

  const openEdit = async (note) => {
    if (!can("update")) return;

    setError("");
    setSuccess("");
    setEditingNote(note);
    setForm({
      title: note.title || "",
      description: note.description || "",
      course_id: note.course?.id || "",
      subject_id: note.subject?.id || "",
    });
    setSelectedFiles([]);
    setFormOpen(true);

    await loadCourseSubjects(note.course?.id, note.subject?.id || "");
  };

  const handleCourseChange = async (courseId) => {
    setForm((current) => ({
      ...current,
      course_id: courseId,
      subject_id: "",
    }));
    setSubjects([]);
    await loadCourseSubjects(courseId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Please enter a note title.");
      return;
    }

    if (!form.course_id) {
      setError("Please select a course.");
      return;
    }

    if (!editingNote && !selectedFiles.length) {
      setError("Please select at least one attachment.");
      return;
    }

    if (selectedFiles.length > 10) {
      setError("You can upload a maximum of 10 files in one upload.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        course_id: form.course_id,
        subject_id: form.subject_id || "",
      };

      if (editingNote) {
        await updateNote(editingNote.id, payload);

        if (selectedFiles.length) {
          const fileData = new FormData();
          selectedFiles.forEach((file) => fileData.append("attachments", file));
          await addNoteAttachments(editingNote.id, fileData);
        }

        setSuccess("Note updated successfully.");
      } else {
        const fileData = new FormData();
        Object.entries(payload).forEach(([key, value]) =>
          fileData.append(key, value)
        );
        selectedFiles.forEach((file) => fileData.append("attachments", file));

        await createNote(fileData);
        setSuccess("Note created successfully as Draft.");
      }

      resetForm();
      await loadNotes();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAttachment = async (note, file) => {
    if (!can("update")) return;

    if (!window.confirm(`Remove "${file.originalName}" from this note?`)) return;

    setActionId(note.id);
    setError("");
    setSuccess("");

    try {
      await removeNoteAttachment(note.id, file.id);
      setSuccess("Attachment removed.");
      await loadNotes();

      if (editingNote?.id === note.id) {
        const refreshed = await getNotes({ page: 1, limit: 100 });
        const found = getArray(refreshed, "notes").find((item) => item.id === note.id);
        if (found) setEditingNote(found);
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleStatus = async (note, status) => {
    if (!can("publish")) return;

    const action = status === "Published" ? "publish" : "move back to Draft";
    if (!window.confirm(`Are you sure you want to ${action} "${note.title}"?`)) return;

    setActionId(note.id);
    setError("");
    setSuccess("");

    try {
      await updateNoteStatus(note.id, status);
      setSuccess(status === "Published" ? "Note published." : "Note moved to Draft.");
      await loadNotes();
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleDelete = async (note) => {
    if (!can("delete")) return;

    if (!window.confirm(`Permanently delete "${note.title}" and its attachments?`)) return;

    setActionId(note.id);
    setError("");
    setSuccess("");

    try {
      await deleteNote(note.id);
      setSuccess("Note deleted successfully.");
      await loadNotes();
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  const handleFile = async (note, file, action) => {
    setActionId(note.id);
    setError("");

    try {
      const response = await getNoteFile(note.id, file.id, action);
      const blobUrl = URL.createObjectURL(response.data);

      if (action === "download") {
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = file.originalName || "note-attachment";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(blobUrl);
      } else {
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setActionId("");
    }
  };

  return (
    <main className="notes-page">
      <header className="notes-header">
        <div>
          <span className="notes-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Notes Management</h1>
          <p>Create, organize and publish course notes for students.</p>
        </div>

        <div className="notes-header-actions">
          <button className="notes-btn notes-btn-light" onClick={loadNotes} disabled={loading}>
            <FiRefreshCw /> Refresh
          </button>
          {can("create") && (
            <button className="notes-btn notes-btn-primary" onClick={openCreate}>
              <FiPlus /> Add Note
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="notes-alert notes-alert-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss"><FiX /></button>
        </div>
      )}

      {success && (
        <div className="notes-alert notes-alert-success" role="status">
          <FiCheckCircle /> {success}
          <button onClick={() => setSuccess("")} aria-label="Dismiss"><FiX /></button>
        </div>
      )}

      <section className="notes-stats">
        <article><FiFileText /><div><span>Total Notes (current page)</span><strong>{stats.total}</strong></div></article>
        <article><FiCheckCircle /><div><span>Published (current page)</span><strong>{stats.published}</strong></div></article>
        <article><FiEdit2 /><div><span>Drafts (current page)</span><strong>{stats.drafts}</strong></div></article>
      </section>

      {formOpen && (
        <section className="notes-card notes-form-card">
          <div className="notes-section-heading">
            <div>
              <span className="notes-eyebrow">{editingNote ? "UPDATE NOTE" : "CREATE NOTE"}</span>
              <h2>{editingNote ? "Edit Note" : "Add New Note"}</h2>
              <p>Course is required. Subject is optional for general course notes.</p>
            </div>
            <button className="notes-icon-btn" onClick={resetForm} aria-label="Close form"><FiX /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="notes-form-grid">
              <label className="notes-field notes-field-wide">
                Note Title <span>*</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  maxLength={200}
                  required
                  placeholder="Enter note title"
                />
              </label>

              <label className="notes-field notes-field-wide">
                Description
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Add a short description or instructions..."
                />
              </label>

              <label className="notes-field">
                Course <span>*</span>
                <select
                  value={form.course_id}
                  onChange={(event) => handleCourseChange(event.target.value)}
                  disabled={saving || loadingSubjects}
                  required
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>{course.courseTitle}</option>
                  ))}
                </select>
              </label>

              <label className="notes-field">
                Subject <small>(Optional)</small>
                <select
                  value={form.subject_id}
                  onChange={(event) => setForm({ ...form, subject_id: event.target.value })}
                  disabled={!form.course_id || loadingSubjects || saving}
                >
                  <option value="">General course note (no subject)</option>
                  {subjects.map((subject) => (
                    <option key={subject._id} value={subject._id}>
                      {subject.subjectName}{subject.subjectCode ? ` (${subject.subjectCode})` : ""}
                    </option>
                  ))}
                </select>
                {loadingSubjects && <small>Loading subjects...</small>}
              </label>

              <label className="notes-field notes-field-wide">
                {editingNote ? "Add more attachments" : "Attachments"}
                {!editingNote && <span>*</span>}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  disabled={saving}
                />
                <small>Up to 10 files per upload. Backend limit: 20 MB per file.</small>
              </label>

              {selectedFiles.length > 0 && (
                <div className="notes-selected-files notes-field-wide">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`}>
                      <FiUpload /> {file.name} <small>{formatSize(file.size)}</small>
                    </div>
                  ))}
                </div>
              )}

              {editingNote?.attachments?.length > 0 && (
                <div className="notes-existing-files notes-field-wide">
                  <strong>Existing attachments</strong>
                  {editingNote.attachments.map((file) => (
                    <div key={file.id}>
                      <span><FiFileText /> {file.originalName}</span>
                      {can("update") && (
                        <button
                          type="button"
                          className="notes-remove-file"
                          onClick={() => handleRemoveAttachment(editingNote, file)}
                          disabled={actionId === editingNote.id}
                        >
                          <FiTrash2 /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="notes-form-actions">
              <button type="button" className="notes-btn notes-btn-light" onClick={resetForm} disabled={saving}>Cancel</button>
              <button type="submit" className="notes-btn notes-btn-primary" disabled={saving || loadingSubjects}>
                {saving ? "Saving..." : editingNote ? "Update Note" : "Create Draft"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="notes-card">
        <div className="notes-section-heading notes-list-heading">
          <div>
            <h2>All Notes</h2>
            <p>{pagination.total || 0} note(s) found</p>
          </div>

          <div className="notes-filters">
            <label className="notes-search">
              <FiSearch />
              <input
                type="search"
                placeholder="Search note title..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)}>
              <option value="">All Courses</option>
              {courses.map((course) => <option key={course._id} value={course._id}>{course.courseTitle}</option>)}
            </select>

            <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.subjectName}</option>)}
            </select>

            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
            </select>
          </div>
        </div>

        <div className="notes-table-wrap">
          <table className="notes-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Note</th>
                <th>Course / Subject</th>
                <th>Attachments</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="notes-empty">Loading notes...</td></tr>
              ) : notes.length === 0 ? (
                <tr><td colSpan="7" className="notes-empty">No notes found.</td></tr>
              ) : notes.map((note, index) => (
                <tr key={note.id}>
                  <td>{(page - 1) * PAGE_SIZE + index + 1}</td>
                  <td>
                    <strong>{note.title}</strong>
                    {note.description && <small className="notes-description">{note.description}</small>}
                  </td>
                  <td>
                    <strong>{note.course?.title || "—"}</strong>
                    <small className="notes-description">{note.subject?.name || "General course note"}</small>
                  </td>
                  <td>{note.attachments?.length || 0} file(s)</td>
                  <td><span className={`notes-status notes-status-${String(note.status).toLowerCase()}`}>{note.status}</span></td>
                  <td>{formatDate(note.createdAt)}</td>
                  <td>
                    <div className="notes-row-actions">
                      {note.attachments?.map((file) => (
                        <React.Fragment key={file.id}>
                          <button title={`View ${file.originalName}`} onClick={() => handleFile(note, file, "view")} disabled={actionId === note.id}><FiEye /></button>
                          <button title={`Download ${file.originalName}`} onClick={() => handleFile(note, file, "download")} disabled={actionId === note.id}><FiDownload /></button>
                        </React.Fragment>
                      ))}
                      {can("update") && (
                        <button title="Edit note" onClick={() => openEdit(note)}><FiEdit2 /></button>
                      )}
                      {can("publish") && (
                        <button
                          title={note.status === "Published" ? "Move to Draft" : "Publish"}
                          onClick={() => handleStatus(note, note.status === "Published" ? "Draft" : "Published")}
                          disabled={actionId === note.id}
                        >
                          <FiCheckCircle />
                        </button>
                      )}
                      {can("delete") && (
                        <button className="notes-delete-action" title="Delete note" onClick={() => handleDelete(note)} disabled={actionId === note.id}>
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="notes-pagination">
          <span>Page {page} of {Math.max(1, pagination.totalPages || 1)}</span>
          <div>
            <button className="notes-btn notes-btn-light" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <button className="notes-btn notes-btn-light" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </section>
    </main>
  );
}
