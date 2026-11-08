import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
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

import Pagination from "../../../components/common/Pagination";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/NotesManagement.css";

const EMPTY_FORM = {
  title: "",
  description: "",
  course_id: "",
  subject_id: "",
};

const DEFAULT_PAGINATION = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 0,
};

const DEFAULT_STATS = {
  total: 0,
  published: 0,
  drafts: 0,
};

const getData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const getArray = (response, key) => {
  const data = getData(response);
  return Array.isArray(data?.[key]) ? data[key] : [];
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatSize = (bytes) => {
  if (!bytes) return "—";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getCourseId = (course) =>
  String(course?._id || course?.id || "");

const getSubjectId = (subject) =>
  String(subject?._id || subject?.id || "");

export default function NotesManagement() {
  const { user } = useAuth();

  const can = (permission) =>
    hasPermission(user, `notes.${permission}`);

  // --------------------------------------------------
  // DATA
  // --------------------------------------------------

  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);

  // All subjects are used by the list filter.
  const [allSubjects, setAllSubjects] = useState([]);

  // Course-linked subjects are used by the form.
  const [formSubjects, setFormSubjects] = useState([]);

  const [stats, setStats] = useState(DEFAULT_STATS);

  // --------------------------------------------------
  // FORM
  // --------------------------------------------------

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  // --------------------------------------------------
  // FILTERS AND PAGINATION
  // --------------------------------------------------

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [courseFilter, setCourseFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState(
    DEFAULT_PAGINATION
  );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // --------------------------------------------------
  // LOAD COURSES
  // --------------------------------------------------

  const loadCourses = useCallback(async () => {
    try {
      const response = await getCourses({
        page: 1,
        limit: 100,
      });

      const root = getData(response);

      const courseList = Array.isArray(root)
        ? root
        : Array.isArray(root.courses)
          ? root.courses
          : [];

      setCourses(courseList);
    } catch (error) {
      setCourses([]);
      notification.error(getApiErrorMessage(error));
    }
  }, []);

  // --------------------------------------------------
  // LOAD SUBJECT OPTIONS FOR FILTER
  // --------------------------------------------------

  const loadAllSubjects = useCallback(async () => {
    try {
      const response = await getSubjects({
        page: 1,
        limit: 100,
        status: "Active",
      });

      const subjectList = getArray(response, "subjects");

      setAllSubjects(subjectList);
    } catch (error) {
      setAllSubjects([]);
      notification.error(getApiErrorMessage(error));
    }
  }, []);

  // --------------------------------------------------
  // LOAD NOTES
  // --------------------------------------------------

  const loadNotes = useCallback(async () => {
    setLoading(true);

    try {
      const params = {
        page,
        limit,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (courseFilter) {
        params.courseId = courseFilter;
      }

      if (subjectFilter) {
        params.subjectId = subjectFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await getNotes(params);
      const data = getData(response);

      setNotes(
        Array.isArray(data.notes) ? data.notes : []
      );

      setPagination(
        data.pagination || DEFAULT_PAGINATION
      );

      setStats(
        data.stats || DEFAULT_STATS
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    courseFilter,
    subjectFilter,
    statusFilter,
  ]);

  useEffect(() => {
    loadCourses();
    loadAllSubjects();
  }, [loadCourses, loadAllSubjects]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Debounce search to avoid an API request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset to first page when filters change.
  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    courseFilter,
    subjectFilter,
    statusFilter,
    limit,
  ]);

  // --------------------------------------------------
  // LOAD COURSE SUBJECTS
  // --------------------------------------------------

  const loadCourseSubjects = async (
    courseId,
    selectedSubjectId = ""
  ) => {
    setFormSubjects([]);

    if (!courseId) return;

    setLoadingSubjects(true);

    try {
      const courseResponse = await getCourse(courseId);

      const root =
        courseResponse?.data?.data ??
        courseResponse?.data ??
        {};

      const course = root.course ?? root;

      const linked = Array.isArray(course?.subjects)
        ? course.subjects
        : [];

      const linkedIds = linked.map((item) =>
        String(
          typeof item === "object"
            ? item?._id || item?.id
            : item
        )
      );

      let subjectList = linked.filter(
        (item) => typeof item === "object"
      );

      // Resolve IDs when the course response does not populate subjects.
      if (linked.length && subjectList.length !== linked.length) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });

        subjectList = getArray(response, "subjects").filter(
          (subject) => linkedIds.includes(getSubjectId(subject))
        );
      }

      // Ensure the currently assigned subject remains selectable.
      if (
        selectedSubjectId &&
        !subjectList.some(
          (subject) =>
            getSubjectId(subject) === String(selectedSubjectId)
        )
      ) {
        const response = await getSubjects({
          page: 1,
          limit: 100,
          status: "Active",
        });

        const all = getArray(response, "subjects");

        const selected = all.find(
          (subject) =>
            getSubjectId(subject) === String(selectedSubjectId)
        );

        if (selected) {
          subjectList.push(selected);
        }
      }

      setFormSubjects(
        subjectList.filter(
          (subject) => subject.status === "Active"
        )
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setLoadingSubjects(false);
    }
  };

  // --------------------------------------------------
  // FORM ACTIONS
  // --------------------------------------------------

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedFiles([]);
    setEditingNote(null);
    setFormSubjects([]);
    setFormOpen(false);
  };

  const openCreate = () => {
    setEditingNote(null);
    setForm(EMPTY_FORM);
    setSelectedFiles([]);
    setFormSubjects([]);
    setFormOpen(true);
  };

  const openEdit = async (note) => {
    if (!can("update")) return;

    setEditingNote(note);

    setForm({
      title: note.title || "",
      description: note.description || "",
      course_id: note.course?.id || "",
      subject_id: note.subject?.id || "",
    });

    setSelectedFiles([]);
    setFormOpen(true);

    await loadCourseSubjects(
      note.course?.id,
      note.subject?.id || ""
    );
  };

  const handleCourseChange = async (courseId) => {
    setForm((current) => ({
      ...current,
      course_id: courseId,
      subject_id: "",
    }));

    setFormSubjects([]);

    await loadCourseSubjects(courseId);
  };

  // --------------------------------------------------
  // CREATE / UPDATE NOTE
  // --------------------------------------------------

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      notification.warning("Please enter a note title.");
      return;
    }

    if (!form.course_id) {
      notification.warning("Please select a course.");
      return;
    }

    if (!editingNote && selectedFiles.length === 0) {
      notification.warning(
        "Please select at least one attachment."
      );
      return;
    }

    if (selectedFiles.length > 10) {
      notification.warning(
        "You can upload a maximum of 10 files in one upload."
      );
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

        if (selectedFiles.length > 0) {
          const fileData = new FormData();

          selectedFiles.forEach((file) => {
            fileData.append("attachments", file);
          });

          await addNoteAttachments(
            editingNote.id,
            fileData
          );
        }

        notification.success("Note updated successfully.");
      } else {
        const fileData = new FormData();

        Object.entries(payload).forEach(([key, value]) => {
          fileData.append(key, value);
        });

        selectedFiles.forEach((file) => {
          fileData.append("attachments", file);
        });

        await createNote(fileData);

        notification.success(
          "Note created successfully as Draft."
        );
      }

      resetForm();
      await loadNotes();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // REMOVE ATTACHMENT
  // --------------------------------------------------

  const handleRemoveAttachment = async (note, file) => {
    if (!can("update")) return;

    const confirmed = await notification.confirm({
      title: "Remove attachment?",
      text: `Remove "${file.originalName}" from this note?`,
      icon: "warning",
      confirmText: "Yes, remove",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    setActionId(note.id);

    try {
      await removeNoteAttachment(note.id, file.id);

      notification.success("Attachment removed successfully.");

      await loadNotes();

      // Refresh the edited note from the currently displayed page.
      if (editingNote?.id === note.id) {
        const response = await getNotes({
          page,
          limit,
        });

        const refreshedNotes = getArray(response, "notes");

        const refreshed = refreshedNotes.find(
          (item) => item.id === note.id
        );

        if (refreshed) {
          setEditingNote(refreshed);
        }
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  // --------------------------------------------------
  // PUBLISH / MOVE TO DRAFT
  // --------------------------------------------------

  const handleStatus = async (note, status) => {
    if (!can("publish")) return;

    let confirmed = false;

    if (status === "Published") {
      confirmed = await notification.confirmPublish(
        `"${note.title}"`
      );
    } else {
      confirmed = await notification.confirm({
        title: "Move note to Draft?",
        text: `"${note.title}" will no longer be available as a published note.`,
        icon: "warning",
        confirmText: "Yes, move to Draft",
        confirmButtonColor: "#d97706",
      });
    }

    if (!confirmed) return;

    setActionId(note.id);

    try {
      await updateNoteStatus(note.id, status);

      notification.success(
        status === "Published"
          ? "Note published successfully."
          : "Note moved to Draft successfully."
      );

      await loadNotes();
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  // --------------------------------------------------
  // DELETE NOTE
  // --------------------------------------------------

  const handleDelete = async (note) => {
    if (!can("delete")) return;

    const confirmed = await notification.confirmDelete(
      `the note "${note.title}" and all its attachments`
    );

    if (!confirmed) return;

    setActionId(note.id);

    try {
      await deleteNote(note.id);

      notification.success(
        "Note and its attachments deleted successfully."
      );

      // If the last record on this page was deleted, move back.
      if (notes.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadNotes();
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  // --------------------------------------------------
  // VIEW / DOWNLOAD ATTACHMENT
  // --------------------------------------------------

  const handleFile = async (note, file, action) => {
    setActionId(note.id);

    try {
      const response = await getNoteFile(
        note.id,
        file.id,
        action
      );

      const blobUrl = URL.createObjectURL(response.data);

      if (action === "download") {
        const anchor = document.createElement("a");

        anchor.href = blobUrl;
        anchor.download =
          file.originalName || "note-attachment";

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      } else {
        const openedWindow = window.open(
          blobUrl,
          "_blank",
          "noopener,noreferrer"
        );

        if (!openedWindow) {
          notification.warning(
            "Your browser blocked the preview. Please allow pop-ups and try again."
          );
        }

        window.setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setActionId("");
    }
  };

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = async () => {
    await Promise.all([
      loadNotes(),
      loadCourses(),
      loadAllSubjects(),
    ]);

    notification.success("Notes refreshed.");
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="notes-page">
      <header className="notes-header">
        <div>
          <span className="notes-eyebrow">
            ACADEMIC MANAGEMENT
          </span>

          <h1>Notes Management</h1>

          <p>
            Create, organize and publish course notes for students.
          </p>
        </div>

        <div className="notes-header-actions">
          <button
            type="button"
            className="notes-btn notes-btn-light"
            onClick={handleRefresh}
            disabled={loading}
          >
            <FiRefreshCw />
            Refresh
          </button>

          {can("create") && (
            <button
              type="button"
              className="notes-btn notes-btn-primary"
              onClick={openCreate}
            >
              <FiPlus />
              Add Note
            </button>
          )}
        </div>
      </header>

      {/* GLOBAL STATISTICS */}

      <section className="notes-stats">
        <article>
          <FiFileText />

          <div>
            <span>Total Notes</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article>
          <FiCheckCircle />

          <div>
            <span>Published</span>
            <strong>{stats.published}</strong>
          </div>
        </article>

        <article>
          <FiEdit2 />

          <div>
            <span>Drafts</span>
            <strong>{stats.drafts}</strong>
          </div>
        </article>
      </section>

      {/* CREATE / EDIT FORM */}

      {formOpen && (
        <section className="notes-card notes-form-card">
          <div className="notes-section-heading">
            <div>
              <span className="notes-eyebrow">
                {editingNote ? "UPDATE NOTE" : "CREATE NOTE"}
              </span>

              <h2>
                {editingNote ? "Edit Note" : "Add New Note"}
              </h2>

              <p>
                Course is required. Subject is optional for general course notes.
              </p>
            </div>

            <button
              type="button"
              className="notes-icon-btn"
              onClick={resetForm}
              aria-label="Close form"
              disabled={saving}
            >
              <FiX />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="notes-form-grid">
              <label className="notes-field notes-field-wide">
                Note Title <span>*</span>

                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  maxLength={200}
                  required
                  placeholder="Enter note title"
                  disabled={saving}
                />
              </label>

              <label className="notes-field notes-field-wide">
                Description

                <textarea
                  rows={3}
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add a short description or instructions..."
                  disabled={saving}
                />
              </label>

              <label className="notes-field">
                Course <span>*</span>

                <select
                  value={form.course_id}
                  onChange={(event) =>
                    handleCourseChange(event.target.value)
                  }
                  disabled={saving || loadingSubjects}
                  required
                >
                  <option value="">Select course</option>

                  {courses.map((course) => (
                    <option
                      key={getCourseId(course)}
                      value={getCourseId(course)}
                    >
                      {course.courseTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label className="notes-field">
                Subject <small>(Optional)</small>

                <select
                  value={form.subject_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subject_id: event.target.value,
                    }))
                  }
                  disabled={
                    !form.course_id ||
                    loadingSubjects ||
                    saving
                  }
                >
                  <option value="">
                    General course note (no subject)
                  </option>

                  {formSubjects.map((subject) => (
                    <option
                      key={getSubjectId(subject)}
                      value={getSubjectId(subject)}
                    >
                      {subject.subjectName}
                      {subject.subjectCode
                        ? ` (${subject.subjectCode})`
                        : ""}
                    </option>
                  ))}
                </select>

                {loadingSubjects && (
                  <small>Loading subjects...</small>
                )}
              </label>

              <label className="notes-field notes-field-wide">
                {editingNote
                  ? "Add more attachments"
                  : "Attachments"}

                {!editingNote && <span>*</span>}

                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                  onChange={(event) =>
                    setSelectedFiles(
                      Array.from(event.target.files || [])
                    )
                  }
                  disabled={saving}
                />

                <small>
                  Up to 10 files per upload. Backend limit: 20 MB per file.
                </small>
              </label>

              {selectedFiles.length > 0 && (
                <div className="notes-selected-files notes-field-wide">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`}>
                      <span>
                        <FiUpload /> {file.name}
                      </span>

                      <small>{formatSize(file.size)}</small>
                    </div>
                  ))}
                </div>
              )}

              {editingNote?.attachments?.length > 0 && (
                <div className="notes-existing-files notes-field-wide">
                  <strong>Existing attachments</strong>

                  {editingNote.attachments.map((file) => (
                    <div key={file.id}>
                      <span>
                        <FiFileText />
                        {file.originalName}
                      </span>

                      {can("update") && (
                        <button
                          type="button"
                          className="notes-remove-file"
                          onClick={() =>
                            handleRemoveAttachment(editingNote, file)
                          }
                          disabled={actionId === editingNote.id}
                        >
                          <FiTrash2 />
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="notes-form-actions">
              <button
                type="button"
                className="notes-btn notes-btn-light"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="notes-btn notes-btn-primary"
                disabled={saving || loadingSubjects}
              >
                {saving
                  ? "Saving..."
                  : editingNote
                    ? "Update Note"
                    : "Create Draft"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* NOTES LIST */}

      <section className="notes-card">
        <div className="notes-section-heading notes-list-heading">
          <div>
            <h2>All Notes</h2>

            <p>
              {pagination.total || 0} note(s) found
            </p>
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

            <select
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(event.target.value)
              }
              aria-label="Filter by course"
            >
              <option value="">All Courses</option>

              {courses.map((course) => (
                <option
                  key={getCourseId(course)}
                  value={getCourseId(course)}
                >
                  {course.courseTitle}
                </option>
              ))}
            </select>

            <select
              value={subjectFilter}
              onChange={(event) =>
                setSubjectFilter(event.target.value)
              }
              aria-label="Filter by subject"
            >
              <option value="">All Subjects</option>

              {allSubjects.map((subject) => (
                <option
                  key={getSubjectId(subject)}
                  value={getSubjectId(subject)}
                >
                  {subject.subjectName}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by status"
            >
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
                <tr>
                  <td colSpan="7" className="notes-empty">
                    Loading notes...
                  </td>
                </tr>
              ) : notes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="notes-empty">
                    No notes found.
                  </td>
                </tr>
              ) : (
                notes.map((note, index) => (
                  <tr key={note.id}>
                    <td>
                      {(page - 1) * limit + index + 1}
                    </td>

                    <td>
                      <strong>{note.title}</strong>

                      {note.description && (
                        <small className="notes-description">
                          {note.description}
                        </small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {note.course?.title || "—"}
                      </strong>

                      <small className="notes-description">
                        {note.subject?.name ||
                          "General course note"}
                      </small>
                    </td>

                    <td>
                      {note.attachments?.length || 0} file(s)
                    </td>

                    <td>
                      <span
                        className={`notes-status notes-status-${String(
                          note.status
                        ).toLowerCase()}`}
                      >
                        {note.status}
                      </span>
                    </td>

                    <td>{formatDate(note.createdAt)}</td>

                    <td>
                      <div className="notes-row-actions">
                        {note.attachments?.map((file) => (
                          <React.Fragment key={file.id}>
                            <button
                              type="button"
                              title={`View ${file.originalName}`}
                              onClick={() =>
                                handleFile(note, file, "view")
                              }
                              disabled={actionId === note.id}
                            >
                              <FiEye />
                            </button>

                            <button
                              type="button"
                              title={`Download ${file.originalName}`}
                              onClick={() =>
                                handleFile(note, file, "download")
                              }
                              disabled={actionId === note.id}
                            >
                              <FiDownload />
                            </button>
                          </React.Fragment>
                        ))}

                        {can("update") && (
                          <button
                            type="button"
                            title="Edit note"
                            onClick={() => openEdit(note)}
                            disabled={actionId === note.id}
                          >
                            <FiEdit2 />
                          </button>
                        )}

                        {can("publish") && (
                          <button
                            type="button"
                            title={
                              note.status === "Published"
                                ? "Move to Draft"
                                : "Publish"
                            }
                            onClick={() =>
                              handleStatus(
                                note,
                                note.status === "Published"
                                  ? "Draft"
                                  : "Published"
                              )
                            }
                            disabled={actionId === note.id}
                          >
                            <FiCheckCircle />
                          </button>
                        )}

                        {can("delete") && (
                          <button
                            type="button"
                            className="notes-delete-action"
                            title="Delete note"
                            onClick={() => handleDelete(note)}
                            disabled={actionId === note.id}
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

        <Pagination
          page={page}
          totalPages={pagination.totalPages || 0}
          total={pagination.total || 0}
          itemCount={notes.length}
          itemLabel="notes"
          limit={limit}
          loading={loading}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      </section>
    </main>
  );
}