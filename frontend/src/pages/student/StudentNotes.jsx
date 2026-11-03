
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiDownload,
  FiEye,
  FiFileText,
  FiFilter,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";

import {
  getStudentNotes,
  getStudentNote,
  getStudentNoteFile,
} from "../../services/notesService";

import "./StudentNotes.css";

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
  const size = Number(bytes || 0);

  if (!size) return "—";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getError = (error) =>
  error?.response?.data?.message ||
  "Unable to complete this request. Please try again.";

export default function StudentNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedNote, setSelectedNote] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fileAction, setFileAction] = useState("");

  const loadNotes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await getStudentNotes();
      const list = response?.data?.data?.notes;

      setNotes(Array.isArray(list) ? list : []);
    } catch (err) {
      setNotes([]);
      setError(getError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setSelectedNote(null);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const courses = useMemo(() => {
    const map = new Map();

    notes.forEach((note) => {
      if (note.course?.id) {
        map.set(String(note.course.id), note.course.title || "Course");
      }
    });

    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [notes]);

  const subjects = useMemo(() => {
    const map = new Map();

    notes.forEach((note) => {
      if (note.subject?.id) {
        map.set(String(note.subject.id), note.subject.name || "Subject");
      }
    });

    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesSearch =
        !query ||
        [note.title, note.description, note.course?.title, note.subject?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesCourse =
        courseFilter === "all" ||
        String(note.course?.id) === courseFilter;

      const matchesSubject =
        subjectFilter === "all" ||
        String(note.subject?.id || "") === subjectFilter;

      return matchesSearch && matchesCourse && matchesSubject;
    });
  }, [notes, search, courseFilter, subjectFilter]);

  const openNote = async (note) => {
    setSelectedNote(note);
    setDetailLoading(true);

    try {
      const response = await getStudentNote(note.id);
      const detail = response?.data?.data?.note;

      if (detail) setSelectedNote(detail);
    } catch (err) {
      setError(getError(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFile = async (note, file, action) => {
    const actionKey = `${file.id}-${action}`;
    setFileAction(actionKey);
    setError("");

    try {
      const response = await getStudentNoteFile(
        note.id,
        file.id,
        action
      );

      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);

      if (action === "download") {
        const anchor = document.createElement("a");
        anchor.href = blobUrl;
        anchor.download = file.originalName || "note-attachment";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        const openedWindow = window.open(
          blobUrl,
          "_blank",
          "noopener,noreferrer"
        );

        if (!openedWindow) {
          const anchor = document.createElement("a");
          anchor.href = blobUrl;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }

        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    } catch (err) {
      setError(getError(err));
    } finally {
      setFileAction("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCourseFilter("all");
    setSubjectFilter("all");
  };

  const hasFilters =
    Boolean(search) ||
    courseFilter !== "all" ||
    subjectFilter !== "all";

  return (
    <section className="student-notes">
      <header className="sn-heading">
        <div>
          <span className="sn-eyebrow">LEARNING MATERIAL</span>
          <h1>My Notes</h1>
          <p>
            Access course notes and study materials shared by your institute.
          </p>
        </div>

        <button
          type="button"
          className="sn-refresh"
          onClick={() => loadNotes(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw className={refreshing ? "sn-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="sn-summary">
        <article>
          <span className="sn-summary__icon"><FiFileText /></span>
          <div>
            <small>Available Notes</small>
            <strong>{notes.length}</strong>
          </div>
        </article>

        <article>
          <span className="sn-summary__icon"><FiBookOpen /></span>
          <div>
            <small>Enrolled Courses</small>
            <strong>{courses.length}</strong>
          </div>
        </article>

        <article>
          <span className="sn-summary__icon"><FiDownload /></span>
          <div>
            <small>Study Attachments</small>
            <strong>
              {notes.reduce(
                (total, note) => total + (note.attachments?.length || 0),
                0
              )}
            </strong>
          </div>
        </article>
      </div>

      {error && (
        <div className="sn-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}

      <section className="sn-panel">
        <div className="sn-toolbar">
          <div>
            <h2>Course Notes</h2>
            <p>
              Showing {filteredNotes.length} of {notes.length} available notes
            </p>
          </div>

          <div className="sn-toolbar__actions">
            <label className="sn-search">
              <FiSearch />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notes..."
                aria-label="Search notes"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )}
            </label>

            <button
              type="button"
              className={`sn-filter-button ${showFilters ? "is-active" : ""}`}
              onClick={() => setShowFilters((value) => !value)}
              aria-expanded={showFilters}
            >
              <FiFilter /> Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="sn-filter-panel">
            <label>
              Course
              <select
                value={courseFilter}
                onChange={(event) => {
                  setCourseFilter(event.target.value);
                  setSubjectFilter("all");
                }}
              >
                <option value="all">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Subject
              <select
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                <option value="all">All subjects</option>
                {subjects
                  .filter((subject) =>
                    courseFilter === "all" ||
                    notes.some(
                      (note) =>
                        String(note.course?.id) === courseFilter &&
                        String(note.subject?.id) === subject.id
                    )
                  )
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
              </select>
            </label>

            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="sn-state">
            <FiRefreshCw className="sn-spin" />
            <h3>Loading your notes</h3>
            <p>Retrieving published study materials.</p>
          </div>
        ) : error && notes.length === 0 ? (
          <div className="sn-state">
            <FiFileText />
            <h3>Notes could not be loaded</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadNotes()}>
              Try again
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="sn-state">
            <FiBookOpen />
            <h3>{hasFilters ? "No matching notes" : "No notes available yet"}</h3>
            <p>
              {hasFilters
                ? "Try changing your search or filters."
                : "Published notes for your active course admissions will appear here."}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="sn-grid">
            {filteredNotes.map((note) => (
              <article className="sn-card" key={note.id}>
                <div className="sn-card__top">
                  <span className="sn-card__icon"><FiFileText /></span>
                  <span className="sn-published">Published</span>
                </div>

                <div className="sn-card__body">
                  <span className="sn-course-name">
                    {note.course?.title || "Course"}
                  </span>

                  <h3>{note.title}</h3>

                  <p className="sn-description">
                    {note.description || "Study material shared by your institute."}
                  </p>

                  <div className="sn-meta">
                    <span>
                      <FiBookOpen />
                      {note.subject?.name || "General course note"}
                    </span>
                    <span>
                      <FiCalendar />
                      {formatDate(note.publishedAt || note.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="sn-card__footer">
                  <span>
                    <FiFileText />
                    {note.attachments?.length || 0} attachment(s)
                  </span>

                  <button type="button" onClick={() => openNote(note)}>
                    View Notes <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedNote && (
        <div
          className="sn-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedNote(null);
          }}
        >
          <section
            className="sn-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sn-modal-title"
          >
            <header className="sn-modal__header">
              <div>
                <span className="sn-eyebrow">PUBLISHED STUDY MATERIAL</span>
                <h2 id="sn-modal-title">{selectedNote.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                aria-label="Close note details"
              >
                <FiX />
              </button>
            </header>

            <div className="sn-modal__content">
              {detailLoading ? (
                <div className="sn-modal__loading">
                  <FiRefreshCw className="sn-spin" />
                  Loading note details...
                </div>
              ) : (
                <>
                  <div className="sn-detail-facts">
                    <div>
                      <small>Course</small>
                      <strong>{selectedNote.course?.title || "—"}</strong>
                    </div>
                    <div>
                      <small>Subject</small>
                      <strong>
                        {selectedNote.subject?.name || "General course note"}
                      </strong>
                    </div>
                    <div>
                      <small>Published</small>
                      <strong>
                        {formatDate(selectedNote.publishedAt || selectedNote.createdAt)}
                      </strong>
                    </div>
                  </div>

                  {selectedNote.description && (
                    <div className="sn-detail-description">
                      <h3>Description</h3>
                      <p>{selectedNote.description}</p>
                    </div>
                  )}

                  <div className="sn-attachments">
                    <h3>Attachments</h3>

                    {(selectedNote.attachments || []).length === 0 ? (
                      <p>No attachments are available.</p>
                    ) : (
                      selectedNote.attachments.map((file) => (
                        <article key={file.id}>
                          <span className="sn-attachment-icon"><FiFileText /></span>
                          <div className="sn-attachment-info">
                            <strong>{file.originalName}</strong>
                            <small>
                              {formatSize(file.fileSize)} · {file.mimeType || "File"}
                            </small>
                          </div>

                          <div className="sn-attachment-actions">
                            <button
                              type="button"
                              title="View attachment"
                              onClick={() => handleFile(selectedNote, file, "view")}
                              disabled={Boolean(fileAction)}
                            >
                              {fileAction === `${file.id}-view` ? "..." : <FiEye />}
                            </button>
                            <button
                              type="button"
                              title="Download attachment"
                              onClick={() => handleFile(selectedNote, file, "download")}
                              disabled={Boolean(fileAction)}
                            >
                              {fileAction === `${file.id}-download` ? "..." : <FiDownload />}
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            <footer className="sn-modal__footer">
              <span>Only you can access materials for your active admissions.</span>
              <button type="button" onClick={() => setSelectedNote(null)}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
