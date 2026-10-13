
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiDownload,
  FiFileText,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { getAttendanceReport } from "../../../services/attendanceReportService";
import { getCourses } from "../../../services/courseService";
import { getBatches } from "../../../services/batchService";
import { getStudents } from "../../../services/studentService";

import "../../../styles/AttendanceReports.css";

const STATUSES = ["Present", "Absent", "Leave", "Late"];

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN");
};

const formatPercentage = (value) =>
  `${Number(value || 0).toFixed(2)}%`;

const getStudentName = (student) => {
  if (!student) return "-";

  return (
    [student.firstName, student.surname, student.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || student.name || "-"
  );
};

const getId = (value) =>
  typeof value === "object" && value !== null
    ? value._id || ""
    : value || "";

const AttendanceReports = () => {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    course_id: "",
    batch_id: "",
    student_id: "",
    status: "",
  });

  const [options, setOptions] = useState({
    courses: [],
    batches: [],
    students: [],
  });

  const [report, setReport] = useState({
    summary: {},
    statusBreakdown: [],
    studentBreakdown: [],
    courseBreakdown: [],
    batchBreakdown: [],
    records: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [error, setError] = useState("");

  const availableBatches = useMemo(() => {
    if (!filters.course_id) return options.batches;

    return options.batches.filter((batch) => {
      const courseId =
        getId(batch.course_id) || getId(batch.course);

      return String(courseId) === String(filters.course_id);
    });
  }, [filters.course_id, options.batches]);

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);

    try {
      const [courseResponse, batchResponse, studentResponse] =
        await Promise.all([
          getCourses({ limit: 100 }),
          getBatches({ limit: 100 }),
          getStudents({ limit: 100 }),
        ]);

      const courseData = getResponseData(courseResponse);
      const batchData = getResponseData(batchResponse);
      const studentData = getResponseData(studentResponse);

      const courses =
        Array.isArray(courseData)
          ? courseData
          : courseData.courses || courseData.records || [];

      const batches =
        Array.isArray(batchData)
          ? batchData
          : batchData.batches || batchData.records || [];

      const students =
        Array.isArray(studentData)
          ? studentData
          : studentData?.data?.students ||
            studentData.students ||
            studentData.records ||
            [];

      setOptions({ courses, batches, students });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load course, batch and student filters."
      );
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async (currentFilters = filters, currentPage = page) => {
      setLoading(true);
      setError("");

      const params = {
        ...currentFilters,
        page: currentPage,
        limit: 10,
      };

      Object.keys(params).forEach((key) => {
        if (
          params[key] === "" ||
          params[key] === null ||
          params[key] === undefined
        ) {
          delete params[key];
        }
      });

      try {
        const response = await getAttendanceReport(params);
        const data = getResponseData(response);

        setReport({
          summary: data.summary || {},
          statusBreakdown: Array.isArray(data.statusBreakdown)
            ? data.statusBreakdown
            : [],
          studentBreakdown: Array.isArray(data.studentBreakdown)
            ? data.studentBreakdown
            : [],
          courseBreakdown: Array.isArray(data.courseBreakdown)
            ? data.courseBreakdown
            : [],
          batchBreakdown: Array.isArray(data.batchBreakdown)
            ? data.batchBreakdown
            : [],
          records: Array.isArray(data.records) ? data.records : [],
          pagination: data.pagination || {
            page: currentPage,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        });
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Unable to load Attendance Reports."
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, page]
  );

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    loadReport(filters, page);
  }, [loadReport, filters, page]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "course_id") {
        next.batch_id = "";
      }

      return next;
    });

    setPage(1);
  };

  const handleApply = () => {
    if (filters.from && filters.to && filters.from > filters.to) {
      setError("'From' date cannot be after 'To' date.");
      return;
    }

    setPage(1);
    loadReport(filters, 1);
  };

  const handleReset = () => {
    const resetFilters = {
      from: "",
      to: "",
      course_id: "",
      batch_id: "",
      student_id: "",
      status: "",
    };

    setFilters(resetFilters);
    setPage(1);
    loadReport(resetFilters, 1);
  };

  const handleRefresh = () => loadReport(filters, page);

  const summary = report.summary || {};
  const records = report.records || [];
  const pagination = report.pagination || {};

  const exportExcel = () => {
    if (!records.length) {
      window.alert("No attendance records available on this page to export.");
      return;
    }

    const recordRows = records.map((record, index) => ({
      "S.No.": (pagination.page - 1) * pagination.limit + index + 1,
      "Attendance Date": formatDate(record.attendance_date),
      "Roll No": record.student_id?.rollNo || "-",
      "Student Name": getStudentName(record.student_id),
      Course: record.course_id?.courseTitle || "-",
      Batch: record.batch_id?.batch_name || "-",
      Status: record.status || "-",
      Remarks: record.remarks || "",
      "Marked By": record.marked_by?.name || "-",
    }));

    const summaryRows = [
      { Metric: "Total Records", Value: Number(summary.totalRecords || 0) },
      { Metric: "Present", Value: Number(summary.present || 0) },
      { Metric: "Absent", Value: Number(summary.absent || 0) },
      { Metric: "Leave", Value: Number(summary.leave || 0) },
      { Metric: "Late", Value: Number(summary.late || 0) },
      {
        Metric: "Attendance Percentage",
        Value: Number(summary.attendancePercentage || 0),
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(recordRows),
      "Attendance Records"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      "Summary"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        report.studentBreakdown.map((student) => ({
          "Roll No": student.rollNo || "-",
          "Student Name": getStudentName(student),
          "Total Records": student.totalRecords || 0,
          Present: student.present || 0,
          Absent: student.absent || 0,
          Leave: student.leave || 0,
          Late: student.late || 0,
          "Attendance Percentage": Number(
            student.attendancePercentage || 0
          ),
        }))
      ),
      "Student Breakdown"
    );

    XLSX.writeFile(
      workbook,
      `attendance-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportPDF = () => {
    if (!records.length) {
      window.alert("No attendance records available on this page to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(16);
    doc.text("Attendance Report", 14, 15);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      14,
      22
    );

    const appliedFilters = [
      filters.from ? `From: ${filters.from}` : "",
      filters.to ? `To: ${filters.to}` : "",
      filters.status ? `Status: ${filters.status}` : "",
    ].filter(Boolean);

    if (appliedFilters.length) {
      doc.text(appliedFilters.join(" | "), 14, 28);
    }

    autoTable(doc, {
      startY: appliedFilters.length ? 34 : 29,
      head: [[
        "Date",
        "Roll No",
        "Student",
        "Course",
        "Batch",
        "Status",
        "Remarks",
      ]],
      body: records.map((record) => [
        formatDate(record.attendance_date),
        record.student_id?.rollNo || "-",
        getStudentName(record.student_id),
        record.course_id?.courseTitle || "-",
        record.batch_id?.batch_name || "-",
        record.status || "-",
        record.remarks || "-",
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fontSize: 8 },
      margin: { left: 10, right: 10 },
    });

    const finalY = (doc.lastAutoTable?.finalY || 40) + 9;

    doc.setFontSize(10);
    doc.text(`Total records: ${summary.totalRecords || 0}`, 14, finalY);
    doc.text(`Present: ${summary.present || 0}`, 75, finalY);
    doc.text(`Absent: ${summary.absent || 0}`, 120, finalY);
    doc.text(`Leave: ${summary.leave || 0}`, 165, finalY);
    doc.text(`Late: ${summary.late || 0}`, 205, finalY);

    doc.save(
      `attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="attendance-reports-page">
      <div className="attendance-reports-header">
        <div>
          <span className="attendance-reports-eyebrow">
            ACADEMIC REPORTS
          </span>
          <h1>Attendance Reports</h1>
          <p>
            Analyze attendance records, student participation and
            attendance status.
          </p>
        </div>

        <button
          type="button"
          className="attendance-report-secondary-button"
          onClick={handleRefresh}
          disabled={loading}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="attendance-report-alert" role="alert">
          {error}
        </div>
      )}

      <section className="attendance-report-filter-card">
        <div className="attendance-report-section-heading">
          <div>
            <h2>Filter Report</h2>
            <p>Choose dates, course, batch, student or attendance status.</p>
          </div>
        </div>

        <div className="attendance-report-filters">
          <label>
            From Date
            <input
              type="date"
              name="from"
              value={filters.from}
              max={filters.to || undefined}
              onChange={handleChange}
            />
          </label>

          <label>
            To Date
            <input
              type="date"
              name="to"
              value={filters.to}
              min={filters.from || undefined}
              onChange={handleChange}
            />
          </label>

          <label>
            Course
            <select
              name="course_id"
              value={filters.course_id}
              onChange={handleChange}
              disabled={optionsLoading}
            >
              <option value="">All Courses</option>
              {options.courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.courseTitle || course.title || "Untitled Course"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Batch
            <select
              name="batch_id"
              value={filters.batch_id}
              onChange={handleChange}
              disabled={optionsLoading}
            >
              <option value="">All Batches</option>
              {availableBatches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.batch_name || batch.batchName || "Untitled Batch"}
                </option>
              ))}
            </select>
          </label>

          <label>
            Student
            <select
              name="student_id"
              value={filters.student_id}
              onChange={handleChange}
              disabled={optionsLoading}
            >
              <option value="">All Students</option>
              {options.students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.rollNo ? `${student.rollNo} - ` : ""}
                  {getStudentName(student)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Attendance Status
            <select
              name="status"
              value={filters.status}
              onChange={handleChange}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <div className="attendance-report-filter-actions">
            <button
              type="button"
              className="attendance-report-primary-button"
              onClick={handleApply}
              disabled={loading}
            >
              <FiSearch /> Apply
            </button>

            <button
              type="button"
              className="attendance-report-secondary-button"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="attendance-report-summary-grid">
        <article className="attendance-report-summary-card">
          <span>Total Records</span>
          <strong>{summary.totalRecords || 0}</strong>
          <small>Matching attendance entries</small>
        </article>
        <article className="attendance-report-summary-card">
          <span>Present</span>
          <strong>{summary.present || 0}</strong>
          <small>Marked present</small>
        </article>
        <article className="attendance-report-summary-card">
          <span>Absent</span>
          <strong>{summary.absent || 0}</strong>
          <small>Marked absent</small>
        </article>
        <article className="attendance-report-summary-card">
          <span>Leave</span>
          <strong>{summary.leave || 0}</strong>
          <small>Marked on leave</small>
        </article>
        <article className="attendance-report-summary-card">
          <span>Late</span>
          <strong>{summary.late || 0}</strong>
          <small>Marked late</small>
        </article>
        <article className="attendance-report-summary-card">
          <span>Attendance Percentage</span>
          <strong>{formatPercentage(summary.attendancePercentage)}</strong>
          <small>Present ÷ recorded entries</small>
        </article>
      </section>

      <section className="attendance-report-card">
        <div className="attendance-report-section-heading attendance-report-table-heading">
          <div>
            <h2>Attendance Records</h2>
            <p>
              {pagination.total || 0} matching records
              {pagination.totalPages > 0
                ? ` · Page ${pagination.page} of ${pagination.totalPages}`
                : ""}
            </p>
          </div>

          <div className="attendance-report-export-actions">
            <button
              type="button"
              className="attendance-report-secondary-button"
              onClick={exportExcel}
              disabled={!records.length}
            >
              <FiDownload /> Excel
            </button>
            <button
              type="button"
              className="attendance-report-secondary-button"
              onClick={exportPDF}
              disabled={!records.length}
            >
              <FiFileText /> PDF
            </button>
            <button
              type="button"
              className="attendance-report-secondary-button"
              onClick={() => window.print()}
            >
              <FiPrinter /> Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="attendance-report-state">
            Loading Attendance Reports...
          </div>
        ) : !records.length ? (
          <div className="attendance-report-state">
            No attendance records match the selected filters.
          </div>
        ) : (
          <div className="attendance-report-table-wrapper">
            <table className="attendance-report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Roll No.</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record._id}>
                    <td>{formatDate(record.attendance_date)}</td>
                    <td>{record.student_id?.rollNo || "-"}</td>
                    <td>
                      <strong>{getStudentName(record.student_id)}</strong>
                    </td>
                    <td>{record.course_id?.courseTitle || "-"}</td>
                    <td>{record.batch_id?.batch_name || "-"}</td>
                    <td>
                      <span
                        className={`attendance-report-status ${(record.status || "")
                          .toLowerCase()}`}
                      >
                        {record.status || "-"}
                      </span>
                    </td>
                    <td>{record.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="attendance-report-pagination">
          <span>
            Showing{" "}
            {records.length
              ? (pagination.page - 1) * pagination.limit + 1
              : 0}
            {"–"}
            {(pagination.page - 1) * pagination.limit + records.length}
            {" of "}
            {pagination.total || 0}
          </span>
          <div>
            <button
              type="button"
              className="attendance-report-secondary-button"
              disabled={loading || (pagination.page || 1) <= 1}
              onClick={() =>
                setPage((current) => Math.max(current - 1, 1))
              }
            >
              Previous
            </button>
            <button
              type="button"
              className="attendance-report-secondary-button"
              disabled={
                loading ||
                (pagination.page || 1) >= (pagination.totalPages || 1)
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(current + 1, pagination.totalPages || 1)
                )
              }
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="attendance-report-card">
        <div className="attendance-report-section-heading">
          <div>
            <h2>Student-wise Attendance</h2>
            <p>
              Attendance totals and percentages for each student in the
              selected report filters.
            </p>
          </div>
        </div>

        {!report.studentBreakdown.length ? (
          <div className="attendance-report-state">
            No student breakdown available.
          </div>
        ) : (
          <div className="attendance-report-table-wrapper">
            <table className="attendance-report-table">
              <thead>
                <tr>
                  <th>Roll No.</th>
                  <th>Student</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Leave</th>
                  <th>Late</th>
                  <th>Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {report.studentBreakdown.map((student) => (
                  <tr key={student.studentId || student.rollNo}>
                    <td>{student.rollNo || "-"}</td>
                    <td>
                      <strong>{getStudentName(student)}</strong>
                    </td>
                    <td>{student.totalRecords || 0}</td>
                    <td>{student.present || 0}</td>
                    <td>{student.absent || 0}</td>
                    <td>{student.leave || 0}</td>
                    <td>{student.late || 0}</td>
                    <td>
                      <strong>
                        {formatPercentage(student.attendancePercentage)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="attendance-report-card">
        <div className="attendance-report-section-heading">
          <div>
            <h2>Course-wise Attendance</h2>
            <p>Recorded attendance percentages grouped by course.</p>
          </div>
        </div>
        {!report.courseBreakdown.length ? (
          <div className="attendance-report-state">
            No course breakdown available.
          </div>
        ) : (
          <div className="attendance-report-breakdown-grid">
            {report.courseBreakdown.map((item) => (
              <div className="attendance-report-breakdown-item" key={item.courseId}>
                <strong>{item.courseTitle || "Unnamed Course"}</strong>
                <span>{item.totalRecords || 0} records</span>
                <b>{formatPercentage(item.attendancePercentage)}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="attendance-report-card">
        <div className="attendance-report-section-heading">
          <div>
            <h2>Batch-wise Attendance</h2>
            <p>Recorded attendance percentages grouped by batch.</p>
          </div>
        </div>
        {!report.batchBreakdown.length ? (
          <div className="attendance-report-state">
            No batch breakdown available.
          </div>
        ) : (
          <div className="attendance-report-breakdown-grid">
            {report.batchBreakdown.map((item) => (
              <div className="attendance-report-breakdown-item" key={item.batchId}>
                <strong>{item.batchName || "Unnamed Batch"}</strong>
                <span>{item.totalRecords || 0} records</span>
                <b>{formatPercentage(item.attendancePercentage)}</b>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AttendanceReports;
