
import { useCallback, useEffect, useState } from "react";

import { getCourses } from "../../../services/courseService";
import { getBatches } from "../../../services/batchService";
import { getAttendanceRoster } from "../../../services/studentService";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import {
  getAttendance,
  createAttendance,
  updateAttendance,
} from "../../../services/attendanceService";

import Pagination from "../../../components/common/Pagination";
import AttendanceQRScanner from "../../../components/attendance/AttendanceQRScanner";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/AttendanceManagement.css";

const PAGE_SIZE = 10;

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
  const { user } = useAuth();

  const canManageAttendance = hasPermission(
    user,
    "attendance.manage"
  );

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
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [historyStudentId, setHistoryStudentId] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyRequested, setHistoryRequested] = useState(false);

  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(PAGE_SIZE);

  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [attendanceRefreshKey, setAttendanceRefreshKey] = useState(0);

  // Load course and batch options.
  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setOptionsLoading(true);

      try {
        const [courseResponse, batchResponse] = await Promise.all([
          getCourses({ page: 1, limit: 100 }),
          getBatches({ page: 1, limit: 100 }),
        ]);

        if (cancelled) return;

        setCourses(getList(courseResponse, ["courses"]));
        setBatches(getList(batchResponse, ["batches"]));
      } catch (error) {
        if (!cancelled) {
          notification.error(getApiErrorMessage(error));
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

  // Load the complete roster and all attendance records for the selected
  // date. Do not paginate this roster: every student must be available
  // when saving attendance.
  const loadAttendance = useCallback(async () => {
    if (!courseId || !batchId || !date) {
      setStudents([]);
      setRecords([]);
      setStatuses({});
      setRemarks({});
      return;
    }

    setLoading(true);

    try {
      const [studentResponse, attendanceResponse] = await Promise.all([
        getAttendanceRoster({
          course_id: courseId,
          batch_id: batchId,
        }),
        getAttendance({
          course_id: courseId,
          batch_id: batchId,
          date,
          page: 1,
          limit: 100,
        }),
      ]);

      const studentList = getList(studentResponse, ["students"]);

      const attendancePayload =
        attendanceResponse?.data?.data ??
        attendanceResponse?.data ??
        {};

      const attendanceList = Array.isArray(attendancePayload.records)
        ? attendancePayload.records
        : [];

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
    } catch (error) {
      setStudents([]);
      setRecords([]);
      setStatuses({});
      setRemarks({});

      notification.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [courseId, batchId, date]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance, attendanceRefreshKey]);

  const filteredBatches = batches.filter(
    (batch) => !courseId || getId(batch.course_id) === courseId
  );

  const changeCourse = (value) => {
    setCourseId(value);
    setBatchId("");

    setStudents([]);
    setRecords([]);
    setStatuses({});
    setRemarks({});

    setHistoryStudentId("");
    setHistoryRequested(false);
    setHistoryRecords([]);
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

  const clearAll = () => {
    setStatuses((previous) => {
      const next = { ...previous };

      students.forEach((student) => {
        next[student._id] = "";
      });

      return next;
    });
  };

  const handleSave = async () => {
    if (!canManageAttendance) {
      notification.error(
        "You do not have permission to manage attendance."
      );
      return;
    }

    if (!courseId || !batchId || !date) {
      notification.warning(
        "Select a course, batch, and date first."
      );
      return;
    }

    if (!students.length) {
      notification.warning(
        "No students found for the selected batch."
      );
      return;
    }

    const incompleteStudent = students.find(
      (student) => !statuses[student._id]
    );

    if (incompleteStudent) {
      notification.warning(
        `Please select an attendance status for ${
          incompleteStudent.firstName || "every student"
        } before saving.`
      );
      return;
    }

    setSaving(true);

    let savedCount = 0;

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
          status: statuses[student._id],
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

        savedCount += 1;
      }

      notification.success(
        `Attendance saved successfully for ${savedCount} student(s).`
      );

      await loadAttendance();

      if (historyRequested && historyStudentId) {
        setHistoryRefreshKey((previous) => previous + 1);
      }
    } catch (error) {
      // Reload the roster after a partial save so the UI reflects
      // records that were successfully saved before the failure.
      try {
        await loadAttendance();
      } catch {
        // loadAttendance already reports its own error.
      }

      notification.error(
        savedCount > 0
          ? `Attendance was saved for ${savedCount} student(s), but the remaining records could not be saved. Review the attendance and retry. ${getApiErrorMessage(error)}`
          : getApiErrorMessage(error)
      );
    } finally {
      setSaving(false);
    }
  };

  const count = (status) =>
    Object.values(statuses).filter(
      (value) => value === status
    ).length;

  // Load one page of history directly from the backend.
  const loadStudentHistory = useCallback(async () => {
    if (!historyStudentId) {
      notification.warning("Please select a student.");
      return;
    }

    if (historyFrom && historyTo && historyFrom > historyTo) {
      notification.warning(
        "Start date cannot be after end date."
      );
      return;
    }

    setHistoryLoading(true);

    try {
      const params = {
        student_id: historyStudentId,
        page: historyPage,
        limit: historyLimit,
      };

      if (historyFrom) params.from = historyFrom;
      if (historyTo) params.to = historyTo;

      const response = await getAttendance(params);

      const payload =
        response?.data?.data ??
        response?.data ??
        {};

      const list = Array.isArray(payload.records)
        ? payload.records
        : [];

      const pageData = payload.pagination || {};

      const total = Number(pageData.total) || 0;
      const totalPages =
        Number(pageData.totalPages) ||
        Math.ceil(total / historyLimit);

      setHistoryRecords(list);

      setHistoryPagination({
        page: Number(pageData.page) || historyPage,
        limit: Number(pageData.limit) || historyLimit,
        total,
        totalPages,
      });

      if (totalPages > 0 && historyPage > totalPages) {
        setHistoryPage(totalPages);
      }
    } catch (error) {
      setHistoryRecords([]);
      notification.error(getApiErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [
    historyStudentId,
    historyFrom,
    historyTo,
    historyPage,
    historyLimit,
  ]);

  useEffect(() => {
    if (!historyRequested || !historyStudentId) return;

    loadStudentHistory();
  }, [
    historyRequested,
    historyStudentId,
    historyPage,
    historyLimit,
    historyRefreshKey,
    loadStudentHistory,
  ]);

  const handleHistorySearch = () => {
    if (!historyStudentId) {
      notification.warning("Please select a student.");
      return;
    }

    if (historyFrom && historyTo && historyFrom > historyTo) {
      notification.warning(
        "Start date cannot be after end date."
      );
      return;
    }

    setHistoryPage(1);
    setHistoryRequested(true);
    setHistoryRecords([]);
    setHistoryRefreshKey((previous) => previous + 1);
  };

  const handleHistoryStudentChange = (value) => {
    setHistoryStudentId(value);
    setHistoryRequested(false);
    setHistoryRecords([]);
    setHistoryPage(1);
  };

  const handleHistoryLimitChange = (value) => {
    setHistoryLimit(value);
    setHistoryPage(1);
  };

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <div>
          <span className="attendance-eyebrow">
            STUDENT MANAGEMENT
          </span>
          <h1>Attendance Management</h1>
          <p>Record and review daily student attendance.</p>
        </div>

        {canManageAttendance && (
          <button
            type="button"
            className="attendance-primary-button"
            onClick={handleSave}
            disabled={saving || loading || !students.length}
          >
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        )}
      </div>

      <section className="attendance-card">
        <div className="attendance-filters">
          <label>
            Course
            <select
              value={courseId}
              onChange={(event) => changeCourse(event.target.value)}
              disabled={optionsLoading}
            >
              <option value="">
                {optionsLoading ? "Loading courses..." : "Select course"}
              </option>

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
              disabled={!courseId || optionsLoading}
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
            onClick={() =>
              setAttendanceRefreshKey((previous) => previous + 1)
            }
            disabled={loading || !courseId || !batchId}
          >
            {loading ? "Loading..." : "Load Records"}
          </button>
        </div>

        <div className="attendance-summary">
          <div>
            <span>Total students</span>
            <strong>{students.length}</strong>
          </div>

          <div>
            <span>Present</span>
            <strong>{count("Present")}</strong>
          </div>

          <div>
            <span>Absent</span>
            <strong>{count("Absent")}</strong>
          </div>

          <div>
            <span>Leave</span>
            <strong>{count("Leave")}</strong>
          </div>

          <div>
            <span>Late</span>
            <strong>{count("Late")}</strong>
          </div>
        </div>

        {!courseId || !batchId ? (
          <div className="attendance-empty">
            Select a course and batch to load students.
          </div>
        ) : loading ? (
          <div className="attendance-empty">
            Loading attendance...
          </div>
        ) : !students.length ? (
          <div className="attendance-empty">
            No students found for this course and batch.
          </div>
        ) : (
          <>
            {canManageAttendance && (
              <div className="attendance-bulk-actions">
                <span>{students.length} students</span>

                <div>
                  <button
                    type="button"
                    onClick={() => markAll("Present")}
                    disabled={saving}
                  >
                    ✓ Mark all present
                  </button>

                  <button
                    type="button"
                    onClick={() => markAll("Absent")}
                    disabled={saving}
                  >
                    ✕ Mark all absent
                  </button>

                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={saving}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

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
                        <div className="attendance-radio-group">
                          {["Present", "Absent", "Leave", "Late"].map(
                            (status) => (
                              <label
                                key={status}
                                className={`attendance-radio-option ${status.toLowerCase()} ${
                                  statuses[student._id] === status
                                    ? "selected"
                                    : ""
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`attendance-${student._id}`}
                                  value={status}
                                  checked={
                                    statuses[student._id] === status
                                  }
                                  disabled={!canManageAttendance || saving}
                                  onChange={() =>
                                    setStatuses((previous) => ({
                                      ...previous,
                                      [student._id]: status,
                                    }))
                                  }
                                />

                                <span>{status}</span>
                              </label>
                            )
                          )}
                        </div>
                      </td>

                      <td>
                        <input
                          type="text"
                          value={remarks[student._id] || ""}
                          placeholder="Optional"
                          maxLength={500}
                          disabled={!canManageAttendance || saving}
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

      {canManageAttendance && (
        <AttendanceQRScanner
          courseId={courseId}
          batchId={batchId}
          date={date}
          onSuccess={async () => {
            await loadAttendance();

            if (historyRequested && historyStudentId) {
              setHistoryRefreshKey((previous) => previous + 1);
            }
          }}
        />
      )}

      <section className="attendance-card attendance-history-card">
        <div className="attendance-history-heading">
          <div>
            <h2>Student Attendance History</h2>
            <p>
              View saved attendance records for an individual student.
            </p>
          </div>
        </div>

        <div className="attendance-filters attendance-history-filters">
          <label>
            Student
            <select
              value={historyStudentId}
              onChange={(event) =>
                handleHistoryStudentChange(event.target.value)
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
            onClick={handleHistorySearch}
            disabled={historyLoading}
          >
            {historyLoading ? "Loading..." : "View History"}
          </button>
        </div>

        {historyLoading ? (
          <div className="attendance-empty">
            Loading attendance history...
          </div>
        ) : historyRecords.length === 0 ? (
          <div className="attendance-empty">
            {historyRequested
              ? "No attendance history found for the selected filters."
              : "Select a student and click View History to see records."}
          </div>
        ) : (
          <>
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
                            ? String(record.attendance_date).slice(0, 10)
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
                            className={`attendance-history-status ${(record.status || "").toLowerCase()}`}
                          >
                            {record.status || "—"}
                          </span>
                        </td>

                        <td>{record.remarks || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={historyPagination.page}
              totalPages={historyPagination.totalPages}
              total={historyPagination.total}
              itemCount={historyRecords.length}
              itemLabel="attendance records"
              limit={historyLimit}
              loading={historyLoading}
              onPageChange={setHistoryPage}
              onLimitChange={(value) => {
                setHistoryLimit(value);
                setHistoryPage(1);
              }}
            />
          </>
        )}
      </section>
    </div>
  );
};

export default Attendance;
