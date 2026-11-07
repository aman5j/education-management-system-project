import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiDownload,
  FiRefreshCw,
  FiSearch,
  FiFileText,
  FiX,
} from "react-icons/fi";

import { getCourses } from "../../../services/courseService";
import { getExams, getExam } from "../../../services/examService";
import { generateHallTicketPDF } from "../../../utils/generateHallTicketPDF";

import {
  getHallTickets,
  getEligibleHallTicketStudents,
  generateHallTickets,
  cancelHallTicket,
  rescheduleMissedHallTicket,
} from "../../../services/hallTicketService";

import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

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

const getFullName = (student) =>
  [
    student?.firstName,
    student?.middleName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Unnamed student";

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
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return parts;
};

const getErrorMessage = (error) => getApiErrorMessage(error);

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
  const [ticketLimit, setTicketLimit] = useState(PAGE_SIZE);
  const [ticketPagination, setTicketPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reissueTicket, setReissueTicket] = useState(null);
  const [reissueDate, setReissueDate] = useState(todayString());
  const [reissueStartTime, setReissueStartTime] = useState("10:00");
  const [reissueEndTime, setReissueEndTime] = useState("12:00");
  const [reissueReportingTime, setReissueReportingTime] =
    useState("09:30");
  const [reissueReason, setReissueReason] = useState("");
  const [reissuing, setReissuing] = useState(false);

  const selectedExam = useMemo(
    () => exams.find((exam) => exam._id === examId),
    [exams, examId]
  );

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
    } catch (error) {
      notification.error(getErrorMessage(error));
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);

    try {
      const response = await getHallTickets({
        page: ticketPage,
        limit: ticketLimit,
        search: ticketSearch.trim() || undefined,
      });

      const root = unwrap(response);
      const data = root?.data ?? root;

      setTickets(data?.hallTickets || []);

      const pagination = data?.pagination || {};

      setTicketPagination({
        page: Number(pagination.page) || ticketPage,
        limit: Number(pagination.limit) || ticketLimit,
        total: Number(pagination.total) || 0,
        totalPages: Number(pagination.totalPages) || 0,
      });
    } catch (error) {
      notification.error(getErrorMessage(error));
    } finally {
      setLoadingTickets(false);
    }
  }, [ticketPage, ticketLimit, ticketSearch]);

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
        getEligibleHallTicketStudents(nextCourseId),
      ]);

      const examRoot = unwrap(examResponse);
      const examData = examRoot?.data ?? examRoot;

      setExams(
        examData?.exams || getArray(examResponse, ["exams"])
      );

      const eligibleStudents = getArray(studentResponse, ["students"]);

      setStudents(
        eligibleStudents.filter(
          (student) => student.status === "active"
        )
      );
    } catch (error) {
      notification.error(getErrorMessage(error));
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

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (!courseId) {
      notification.warning("Please select a course.");
      return;
    }

    if (!examId) {
      notification.warning("Please select an exam.");
      return;
    }

    if (!examDate) {
      notification.warning("Please select the exam date.");
      return;
    }

    if (!startTime || !endTime || !reportingTime) {
      notification.warning("Please complete all exam times.");
      return;
    }

    if (startTime >= endTime) {
      notification.warning("End time must be later than start time.");
      return;
    }

    if (reportingTime > startTime) {
      notification.warning(
        "Reporting time must be at or before the start time."
      );
      return;
    }

    if (selectedStudents.length === 0) {
      notification.warning("Select at least one student.");
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

      notification.success(
        root?.message ||
          `Generated ${root?.generatedCount || 0} hall ticket(s).`
      );

      setSelectedStudents([]);
      setStudentSearch("");

      setTicketPage(1);

      if (ticketPage !== 1) {
        return;
      }

      await loadTickets();
    } catch (error) {
      notification.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTicket = async (ticket) => {
    const name = getFullName(ticket.student_id);

    const confirmed = await notification.confirm({
      title: "Cancel hall ticket?",
      text: `Cancel hall ticket ${ticket.hallTicketNo} for ${name}?`,
      icon: "warning",
      confirmText: "Yes, cancel ticket",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    try {
      const response = await cancelHallTicket(ticket._id);
      const root = unwrap(response);

      notification.success(
        root?.message || "Hall ticket cancelled successfully."
      );

      await loadTickets();
    } catch (error) {
      notification.error(getErrorMessage(error));
    }
  };

  const handleDownloadPDF = async (ticket) => {
    if (ticket.status === "Cancelled") {
      notification.warning(
        "A cancelled hall ticket cannot be downloaded as a valid ticket."
      );
      return;
    }

    try {
      const linkedExamId =
        typeof ticket.exam_id === "object"
          ? ticket.exam_id?._id
          : ticket.exam_id;

      if (!linkedExamId) {
        throw new Error(
          "The exam linked to this hall ticket was not found."
        );
      }

      const response = await getExam(linkedExamId);
      const examResponse =
        response?.data?.data ?? response?.data;

      if (!examResponse) {
        throw new Error(
          "Unable to load exam details for this hall ticket."
        );
      }

      const ticketForPDF = {
        ...ticket,
        exam_id: {
          ...(typeof ticket.exam_id === "object"
            ? ticket.exam_id
            : {}),
          ...examResponse,
        },
      };

      await generateHallTicketPDF({ ticket: ticketForPDF });

      notification.success(
        `Hall ticket ${ticket.hallTicketNo} downloaded.`
      );
    } catch (error) {
      notification.error(getErrorMessage(error));
    }
  };

  const openReissueModal = (ticket) => {
    setReissueTicket(ticket);
    setReissueDate(todayString());
    setReissueStartTime("10:00");
    setReissueEndTime("12:00");
    setReissueReportingTime("09:30");
    setReissueReason("");
  };

  const closeReissueModal = () => {
    if (reissuing) return;
    setReissueTicket(null);
  };

  const handleReissueSubmit = async (event) => {
    event.preventDefault();

    if (!reissueTicket) return;

    if (reissueDate < todayString()) {
      notification.warning("The new exam date cannot be in the past.");
      return;
    }

    if (reissueStartTime >= reissueEndTime) {
      notification.warning("End time must be later than start time.");
      return;
    }

    if (reissueReportingTime > reissueStartTime) {
      notification.warning(
        "Reporting time must be at or before exam start time."
      );
      return;
    }

    if (reissueReason.trim().length < 5) {
      notification.warning(
        "Please enter a reissue reason of at least 5 characters."
      );
      return;
    }

    setReissuing(true);

    try {
      const response = await rescheduleMissedHallTicket(
        reissueTicket._id,
        {
          examDate: reissueDate,
          startTime: reissueStartTime,
          endTime: reissueEndTime,
          reportingTime: reissueReportingTime,
          reason: reissueReason.trim(),
        }
      );

      const root = unwrap(response);

      setReissueTicket(null);

      notification.success(
        root?.message || "Hall ticket reissued successfully."
      );

      await loadTickets();
    } catch (error) {
      notification.error(getErrorMessage(error));
    } finally {
      setReissuing(false);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadCourses(), loadTickets()]);
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
          onClick={handleRefresh}
          disabled={loadingCourses || loadingTickets}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

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
                onChange={(event) =>
                  loadExamsForCourse(event.target.value)
                }
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
                onChange={(event) => setExamId(event.target.value)}
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
                min={todayString()}
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
                            toggleStudent(
                              student._id,
                              event.target.checked
                            )
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
            <p>Review, download, reissue or cancel assigned tickets.</p>
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
                    {ticketSearch.trim()
                      ? "No hall tickets match your search."
                      : "No hall tickets generated yet."}
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
                        title={
                          ticket.status === "Cancelled"
                            ? "Cancelled tickets cannot be downloaded"
                            : "Download hall ticket PDF"
                        }
                        disabled={ticket.status === "Cancelled"}
                        onClick={() => handleDownloadPDF(ticket)}
                      >
                        <FiDownload />
                        PDF
                      </button>

                      {ticket.status === "Active" && (
                        <>
                          <button
                            type="button"
                            className="hall-ticket-reissue-btn"
                            onClick={() => openReissueModal(ticket)}
                            title="Reissue after the original exam window has ended"
                          >
                            <FiRefreshCw />
                            Reissue
                          </button>

                          <button
                            type="button"
                            className="hall-ticket-cancel-btn"
                            onClick={() => handleCancelTicket(ticket)}
                            title="Cancel hall ticket"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {ticket.status !== "Active" && (
                        <span className="hall-ticket-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={ticketPagination.page}
          totalPages={ticketPagination.totalPages}
          total={ticketPagination.total}
          itemCount={tickets.length}
          itemLabel="hall tickets"
          limit={ticketLimit}
          loading={loadingTickets}
          onPageChange={setTicketPage}
          onLimitChange={(nextLimit) => {
            setTicketLimit(nextLimit);
            setTicketPage(1);
          }}
        />
      </section>

      {reissueTicket && (
        <div className="ht-modal-overlay">
          <div className="ht-reissue-modal">
            <div className="ht-modal-header">
              <div>
                <h2>Reissue Hall Ticket</h2>
                <p>
                  Reschedule the missed examination for this student.
                </p>
              </div>

              <button
                type="button"
                onClick={closeReissueModal}
                disabled={reissuing}
                aria-label="Close reissue dialog"
              >
                <FiX />
              </button>
            </div>

            <div className="ht-reissue-student">
              <strong>{getFullName(reissueTicket.student_id)}</strong>

              <span>
                Roll No: {reissueTicket.student_id?.rollNo || "—"}
              </span>

              <span>
                Previous Ticket: {reissueTicket.hallTicketNo}
              </span>
            </div>

            <form onSubmit={handleReissueSubmit}>
              <div className="hall-ticket-form-grid">
                <label className="hall-ticket-field">
                  New Exam Date *
                  <input
                    type="date"
                    value={reissueDate}
                    min={todayString()}
                    onChange={(event) =>
                      setReissueDate(event.target.value)
                    }
                    required
                  />
                </label>

                <label className="hall-ticket-field">
                  Start Time *
                  <input
                    type="time"
                    value={reissueStartTime}
                    onChange={(event) =>
                      setReissueStartTime(event.target.value)
                    }
                    required
                  />
                </label>

                <label className="hall-ticket-field">
                  End Time *
                  <input
                    type="time"
                    value={reissueEndTime}
                    onChange={(event) =>
                      setReissueEndTime(event.target.value)
                    }
                    required
                  />
                </label>

                <label className="hall-ticket-field">
                  Reporting Time *
                  <input
                    type="time"
                    value={reissueReportingTime}
                    onChange={(event) =>
                      setReissueReportingTime(event.target.value)
                    }
                    required
                  />
                </label>

                <label className="hall-ticket-field hall-ticket-field-wide">
                  Reason for Reissue *
                  <textarea
                    value={reissueReason}
                    onChange={(event) =>
                      setReissueReason(event.target.value)
                    }
                    placeholder="Example: Student missed the scheduled examination."
                    minLength={5}
                    maxLength={1000}
                    required
                    rows={3}
                  />
                </label>
              </div>

              <div className="ht-modal-footer">
                <button
                  type="button"
                  className="hall-ticket-secondary-btn"
                  onClick={closeReissueModal}
                  disabled={reissuing}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="hall-ticket-primary-btn"
                  disabled={reissuing}
                >
                  <FiRefreshCw />
                  {reissuing ? "Reissuing..." : "Confirm Reissue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}