
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
import { FaBookOpen, FaRegCalendarAlt } from "react-icons/fa";
import { FaFile } from "react-icons/fa";
import bgnotes from "../../assets/notesbg1.png";

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
     <div class="page-header"><div><h1>My Notes</h1></div>
      
     </div>

      {/* <div className="sn-summary">
        <article class="dashboard-stat-card card-success">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-success"><FiFileText /></div>
            </div>
            <div class="stat-card-body">
              <span class="stat-card-title">Available Notes</span>
              <strong class="stat-card-value">{notes.length}</strong>
              </div>
              </article>

               <article class="dashboard-stat-card card-purple">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-purple"><FiBookOpen /></div>
            </div>
            <div class="stat-card-body">
              <span class="stat-card-title">Enrolled Courses</span>
              <strong class="stat-card-value">{courses.length}</strong>
              </div>
              </article>

               <article class="dashboard-stat-card card-bluewarning">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-bluewarning"><FiDownload /></div>
            </div>
            <div class="stat-card-body">
              <span class="stat-card-title">Study Attachments</span>
              <strong class="stat-card-value"> {notes.reduce(
                (total, note) => total + (note.attachments?.length || 0),
                0
              )}</strong>
              </div>
              </article>
      </div> */}

      {error && (
        <div className="sn-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}


 

      <section className="sn-panel">

        {loading ? (
          <div className="sn-state">
            <FiRefreshCw className="sn-spin" />
            <h3>Loading your notes</h3>
            <p>Retrieving published study materials.</p>
          </div>
        ) : error && notes.length === 0 ? (
          <div className="sn-state common-card">
            <FiFileText />
            <h3>Notes could not be loaded</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadNotes()}>
              Try again
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="sn-state common-card">
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
          <div className="common-card">
            <div class="panel-header"><div><h3>All Assigned Notes</h3> </div>
              <div className="filterheader margin-remove">
            <div className="right-filter">
                <div className="input-search">
              <FiSearch />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notes..."
                aria-label="Search notes"
              />

              {/* {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <FiX />
                </button>
              )} */}
            </div>
            <div className="input-search">
          
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
            </div>

            <div className="input-search">
          
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
            </div>
          </div>

            
          </div>
            </div>
            <div className="cardbody">
          <div className="sn-grid">
            {filteredNotes.map((note) => (
              <article className="common-card" key={note.id}>
                <div className="sn-card__top">
                  <img src={bgnotes} alt="Note" />
                </div>

                <div className="cardbody course-details">
                  {/* <div className="category-label">
                    Published
                  </div> */}
                  

                  <h2>{note.title}</h2>
                    <h6>
                  Course:   {note.course?.title || "Course"}
                  </h6>
                   <p className="course-description">
                    {note.description || "Study material shared by your institute."}
                  </p>

                    <ul>
                                      <li>
                                        <FaRegCalendarAlt />
                  
                                        <span>Created Date:   {formatDate(note.publishedAt || note.createdAt)}</span>
                                      </li>
                                       <li>
                                        <FaBookOpen />
                                        <span> Subject:  {note.subject?.name || "General course note"}</span>
                                      </li>
                                      <li>
                                         <FaFile />

                  
                  
                                        <span>Attachment: {note.attachments?.length || 0} file(s)</span>
                                      </li>
                  
                                     
                  
                                    </ul>

                

                </div>

                <div className="sn-card__footer">
                 

                  <button className="themebtn themebtn-outline fullwidth" type="button" onClick={() => openNote(note)}>
                    View Notes
                  </button>
                </div>
              </article>
            ))}
          </div>
          </div>
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
                <>
                  
                  <div className="student-documents-grid">
                    {(selectedNote.attachments || []).length === 0 ? (
                      <p>No attachments are available.</p>
                    ) : (
                      selectedNote.attachments.map((file) => (
                        <div className="student-document-card" key={file.id}>
                          <div className="student-document-file-icon image-file">
                              <FiFileText />
                          </div>
                         

                          <div className="student-document-info">
                            <strong>{file.originalName}</strong>
                            <span>
                              {formatSize(file.fileSize)} · {file.mimeType || "File"}
                            </span>
                          </div>

                          <div className="student-document-actions">
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
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
