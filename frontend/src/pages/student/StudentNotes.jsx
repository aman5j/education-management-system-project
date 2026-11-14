
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiDownload,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { FaBookOpen, FaRegCalendarAlt, FaFile } from "react-icons/fa";

import bgnotes from "../../assets/notesbg1.png";
import {
  getStudentNotes,
  getStudentNote,
  getStudentNoteFile,
} from "../../services/notesService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

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

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

export default function StudentNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const [selectedNote, setSelectedNote] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fileAction, setFileAction] = useState("");

  // Load all published notes available to the logged-in student.
  const loadNotes = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await getStudentNotes();
      const list = response?.data?.data?.notes;

      setNotes(Array.isArray(list) ? list : []);
    } catch (error) {
      setNotes([]);
      notification.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Close the details modal with the Escape key.
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedNote(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Build course options from the notes already loaded.
  const courses = useMemo(() => {
    const map = new Map();

    notes.forEach((note) => {
      if (note.course?.id) {
        map.set(
          String(note.course.id),
          note.course.title || "Course"
        );
      }
    });

    return [...map.entries()].map(([id, title]) => ({
      id,
      title,
    }));
  }, [notes]);

  // Build subject options from the notes already loaded.
  const subjects = useMemo(() => {
    const map = new Map();

    notes.forEach((note) => {
      if (note.subject?.id) {
        map.set(
          String(note.subject.id),
          note.subject.name || "Subject"
        );
      }
    });

    return [...map.entries()].map(([id, name]) => ({
      id,
      name,
    }));
  }, [notes]);

  // Search and filter on the frontend. No pagination is required here.
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes.filter((note) => {
      const searchableText = [
        note.title,
        note.description,
        note.course?.title,
        note.subject?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesCourse =
        courseFilter === "all" ||
        String(note.course?.id) === courseFilter;

      const matchesSubject =
        subjectFilter === "all" ||
        String(note.subject?.id || "") === subjectFilter;

      return (
        matchesSearch &&
        matchesCourse &&
        matchesSubject
      );
    });
  }, [notes, search, courseFilter, subjectFilter]);

  // Fetch complete note details before showing attachments.
  const openNote = async (note) => {
    setSelectedNote(note);
    setDetailLoading(true);

    try {
      const response = await getStudentNote(note.id);
      const detail = response?.data?.data?.note;

      if (detail) {
        setSelectedNote(detail);
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setDetailLoading(false);
    }
  };

  // View or download a note attachment.
  const handleFile = async (note, file, action) => {
    const actionKey = `${file.id}-${action}`;

    setFileAction(actionKey);

    let blobUrl = null;

    try {
      const response = await getStudentNoteFile(
        note.id,
        file.id,
        action
      );

      const blob = response.data;

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The requested attachment is empty or unavailable.");
      }

      blobUrl = URL.createObjectURL(blob);

      if (action === "download") {
        const anchor = document.createElement("a");

        anchor.href = blobUrl;
        anchor.download =
          file.originalName || "note-attachment";

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        notification.success("Attachment downloaded successfully.");

        window.setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 1000);

        blobUrl = null;
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

        window.setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000);

        blobUrl = null;
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      setFileAction("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCourseFilter("all");
    setSubjectFilter("all");
  };

  const hasFilters =
    Boolean(search.trim()) ||
    courseFilter !== "all" ||
    subjectFilter !== "all";

  return (
    <section className="student-notes">
      <div className="page-header">
        <div>
          <h1>My Notes</h1>
        </div>

        <button
          type="button"
          className="themebtn themebtn-outline"
          onClick={() => loadNotes(true)}
          disabled={refreshing || loading}
        >
          <FiRefreshCw
            className={refreshing ? "sn-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <section className="sn-panel">
        {loading ? (
          <div className="sn-state">
            <FiRefreshCw className="sn-spin" />
            <h3>Loading your notes</h3>
            <p>Retrieving published study materials.</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="sn-state common-card">
            <FiFileText />
            <h3>No notes available yet</h3>
            <p>
              Published notes for your active course admissions
              will appear here.
            </p>

            <button
              type="button"
              onClick={() => loadNotes()}
              disabled={refreshing}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="common-card">
            <div className="panel-header">
              <div>
                <h3>All Assigned Notes</h3>
              </div>

              <div className="filterheader margin-remove">
                <div className="right-filter">
                  <div className="input-search">
                    <FiSearch />

                    <input
                      type="search"
                      value={search}
                      onChange={(event) =>
                        setSearch(event.target.value)
                      }
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
                  </div>

                  <div className="input-search">
                    <select
                      value={courseFilter}
                      onChange={(event) => {
                        setCourseFilter(event.target.value);
                        setSubjectFilter("all");
                      }}
                      aria-label="Filter by course"
                    >
                      <option value="all">All courses</option>

                      {courses.map((course) => (
                        <option
                          key={course.id}
                          value={course.id}
                        >
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-search">
                    <select
                      value={subjectFilter}
                      onChange={(event) =>
                        setSubjectFilter(event.target.value)
                      }
                      aria-label="Filter by subject"
                    >
                      <option value="all">All subjects</option>

                      {subjects
                        .filter(
                          (subject) =>
                            courseFilter === "all" ||
                            notes.some(
                              (note) =>
                                String(note.course?.id) ===
                                  courseFilter &&
                                String(note.subject?.id) ===
                                  subject.id
                            )
                        )
                        .map((subject) => (
                          <option
                            key={subject.id}
                            value={subject.id}
                          >
                            {subject.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {hasFilters && (
                    <button
                      type="button"
                      className="themebtn themebtn-outline"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="cardbody">
              {filteredNotes.length === 0 ? (
                <div className="sn-state">
                  <FiSearch />
                  <h3>No matching notes</h3>
                  <p>
                    Try changing your search or filters.
                  </p>

                  <button
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="sn-grid">
                  {filteredNotes.map((note) => (
                    <article
                      className="common-card"
                      key={note.id}
                    >
                      <div className="sn-card__top">
                        <img src={bgnotes} alt="Note" />
                      </div>

                      <div className="cardbody course-details">
                        <h2>{note.title}</h2>

                        <h6>
                          Course: {note.course?.title || "Course"}
                        </h6>

                        <p className="course-description">
                          {note.description ||
                            "Study material shared by your institute."}
                        </p>

                        <ul>
                          <li>
                            <FaRegCalendarAlt />
                            <span>
                              Created Date:{" "}
                              {formatDate(
                                note.publishedAt || note.createdAt
                              )}
                            </span>
                          </li>

                          <li>
                            <FaBookOpen />
                            <span>
                              Subject:{" "}
                              {note.subject?.name ||
                                "General course note"}
                            </span>
                          </li>

                          <li>
                            <FaFile />
                            <span>
                              Attachment:{" "}
                              {note.attachments?.length || 0} file(s)
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="sn-card__footer">
                        <button
                          className="themebtn themebtn-outline fullwidth"
                          type="button"
                          onClick={() => openNote(note)}
                        >
                          View Notes
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {selectedNote && (
        <div
          className="sn-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNote(null);
            }
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
                <h2 id="sn-modal-title">Download Notes</h2>
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
                <div className="student-documents-grid">
                  {(selectedNote.attachments || []).length === 0 ? (
                    <p>No attachments are available.</p>
                  ) : (
                    selectedNote.attachments.map((file) => (
                      <div
                        className="student-document-card"
                        key={file.id}
                      >
                        <div className="student-document-file-icon image-file">
                          <FiFileText />
                        </div>

                        <div className="student-document-info">
                          <strong>{file.originalName}</strong>

                          <span>
                            {formatSize(file.fileSize)} ·{" "}
                            {file.mimeType || "File"}
                          </span>
                        </div>

                        <div className="student-document-actions">
                          <button
                            type="button"
                            title="View attachment"
                            onClick={() =>
                              handleFile(
                                selectedNote,
                                file,
                                "view"
                              )
                            }
                            disabled={Boolean(fileAction)}
                          >
                            {fileAction === `${file.id}-view` ? (
                              "..."
                            ) : (
                              <FiEye />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Download attachment"
                            onClick={() =>
                              handleFile(
                                selectedNote,
                                file,
                                "download"
                              )
                            }
                            disabled={Boolean(fileAction)}
                          >
                            {fileAction === `${file.id}-download` ? (
                              "..."
                            ) : (
                              <FiDownload />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
