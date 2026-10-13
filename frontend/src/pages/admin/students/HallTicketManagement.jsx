import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload } from "react-icons/fi";
import { generateHallTicketPDF } from "../../../utils/generateHallTicketPDF";

import {
  FiCheckCircle,
  FiRefreshCw,
  FiSearch,
  FiFileText,
  FiX,
} from "react-icons/fi";


import { getCourses } from "../../../services/courseService";
import { getExams } from "../../../services/examService";
import { getStudents } from "../../../services/studentService";
import {
  getHallTickets,
  generateHallTickets,
  cancelHallTicket,
} from "../../../services/hallTicketService";

import "../../../styles/HallTicketManagement.css";

const PAGE_SIZE = 10;

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

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getFullName = (student) =>
  [student?.firstName, student?.surname].filter(Boolean).join(" ") ||
  "Unnamed student";

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

const todayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function HallTicketManagement() {
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [courseId, setCourseId] = useState("");
  const [examId, setExamId] = useState("");
  const [examDate, setExamDate] = useState(todayString());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reportingTime, setReportingTime] = useState("09:30");

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketPage, setTicketPage] = useState(1);

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedExam = exams.find((exam) => exam._id === examId);


  
    const handleDownloadPDF = async (ticket) => {
    setError("");
    setSuccess("");

    try {
        await generateHallTicketPDF({ ticket });
        setSuccess(`Hall ticket ${ticket.hallTicketNo} downloaded.`);
    } catch (err) {
        setError(
        err?.response?.data?.message ||
            err?.message ||
            "Unable to generate the hall ticket PDF."
        );
    }
    };


  const filteredStudents = useMemo(() => {
    const value = studentSearch.trim().toLowerCase();

    if (!value) return students;

    return students.filter((student) => {
      const searchable = [
        getFullName(student),
        student.rollNo,
        student.mobile,
        student.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(value);
    });
  }, [students, studentSearch]);

  const visibleSelectedCount = filteredStudents.filter((student) =>
    selectedStudents.includes(student._id)
  ).length;

  const allVisibleSelected =
    filteredStudents.length > 0 &&
    visibleSelectedCount === filteredStudents.length;

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);

    try {
      const response = await getCourses({ page: 1, limit: 100 });
      setCourses(getArray(response, ["courses"]));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);

    try {
      const response = await getHallTickets({
        page: ticketPage,
        limit: PAGE_SIZE,
        search: ticketSearch || undefined,
      });

      const root = unwrap(response);
      const data = root?.data ?? root;

      setTickets(data?.hallTickets || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingTickets(false);
    }
  }, [ticketPage, ticketSearch]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const loadExamsForCourse = async (nextCourseId) => {
    setCourseId(nextCourseId);
    setExamId("");
    setExams([]);
    setStudents([]);
    setSelectedStudents([]);
    setStudentSearch("");
    setError("");
    setSuccess("");

    if (!nextCourseId) return;

    setLoadingExams(true);
    setLoadingStudents(true);

    try {
      const [examResponse, studentResponse] = await Promise.all([
        getExams({
          course_id: nextCourseId,
          page: 1,
          limit: 100,
        }),
        getStudents({
          course_id: nextCourseId,
          status: "active",
          page: 1,
          limit: 100,
          sortBy: "firstName",
          sortOrder: "asc",
        }),
      ]);

      const examRoot = unwrap(examResponse);
      const examData = examRoot?.data ?? examRoot;
      setExams(examData?.exams || getArray(examResponse, ["exams"]));

      const studentRoot = unwrap(studentResponse);
      const studentData = studentRoot?.data ?? studentRoot;
      const rows =
        studentData?.students || getArray(studentResponse, ["students"]);

      setStudents(
        rows.filter(
          (student) =>
            student.status === "active" &&
            String(
              typeof student.course_id === "object"
                ? student.course_id?._id
                : student.course_id
            ) === String(nextCourseId)
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingExams(false);
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (id, checked) => {
    setSelectedStudents((current) =>
      checked
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((studentId) => studentId !== id)
    );
  };

  const toggleVisibleStudents = (checked) => {
    setSelectedStudents((current) => {
      const next = new Set(current);

      filteredStudents.forEach((student) => {
        if (checked) next.add(student._id);
        else next.delete(student._id);
      });

      return [...next];
    });
  };

  const handleExamChange = (nextExamId) => {
    setExamId(nextExamId);
    setError("");
    setSuccess("");
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!courseId) {
      setError("Please select a course.");
      return;
    }

    if (!examId) {
      setError("Please select an exam.");
      return;
    }

    if (!examDate) {
      setError("Please select the exam date.");
      return;
    }

    if (!startTime || !endTime || !reportingTime) {
      setError("Please complete all exam times.");
      return;
    }

    if (startTime >= endTime) {
      setError("End time must be later than start time.");
      return;
    }

    if (reportingTime > startTime) {
      setError("Reporting time must be at or before the start time.");
      return;
    }

    if (selectedStudents.length === 0) {
      setError("Select at least one student.");
      return;
    }

    setSaving(true);

    try {
      const response = await generateHallTickets({
        course_id: courseId,
        exam_id: examId,
        examDate,
        startTime,
        endTime,
        reportingTime,
        studentIds: selectedStudents,
      });

      const root = unwrap(response);
      setSuccess(
        root?.message ||
          `Generated ${root?.generatedCount || 0} hall ticket(s).`
      );

      setSelectedStudents([]);
      setStudentSearch("");
      await loadTickets();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTicket = async (ticket) => {
    const name = getFullName(ticket.student_id);

    if (
      !window.confirm(
        `Cancel hall ticket ${ticket.hallTicketNo} for ${name}?`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await cancelHallTicket(ticket._id);
      const root = unwrap(response);

      setSuccess(root?.message || "Hall ticket cancelled.");
      await loadTickets();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <main className="hall-ticket-page">
      <header className="hall-ticket-header">
        <div>
          <span className="hall-ticket-eyebrow">
            STUDENTS / HALL TICKET MANAGEMENT
          </span>
          <h1>Generate Hall Tickets</h1>
          <p>
            Choose a saved exam, set its schedule, and assign it to selected
            active students.
          </p>
        </div>

        <button
          type="button"
          className="hall-ticket-secondary-btn"
          onClick={() => {
            loadCourses();
            loadTickets();
          }}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && (
        <div className="hall-ticket-alert hall-ticket-alert-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}

      {success && (
        <div
          className="hall-ticket-alert hall-ticket-alert-success"
          role="status"
        >
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss">
            <FiX />
          </button>
        </div>
      )}

      <section className="hall-ticket-card">
        <div className="hall-ticket-section-heading">
          <div className="hall-ticket-heading-icon">
            <FiFileText />
          </div>
          <div>
            <h2>Hall Ticket Details</h2>
            <p>Choose the exam schedule and students.</p>
          </div>
        </div>

        <form onSubmit={handleGenerate}>
          <div className="hall-ticket-form-grid">
            <label className="hall-ticket-field hall-ticket-field-wide">
              Select Course <span>*</span>
              <select
                value={courseId}
                onChange={(event) => loadExamsForCourse(event.target.value)}
                disabled={loadingCourses || saving}
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

            <label className="hall-ticket-field hall-ticket-field-wide">
              Select Exam <span>*</span>
              <select
                value={examId}
                onChange={(event) => handleExamChange(event.target.value)}
                disabled={!courseId || loadingExams || saving}
                required
              >
                <option value="">
                  {!courseId
                    ? "Select course first"
                    : loadingExams
                      ? "Loading exams..."
                      : "Select exam"}
                </option>
                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.course_id?.courseTitle || "Exam"} —{" "}
                    {exam.totalQuestions} questions / {exam.totalMarks} marks
                    {exam.createdAt
                      ? ` — Created ${formatDate(exam.createdAt)}`
                      : ""}
                  </option>
                ))}
              </select>
              {courseId && !loadingExams && exams.length === 0 && (
                <small>No exams have been created for this course.</small>
              )}
            </label>

            {selectedExam && (
              <div className="hall-ticket-exam-summary hall-ticket-field-wide">
                <div>
                  <span>Total Questions</span>
                  <strong>{selectedExam.totalQuestions}</strong>
                </div>
                <div>
                  <span>Total Marks</span>
                  <strong>{selectedExam.totalMarks}</strong>
                </div>
                <div>
                  <span>Marks / Question</span>
                  <strong>{selectedExam.marksPerQuestion}</strong>
                </div>
              </div>
            )}

            <label className="hall-ticket-field">
              Exam Date <span>*</span>
              <input
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                required
              />
            </label>

            <label className="hall-ticket-field">
              Start Time <span>*</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>

            <label className="hall-ticket-field">
              End Time <span>*</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </label>

            <label className="hall-ticket-field">
              Reporting Time <span>*</span>
              <input
                type="time"
                value={reportingTime}
                onChange={(event) => setReportingTime(event.target.value)}
                required
              />
            </label>
          </div>

          <div className="hall-ticket-student-heading">
            <div>
              <h2>Select Students</h2>
              <p>
                Only active students assigned to the selected course are shown.
              </p>
            </div>
            <span className="hall-ticket-selected-count">
              {selectedStudents.length} selected
            </span>
          </div>

          <div className="hall-ticket-student-toolbar">
            <label className="hall-ticket-search">
              <FiSearch />
              <input
                type="search"
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search name, roll number or mobile..."
                disabled={!courseId || loadingStudents}
              />
            </label>

            <label className="hall-ticket-select-all">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) =>
                  toggleVisibleStudents(event.target.checked)
                }
                disabled={filteredStudents.length === 0}
              />
              Select visible
            </label>
          </div>

          <div className="hall-ticket-student-table-wrap">
            <table className="hall-ticket-table">
              <thead>
                <tr>
                  <th aria-label="Select student"></th>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Roll No</th>
                  <th>Mobile</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents ? (
                  <tr>
                    <td colSpan="5" className="hall-ticket-empty">
                      Loading students...
                    </td>
                  </tr>
                ) : !courseId ? (
                  <tr>
                    <td colSpan="5" className="hall-ticket-empty">
                      Select a course to load eligible students.
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="hall-ticket-empty">
                      No active students found for this course.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr
                      key={student._id}
                      className={
                        selectedStudents.includes(student._id)
                          ? "hall-ticket-student-selected"
                          : ""
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(event) =>
                            toggleStudent(student._id, event.target.checked)
                          }
                          aria-label={`Select ${getFullName(student)}`}
                        />
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{getFullName(student)}</strong>
                      </td>
                      <td>{student.rollNo || "—"}</td>
                      <td>{student.mobile || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="hall-ticket-form-footer">
            <span>
              {selectedStudents.length} student(s) selected for this exam.
            </span>
            <button
              type="submit"
              className="hall-ticket-primary-btn"
              disabled={
                saving ||
                !courseId ||
                !examId ||
                selectedStudents.length === 0 ||
                loadingStudents
              }
            >
              <FiFileText />
              {saving ? "Generating..." : "Generate Hall Tickets"}
            </button>
          </div>
        </form>
      </section>

      <section className="hall-ticket-card">
        <div className="hall-ticket-section-heading hall-ticket-list-heading">
          <div>
            <h2>Generated Hall Tickets</h2>
            <p>Review assigned tickets or cancel an assignment.</p>
          </div>
          <label className="hall-ticket-search hall-ticket-list-search">
            <FiSearch />
            <input
              type="search"
              value={ticketSearch}
              onChange={(event) => {
                setTicketSearch(event.target.value);
                setTicketPage(1);
              }}
              placeholder="Search ticket, student or roll number..."
            />
          </label>
        </div>

        <div className="hall-ticket-student-table-wrap">
          <table className="hall-ticket-table hall-ticket-generated-table">
            <thead>
              <tr>
                <th>Hall Ticket No.</th>
                <th>Student</th>
                <th>Course</th>
                <th>Exam Date</th>
                <th>Exam Time</th>
                <th>Reporting</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingTickets ? (
                <tr>
                  <td colSpan="8" className="hall-ticket-empty">
                    Loading hall tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="hall-ticket-empty">
                    No hall tickets generated yet.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket._id}>
                    <td>
                      <strong>{ticket.hallTicketNo}</strong>
                    </td>
                    <td>
                      <strong>{getFullName(ticket.student_id)}</strong>
                      <small>
                        Roll No: {ticket.student_id?.rollNo || "—"}
                      </small>
                    </td>
                    <td>{ticket.course_id?.courseTitle || "—"}</td>
                    <td>{formatDate(ticket.examDate)}</td>
                    <td>
                      {ticket.startTime}–{ticket.endTime}
                    </td>
                    <td>{ticket.reportingTime}</td>
                    <td>
                      <span
                        className={`hall-ticket-status hall-ticket-status-${ticket.status?.toLowerCase()}`}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td>

                       <button
                        type="button"
                        className="hall-ticket-download-btn"
                        title="Download hall ticket PDF"
                        onClick={() => handleDownloadPDF(ticket)}
                        >
                        <FiDownload />
                        PDF
                        </button>

                      {ticket.status === "Active" ? (
                        <button
                          type="button"
                          className="hall-ticket-cancel-btn"
                          onClick={() => handleCancelTicket(ticket)}
                          title="Cancel hall ticket"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="hall-ticket-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="hall-ticket-pagination">
          <span>Page {ticketPage}</span>
          <div>
            <button
              type="button"
              className="hall-ticket-secondary-btn"
              disabled={ticketPage <= 1 || loadingTickets}
              onClick={() => setTicketPage((page) => page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="hall-ticket-secondary-btn"
              disabled={tickets.length < PAGE_SIZE || loadingTickets}
              onClick={() => setTicketPage((page) => page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}