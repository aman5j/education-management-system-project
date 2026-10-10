import { useCallback, useEffect, useState } from "react";
import { getCourses } from "../../../services/courseService";
import { getBatches } from "../../../services/batchService";
import { getStudents } from "../../../services/studentService";
import {
  getAttendance,
  createAttendance,
  updateAttendance,
} from "../../../services/attendanceService";
import "../../../styles/AttendanceManagement.css";

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
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

const Attendance = () => {
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [date, setDate] = useState(today());
  const [statuses, setStatuses] = useState({});
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [historyStudentId, setHistoryStudentId] = useState("");
const [historyFrom, setHistoryFrom] = useState("");
const [historyTo, setHistoryTo] = useState("");
const [historyRecords, setHistoryRecords] = useState([]);
const [historyLoading, setHistoryLoading] = useState(false);
const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [courseResponse, batchResponse] = await Promise.all([
          getCourses({ page: 1, limit: 100 }),
          getBatches({ page: 1, limit: 100 }),
        ]);

        setCourses(getList(courseResponse, ["courses"]));
        setBatches(getList(batchResponse, ["batches"]));
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Unable to load courses and batches."
        );
      }
    };

    loadOptions();
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!courseId || !batchId || !date) {
      setStudents([]);
      setRecords([]);
      setStatuses({});
      setRemarks({});
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [studentResponse, attendanceResponse] = await Promise.all([
        getStudents({
          course_id: courseId,
          batch_id: batchId,
          page: 1,
          limit: 500,
        }),
        getAttendance({
          course_id: courseId,
          batch_id: batchId,
          date,
          page: 1,
          limit: 500,
        }),
      ]);

      const studentList = getList(studentResponse, ["students"]);
      const attendanceList = getList(attendanceResponse, ["records"]);

      setStudents(studentList);
      setRecords(attendanceList);

      const nextStatuses = {};
      const nextRemarks = {};

      studentList.forEach((student) => {
        nextStatuses[student._id] = "Present";
        nextRemarks[student._id] = "";
      });

      attendanceList.forEach((record) => {
        const studentId = getId(record.student_id);

        if (studentId) {
          nextStatuses[studentId] = record.status;
          nextRemarks[studentId] = record.remarks || "";
        }
      });

      setStatuses(nextStatuses);
      setRemarks(nextRemarks);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load students or attendance."
      );
    } finally {
      setLoading(false);
    }
  }, [courseId, batchId, date]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const filteredBatches = batches.filter(
    (batch) => !courseId || getId(batch.course_id) === courseId
  );

  const changeCourse = (value) => {
    setCourseId(value);
    setBatchId("");
    setStudents([]);
    setRecords([]);
  };

  const markAll = (status) => {
    setStatuses((previous) => {
      const next = { ...previous };
      students.forEach((student) => {
        next[student._id] = status;
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!courseId || !batchId || !date) {
      setError("Select a course, batch, and date first.");
      return;
    }

    if (!students.length) {
      setError("No students found for the selected batch.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const existingByStudent = new Map(
        records.map((record) => [
          getId(record.student_id),
          record,
        ])
      );

      for (const student of students) {
        const existing = existingByStudent.get(student._id);
        const payload = {
          status: statuses[student._id] || "Present",
          remarks: remarks[student._id] || "",
        };

        if (existing?._id) {
          await updateAttendance(existing._id, payload);
        } else {
          await createAttendance({
            student_id: student._id,
            course_id: courseId,
            batch_id: batchId,
            attendance_date: date,
            ...payload,
          });
        }
      }

      setMessage("Attendance saved successfully.");
      await loadAttendance();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Attendance could not be fully saved. Reload records before retrying."
      );
    } finally {
      setSaving(false);
    }
  };

  const count = (status) =>
    Object.values(statuses).filter((value) => value === status).length;

  const loadStudentHistory = async () => {
  if (!historyStudentId) {
    setHistoryError("Please select a student.");
    return;
  }

  if (historyFrom && historyTo && historyFrom > historyTo) {
    setHistoryError("Start date cannot be after end date.");
    return;
  }

  setHistoryLoading(true);
  setHistoryError("");
  setHistoryRecords([]);

  try {
    const params = {
      student_id: historyStudentId,
      page: 1,
      limit: 500,
    };

    if (historyFrom) params.from = historyFrom;
    if (historyTo) params.to = historyTo;

    const response = await getAttendance(params);

    setHistoryRecords(getList(response, ["records"]));
  } catch (err) {
    setHistoryError(
      err?.response?.data?.message ||
        "Unable to load student attendance history."
    );
  } finally {
    setHistoryLoading(false);
  }
};

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <div>
          <span className="attendance-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Attendance Management</h1>
          <p>Record and review daily student attendance.</p>
        </div>

        <button
          type="button"
          className="attendance-primary-button"
          onClick={handleSave}
          disabled={saving || loading || !students.length}
        >
          {saving ? "Saving..." : "Save Attendance"}
        </button>
      </div>

      <section className="attendance-card">
        <div className="attendance-filters">
          <label>
            Course
            <select
              value={courseId}
              onChange={(event) => changeCourse(event.target.value)}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseTitle}
                </option>
              ))}
            </select>
          </label>

          <label>
            Batch
            <select
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              disabled={!courseId}
            >
              <option value="">Select batch</option>
              {filteredBatches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.batch_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Attendance date
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="attendance-secondary-button"
            onClick={loadAttendance}
            disabled={loading || !courseId || !batchId}
          >
            Load Records
          </button>
        </div>

        {error && <div className="attendance-error">{error}</div>}
        {message && <div className="attendance-success">{message}</div>}

        <div className="attendance-summary">
          <div><span>Total students</span><strong>{students.length}</strong></div>
          <div><span>Present</span><strong>{count("Present")}</strong></div>
          <div><span>Absent</span><strong>{count("Absent")}</strong></div>
          <div><span>Late</span><strong>{count("Late")}</strong></div>
        </div>

        {!courseId || !batchId ? (
          <div className="attendance-empty">
            Select a course and batch to load students.
          </div>
        ) : loading ? (
          <div className="attendance-empty">Loading attendance...</div>
        ) : !students.length ? (
          <div className="attendance-empty">
            No students found for this course and batch.
          </div>
        ) : (
          <>
            <div className="attendance-bulk-actions">
              <span>{students.length} students</span>
              <div>
                <button type="button" onClick={() => markAll("Present")}>
                  Mark all present
                </button>
                <button type="button" onClick={() => markAll("Absent")}>
                  Mark all absent
                </button>
              </div>
            </div>

            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No.</th>
                    <th>Student</th>
                    <th>Attendance status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => (
                    <tr key={student._id}>
                      <td>{index + 1}</td>
                      <td>{student.rollNo || "—"}</td>
                      <td>
                        {`${student.firstName || ""} ${student.surname || ""}`.trim()}
                      </td>
                      <td>
                        <select
                          className={`attendance-status ${(
                            statuses[student._id] || "Present"
                          ).toLowerCase()}`}
                          value={statuses[student._id] || "Present"}
                          onChange={(event) =>
                            setStatuses((previous) => ({
                              ...previous,
                              [student._id]: event.target.value,
                            }))
                          }
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Late">Late</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={remarks[student._id] || ""}
                          placeholder="Optional"
                          maxLength={500}
                          onChange={(event) =>
                            setRemarks((previous) => ({
                              ...previous,
                              [student._id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="attendance-card attendance-history-card">
  <div className="attendance-history-heading">
    <div>
      <h2>Student Attendance History</h2>
      <p>View saved attendance records for an individual student.</p>
    </div>
  </div>

  <div className="attendance-filters attendance-history-filters">
    <label>
      Student
      <select
        value={historyStudentId}
        onChange={(event) =>
          setHistoryStudentId(event.target.value)
        }
      >
        <option value="">Select student</option>

        {students.map((student) => (
          <option key={student._id} value={student._id}>
            {student.rollNo || "No Roll No"} —{" "}
            {`${student.firstName || ""} ${student.surname || ""}`.trim()}
          </option>
        ))}
      </select>
    </label>

    <label>
      From date
      <input
        type="date"
        value={historyFrom}
        onChange={(event) => setHistoryFrom(event.target.value)}
        max={historyTo || today()}
      />
    </label>

    <label>
      To date
      <input
        type="date"
        value={historyTo}
        onChange={(event) => setHistoryTo(event.target.value)}
        min={historyFrom || undefined}
        max={today()}
      />
    </label>

    <button
      type="button"
      className="attendance-primary-button"
      onClick={loadStudentHistory}
      disabled={historyLoading}
    >
      {historyLoading ? "Loading..." : "View History"}
    </button>
  </div>

  {historyError && (
    <div className="attendance-error">{historyError}</div>
  )}

  {historyLoading ? (
    <div className="attendance-empty">Loading history...</div>
  ) : historyRecords.length === 0 ? (
    <div className="attendance-empty">
      Select a student and click View History to see records.
    </div>
  ) : (
    <div className="attendance-table-wrapper">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Student</th>
            <th>Course</th>
            <th>Batch</th>
            <th>Status</th>
            <th>Remarks</th>
          </tr>
        </thead>

        <tbody>
          {historyRecords.map((record) => {
            const student =
              typeof record.student_id === "object"
                ? record.student_id
                : null;

            const course =
              typeof record.course_id === "object"
                ? record.course_id
                : null;

            const batch =
              typeof record.batch_id === "object"
                ? record.batch_id
                : null;

            return (
              <tr key={record._id}>
                <td>
                  {record.attendance_date
                    ? record.attendance_date.slice(0, 10)
                    : "—"}
                </td>

                <td>
                  {student
                    ? `${student.rollNo || ""} ${student.firstName || ""} ${student.surname || ""}`.trim()
                    : "Student"}
                </td>

                <td>{course?.courseTitle || "—"}</td>
                <td>{batch?.batch_name || "—"}</td>

                <td>
                  <span
                    className={`attendance-history-status ${(
                      record.status || ""
                    ).toLowerCase()}`}
                  >
                    {record.status}
                  </span>
                </td>

                <td>{record.remarks || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}
</section>


    </div>
  );
};

export default Attendance;
