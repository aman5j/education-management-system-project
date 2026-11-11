import { useCallback, useEffect, useMemo, useState } from "react";

import {
  FiPrinter,
  FiRefreshCw,
} from "react-icons/fi";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { FaUserClock, FaUserFriends, FaUserTimes } from "react-icons/fa";
import { FaUserCheck } from "react-icons/fa6";
import { FaFilePdf } from "react-icons/fa";
import { RiFileExcel2Line } from "react-icons/ri";
import { MdDateRange, MdOutlineGraphicEq } from "react-icons/md";

import { getAttendanceReport } from "../../../services/attendanceReportService";
import { getCourses } from "../../../services/courseService";
import { getBatches } from "../../../services/batchService";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import {
  fetchAllReportPages,
  getResponseData,
} from "../../../utils/fetchAllReportPages";

import { getAssetUrl } from "../../../utils/assetUrl";

import "../../../styles/AttendanceReports.css";

const STATUSES = ["Present", "Absent", "Leave", "Late"];

const INITIAL_FILTERS = {
  from: "",
  to: "",
  course_id: "",
  batch_id: "",
  student_search: "",
  status: "",
};

const INITIAL_SUMMARY = {
  totalRecords: 0,
  present: 0,
  absent: 0,
  leave: 0,
  late: 0,
  attendancePercentage: 0,
};

const INITIAL_REPORT = {
  summary: INITIAL_SUMMARY,
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
};

const cleanFilters = (values = {}) =>
  Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined
    )
  );

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
      .trim() ||
    student.name ||
    "-"
  );
};

const getId = (value) =>
  typeof value === "object" && value !== null
    ? value._id || ""
    : value || "";

const getPercentageClass = (value) => {
  const percentage = Number(value) || 0;

  if (percentage <= 20) return "progress-red";
  if (percentage <= 50) return "progress-orange";
  if (percentage <= 80) return "progress-yellow";

  return "progress-green";
};

const getPercentageTextClass = (value) => {
  const percentage = Number(value) || 0;

  if (percentage <= 20) return "progress-text-red";
  if (percentage <= 50) return "progress-text-orange";
  if (percentage <= 80) return "progress-text-yellow";

  return "progress-text-green";
};

const getInitials = (student) => {
  const initials = [
    student?.firstName?.trim()?.[0],
    student?.surname?.trim()?.[0],
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  if (initials) return initials;

  return (
    getStudentName(student)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S"
  );
};

const AttendanceReports = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [options, setOptions] = useState({
    courses: [],
    batches: [],
  });

  const [report, setReport] = useState(INITIAL_REPORT);

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // Available batches based on selected course
  // --------------------------------------------------

  const availableBatches = useMemo(() => {
    if (!filters.course_id) {
      return options.batches;
    }

    return options.batches.filter((batch) => {
      const courseId =
        getId(batch.course_id) || getId(batch.course);

      return String(courseId) === String(filters.course_id);
    });
  }, [filters.course_id, options.batches]);

  // --------------------------------------------------
  // Load course and batch dropdown options
  // --------------------------------------------------

  const loadOptions = useCallback(async () => {
    setOptionsLoading(true);

    try {
      const [courseResponse, batchResponse] = await Promise.all([
        getCourses({ limit: 100 }),
        getBatches({ limit: 100 }),
      ]);

      const courseData = getResponseData(courseResponse);
      const batchData = getResponseData(batchResponse);

      const courses = Array.isArray(courseData)
        ? courseData
        : courseData?.courses || courseData?.records || [];

      const batches = Array.isArray(batchData)
        ? batchData
        : batchData?.batches || batchData?.records || [];

      setOptions({
        courses,
        batches,
      });
    } catch (err) {
      notification.error(getApiErrorMessage(err));
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // Load attendance report
  // --------------------------------------------------

  const loadReport = useCallback(
    async (currentFilters, currentPage = 1) => {
      setLoading(true);
      setError("");

      try {
        const response = await getAttendanceReport({
          ...cleanFilters(currentFilters),
          page: currentPage,
          limit: 10,
        });

        const data = getResponseData(response);

        setReport({
          ...INITIAL_REPORT,
          ...data,

          summary: {
            ...INITIAL_SUMMARY,
            ...(data.summary || {}),
          },

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

          records: Array.isArray(data.records)
            ? data.records
            : [],

          pagination: {
            ...INITIAL_REPORT.pagination,
            ...(data.pagination || {}),
          },
        });

        return true;
      } catch (err) {
        const message = getApiErrorMessage(err);

        setError(message);
        notification.error(message);

        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // --------------------------------------------------
  // Initial options
  // --------------------------------------------------

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // --------------------------------------------------
  // Fetch only when applied filters or page changes
  // --------------------------------------------------

  useEffect(() => {
    loadReport(appliedFilters, page);
  }, [loadReport, appliedFilters, page]);

  // --------------------------------------------------
  // Filter handlers
  // --------------------------------------------------

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "course_id" ? { batch_id: "" } : {}),
    }));
  };

  const handleApply = () => {
    if (filters.from && filters.to && filters.from > filters.to) {
      notification.warning(
        "'From' date cannot be after 'To' date."
      );
      return;
    }

    const nextFilters = {
      ...filters,
      student_search: filters.student_search.trim(),
    };

    setError("");
    setPage(1);
    setAppliedFilters(nextFilters);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(1);
    setError("");
  };

  const handleRefresh = () => {
    loadReport(appliedFilters, page);
  };

  // --------------------------------------------------
  // Current report data
  // --------------------------------------------------

  const summary = report.summary || INITIAL_SUMMARY;
  const records = report.records || [];
  const pagination = report.pagination || INITIAL_REPORT.pagination;

  // --------------------------------------------------
  // Fetch ALL pages for exports
  // --------------------------------------------------

  const getExportData = async () => {
    return fetchAllReportPages({
      fetchPage: getAttendanceReport,
      filters: cleanFilters(appliedFilters),
      recordsKey: "records",
    });
  };

  // --------------------------------------------------
  // Excel row formatter
  // --------------------------------------------------

  const buildAttendanceRows = (allRecords) => {
    return allRecords.map((record, index) => ({
      "S.No.": index + 1,
      "Attendance Date": formatDate(record.attendance_date),
      "Roll No": record.student_id?.rollNo || "-",
      "Student Name": getStudentName(record.student_id),
      "Father Name": record.student_id?.fatherName || "-",
      Mobile: record.student_id?.mobile || "-",
      Course: record.course_id?.courseTitle || "-",
      Batch: record.batch_id?.batch_name || "-",
      Status: record.status || "-",
      Remarks: record.remarks || "",
      "Marked By": record.marked_by?.name || "-",
    }));
  };

  // --------------------------------------------------
  // Export Excel
  // --------------------------------------------------

  const exportExcel = async () => {
    if (loading || exporting || !pagination.total) return;

    setExporting(true);

    const toastId = notification.loading(
      "Preparing complete attendance Excel report..."
    );

    try {
      const {
        rows: allRecords,
        summary: exportSummary,
      } = await getExportData();

      if (!allRecords.length) {
        notification.dismiss(toastId);
        notification.info(
          "No attendance records match the applied filters."
        );
        return;
      }

      const workbook = XLSX.utils.book_new();

      const exportSummaryData = {
        ...INITIAL_SUMMARY,
        ...(exportSummary || {}),
      };

      const summaryRows = [
        {
          Metric: "Total Records",
          Value: Number(exportSummaryData.totalRecords || 0),
        },
        {
          Metric: "Present",
          Value: Number(exportSummaryData.present || 0),
        },
        {
          Metric: "Absent",
          Value: Number(exportSummaryData.absent || 0),
        },
        {
          Metric: "Leave",
          Value: Number(exportSummaryData.leave || 0),
        },
        {
          Metric: "Late",
          Value: Number(exportSummaryData.late || 0),
        },
        {
          Metric: "Attendance Percentage",
          Value: Number(exportSummaryData.attendancePercentage || 0),
        },
        {
          Metric: "Exported Records",
          Value: allRecords.length,
        },
      ];

      const studentRows = report.studentBreakdown.map((student) => ({
        "Roll No": student.rollNo || "-",
        "Student Name": getStudentName(student),
        "Total Records": Number(student.totalRecords || 0),
        Present: Number(student.present || 0),
        Absent: Number(student.absent || 0),
        Leave: Number(student.leave || 0),
        Late: Number(student.late || 0),
        "Attendance Percentage": Number(
          student.attendancePercentage || 0
        ),
      }));

      const courseRows = report.courseBreakdown.map((item) => ({
        Course: item.courseTitle || "-",
        "Total Records": Number(item.totalRecords || 0),
        Present: Number(item.present || 0),
        "Attendance Percentage": Number(
          item.attendancePercentage || 0
        ),
      }));

      const batchRows = report.batchBreakdown.map((item) => ({
        Batch: item.batchName || "-",
        "Total Records": Number(item.totalRecords || 0),
        Present: Number(item.present || 0),
        "Attendance Percentage": Number(
          item.attendancePercentage || 0
        ),
      }));

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          buildAttendanceRows(allRecords)
        ),
        "Attendance Records"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        "Summary"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(studentRows),
        "Student Breakdown"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(courseRows),
        "Course Breakdown"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(batchRows),
        "Batch Breakdown"
      );

      XLSX.writeFile(
        workbook,
        `attendance-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      notification.dismiss(toastId);

      notification.success(
        `Excel report exported successfully (${allRecords.length} records).`
      );
    } catch (err) {
      notification.dismiss(toastId);

      notification.error(
        err?.message || getApiErrorMessage(err)
      );
    } finally {
      setExporting(false);
    }
  };

  // --------------------------------------------------
  // Export PDF
  // --------------------------------------------------

  const exportPDF = async () => {
    if (loading || exporting || !pagination.total) return;

    setExporting(true);

    const toastId = notification.loading(
      "Preparing complete attendance PDF report..."
    );

    try {
      const {
        rows: allRecords,
        summary: exportSummary,
      } = await getExportData();

      if (!allRecords.length) {
        notification.dismiss(toastId);
        notification.info(
          "No attendance records match the applied filters."
        );
        return;
      }

      const exportSummaryData = {
        ...INITIAL_SUMMARY,
        ...(exportSummary || {}),
      };

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

      const filterLabels = [
        appliedFilters.from
          ? `From: ${appliedFilters.from}`
          : "",

        appliedFilters.to
          ? `To: ${appliedFilters.to}`
          : "",

        appliedFilters.student_search
          ? `Student: ${appliedFilters.student_search}`
          : "",

        appliedFilters.status
          ? `Status: ${appliedFilters.status}`
          : "",
      ].filter(Boolean);

      if (filterLabels.length) {
        doc.text(filterLabels.join(" | "), 14, 28);
      }

      autoTable(doc, {
        startY: filterLabels.length ? 34 : 29,

        head: [[
          "Date",
          "Roll No",
          "Student",
          "Course",
          "Batch",
          "Status",
          "Remarks",
        ]],

        body: allRecords.map((record) => [
          formatDate(record.attendance_date),
          record.student_id?.rollNo || "-",
          getStudentName(record.student_id),
          record.course_id?.courseTitle || "-",
          record.batch_id?.batch_name || "-",
          record.status || "-",
          record.remarks || "-",
        ]),

        styles: {
          fontSize: 8,
          cellPadding: 2.5,
          overflow: "linebreak",
        },

        headStyles: {
          fontSize: 8,
        },

        margin: {
          left: 10,
          right: 10,
        },
      });

      let summaryY = (doc.lastAutoTable?.finalY || 40) + 9;

      if (summaryY > 180) {
        doc.addPage();
        summaryY = 20;
      }

      doc.setFontSize(10);

      doc.text(
        `Total Records: ${exportSummaryData.totalRecords || 0}`,
        14,
        summaryY
      );

      doc.text(
        `Present: ${exportSummaryData.present || 0}`,
        75,
        summaryY
      );

      doc.text(
        `Absent: ${exportSummaryData.absent || 0}`,
        120,
        summaryY
      );

      doc.text(
        `Leave: ${exportSummaryData.leave || 0}`,
        165,
        summaryY
      );

      doc.text(
        `Late: ${exportSummaryData.late || 0}`,
        205,
        summaryY
      );

      doc.text(
        `Attendance Percentage: ${Number(
          exportSummaryData.attendancePercentage || 0
        ).toFixed(2)}%`,
        14,
        summaryY + 7
      );

      doc.save(
        `attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );

      notification.dismiss(toastId);

      notification.success(
        `PDF report exported successfully (${allRecords.length} records).`
      );
    } catch (err) {
      notification.dismiss(toastId);

      notification.error(
        err?.message || getApiErrorMessage(err)
      );
    } finally {
      setExporting(false);
    }
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="attendance-reports-page">

      <div className="page-header">
        <div>
          <h1>Attendance Report</h1>
        </div>
      </div>

      {error && (
        <div className="attendance-report-alert" role="alert">
          {error}
        </div>
      )}

      {/* Summary Cards */}

      <section className="attendance-report-summary-grid">

        <div className="dashboard-stat-card card-purple">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple">
              <FaUserFriends />
            </div>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-title">Total Records</span>
            <strong className="stat-card-value">
              {summary.totalRecords || 0}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-success">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-success">
              <FaUserCheck />
            </div>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-title">Present</span>
            <strong className="stat-card-value">
              {summary.present || 0}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-danger">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-danger">
              <FaUserTimes />
            </div>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-title">Absent</span>
            <strong className="stat-card-value">
              {summary.absent || 0}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-warning">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-warning">
              <FaUserClock />
            </div>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-title">Late</span>
            <strong className="stat-card-value">
              {summary.late || 0}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-bluewarning">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-bluewarning">
              <FaUserTimes />
            </div>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-title">Leave</span>
            <strong className="stat-card-value">
              {summary.leave || 0}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-bluewarning">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-bluewarning">
              <MdOutlineGraphicEq />
            </div>
          </div>

          <div className="stat-card-body">
            <span className="stat-card-title">
              Attendance Percentage
            </span>

            <strong className="stat-card-value">
              {formatPercentage(summary.attendancePercentage)}
            </strong>
          </div>
        </div>

      </section>

      {/* Filters */}

      <div className="common-card-filters">

        <div className="input-search noicon">
          <label htmlFor="attendance-from-date">
            From Date
          </label>

          <input
            id="attendance-from-date"
            type="date"
            name="from"
            value={filters.from}
            max={filters.to || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="input-search noicon">
          <label htmlFor="attendance-to-date">
            To Date
          </label>

          <input
            id="attendance-to-date"
            type="date"
            name="to"
            value={filters.to}
            min={filters.from || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="input-search">
          <label htmlFor="attendance-course">
            Course
          </label>

          <select
            id="attendance-course"
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
        </div>

        <div className="input-search">
          <label htmlFor="attendance-batch">
            Batch
          </label>

          <select
            id="attendance-batch"
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
        </div>

        {/* Student text search */}

        <div className="input-search">
          <label htmlFor="attendance-student-search">
            Student Details
          </label>

          <input
            id="attendance-student-search"
            type="text"
            name="student_search"
            value={filters.student_search}
            onChange={handleChange}
            placeholder="Search name, roll no, mobile, email..."
            maxLength={100}
            autoComplete="off"
          />
        </div>

        <div className="input-search">
          <label htmlFor="attendance-status">
            Attendance Status
          </label>

          <select
            id="attendance-status"
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
        </div>

        <div className="student-filter-actions">
          <button
            type="button"
            className="themebtn"
            onClick={handleApply}
            disabled={loading}
          >
            Apply Filter
          </button>

          <button
            type="button"
            className="themebtn themebtnline"
            onClick={handleReset}
            disabled={loading}
          >
            <FiRefreshCw />
            Reset
          </button>
        </div>

      </div>

      {/* Attendance Records */}

      <section className="common-card">

        <div className="panel-header">
          <div>
            <h3>Attendance Records</h3>
          </div>

          <div className="attendance-report-export-actions">

            <button
              type="button"
              className="themebtn exceldownload"
              onClick={exportExcel}
              disabled={loading || exporting || !pagination.total}
            >
              <RiFileExcel2Line />
              {exporting ? "Preparing..." : "Excel"}
            </button>

            <button
              type="button"
              className="themebtn pdfdownload"
              onClick={exportPDF}
              disabled={loading || exporting || !pagination.total}
            >
              <FaFilePdf />
              {exporting ? "Preparing..." : "PDF"}
            </button>

            <button
              type="button"
              className="themebtn"
              onClick={() => window.print()}
              disabled={loading || exporting}
            >
              <FiPrinter />
              Print
            </button>

            <button
              type="button"
              className="themebtn"
              onClick={handleRefresh}
              disabled={loading || exporting}
              title="Refresh attendance report"
            >
              <FiRefreshCw />
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
          <div className="common-table-wrapper">
            <table className="common-table">

              <thead>
                <tr>
                  <th>Student/Roll No.</th>
                  <th>Date</th>
                  <th>Attendance Status</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Remarks</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record._id}>

                    <td className="batch-name-cell">
                      <div className="student-name-cell">

                        <div className="student-avatar-wrapper">

                          {record.student_id?.profileImage && (
                            <img
                              alt={`${getStudentName(record.student_id)} profile`}
                              className="student-avatar"
                              src={getAssetUrl(record.student_id.profileImage)}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";

                                const fallback =
                                  event.currentTarget.parentElement?.querySelector(
                                    ".attendance-avatar-fallback"
                                  );

                                if (fallback) {
                                  fallback.style.display = "flex";
                                }
                              }}
                            />
                          )}

                          <div
                            className="student-avatar attendance-avatar-fallback"
                            style={{
                              display: record.student_id?.profileImage
                                ? "none"
                                : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              background: "#eaf0ff",
                              color: "#2457c5",
                            }}
                            aria-label={`${getStudentName(record.student_id)} initials`}
                          >
                            {getInitials(record.student_id)}
                          </div>

                        </div>

                        <div>
                          <strong>
                            {getStudentName(record.student_id)}
                          </strong>

                          <label className="student-roll">
                            {record.student_id?.rollNo || "—"}
                          </label>
                        </div>

                      </div>
                    </td>

                    <td>
                      <div className="contact-details">
                        <div className="contact-li">
                          <MdDateRange />
                          <span>
                            {formatDate(record.attendance_date)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`attendance-report-status ${(record.status || "").toLowerCase()}`}
                      >
                        {record.status || "-"}
                      </span>
                    </td>

                    <td>
                      {record.course_id?.courseTitle || "-"}
                    </td>

                    <td>
                      <span className="batchtag">
                        {record.batch_id?.batch_name || "-"}
                      </span>
                    </td>

                    <td>
                      {record.remarks || "-"}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

        {/* Pagination */}

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

          <p>
            {pagination.total || 0} matching records
            {pagination.totalPages > 0
              ? ` · Page ${pagination.page} of ${pagination.totalPages}`
              : ""}
          </p>

          <div>
            <button
              type="button"
              className="attendance-report-secondary-button"
              disabled={
                loading ||
                exporting ||
                (pagination.page || 1) <= 1
              }
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
                exporting ||
                (pagination.page || 1) >=
                  (pagination.totalPages || 1)
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    current + 1,
                    pagination.totalPages || 1
                  )
                )
              }
            >
              Next
            </button>
          </div>

        </div>

      </section>

      {/* Course-wise and Batch-wise Attendance */}

      <div className="twocolumn">

        {/* Course-wise */}

        <div className="common-card">

          <div className="panel-header">
            <div>
              <h3>Course-wise Attendance</h3>
              <p>
                Recorded attendance percentages grouped by course.
              </p>
            </div>
          </div>

          {!report.courseBreakdown.length ? (
            <div className="attendance-report-state">
              {loading
                ? "Loading course attendance..."
                : "No course breakdown available."}
            </div>
          ) : (
            <div className="course-attendance-list">

              {report.courseBreakdown.map((item) => {
                const percentage = Math.min(
                  100,
                  Math.max(
                    0,
                    Number(item.attendancePercentage) || 0
                  )
                );

                return (
                  <div
                    className="course-attendance-item"
                    key={item.courseId || item.courseTitle}
                  >

                    <div className="course-attendance-info">
                      <strong title={item.courseTitle || "Unnamed Course"}>
                        {item.courseTitle || "Unnamed Course"}
                      </strong>
                    </div>

                    <div
                      className="course-attendance-progress"
                      role="progressbar"
                      aria-label={`${item.courseTitle || "Course"} attendance`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <div
                        className={`course-attendance-progress-fill ${getPercentageClass(percentage)}`}
                        style={{
                          "--progress-width": `${percentage}%`,
                        }}
                      />
                    </div>

                    <strong
                      className={`course-attendance-percentage ${getPercentageTextClass(percentage)}`}
                    >
                      {formatPercentage(percentage)}
                    </strong>

                  </div>
                );
              })}

            </div>
          )}

        </div>

        {/* Batch-wise */}

        <div className="common-card">

          <div className="panel-header">
            <div>
              <h3>Batch-wise Attendance</h3>
              <p>
                Recorded attendance percentages grouped by batch.
              </p>
            </div>
          </div>

          {!report.batchBreakdown.length ? (
            <div className="attendance-report-state">
              {loading
                ? "Loading batch attendance..."
                : "No batch breakdown available."}
            </div>
          ) : (
            <div className="course-attendance-list">

              {report.batchBreakdown.map((item) => {
                const percentage = Math.min(
                  100,
                  Math.max(
                    0,
                    Number(item.attendancePercentage) || 0
                  )
                );

                const matchingBatch = options.batches.find(
                  (batch) =>
                    String(batch._id) === String(item.batchId)
                );

                const courseTitle =
                  item.courseTitle ||
                  item.course_id?.courseTitle ||
                  matchingBatch?.course_id?.courseTitle ||
                  matchingBatch?.course?.courseTitle ||
                  "Course not found";

                return (
                  <div
                    className="course-attendance-item"
                    key={item.batchId || item.batchName}
                  >

                    <div className="course-attendance-info">
                      <strong title={item.batchName || "Unnamed Batch"}>
                        {item.batchName || "Unnamed Batch"}
                      </strong>

                      <span className="batch-course-title">
                        Course: {courseTitle}
                      </span>
                    </div>

                    <div
                      className="course-attendance-progress"
                      role="progressbar"
                      aria-label={`${item.batchName || "Batch"} attendance`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <div
                        className={`course-attendance-progress-fill ${getPercentageClass(percentage)}`}
                        style={{
                          "--progress-width": `${percentage}%`,
                        }}
                      />
                    </div>

                    <strong
                      className={`course-attendance-percentage ${getPercentageTextClass(percentage)}`}
                    >
                      {formatPercentage(percentage)}
                    </strong>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>

      {/* Student-wise Attendance */}

      <section className="common-card">

        <div className="panel-header">
          <div>
            <h3>Student-wise Attendance</h3>
            <p>
              Attendance totals and percentages for each student in the
              selected report filters.
            </p>
          </div>
        </div>

        {!report.studentBreakdown.length ? (
          <div className="attendance-report-state">
            {loading
              ? "Loading student attendance..."
              : "No student breakdown available."}
          </div>
        ) : (
          <div className="common-table-wrapper">

            <table className="common-table">

              <thead>
                <tr>
                  <th>Student/Roll No.</th>
                  <th>Total</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Leave</th>
                  <th>Late</th>
                  <th>Attendance %</th>
                </tr>
              </thead>

              <tbody>
                {report.studentBreakdown.map((student) => {
                  const percentage = Math.min(
                    100,
                    Math.max(
                      0,
                      Number(student.attendancePercentage) || 0
                    )
                  );

                  return (
                    <tr
                      key={student.studentId || student.rollNo}
                    >

                      <td>
                        <div className="student-name-cell">

                          <div className="student-avatar-wrapper">

                            {student.profileImage && (
                              <img
                                alt={`${getStudentName(student)} profile`}
                                className="student-avatar"
                                src={getAssetUrl(student.profileImage)}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";

                                  const fallback =
                                    event.currentTarget.parentElement?.querySelector(
                                      ".attendance-avatar-fallback"
                                    );

                                  if (fallback) {
                                    fallback.style.display = "flex";
                                  }
                                }}
                              />
                            )}

                            <div
                              className="student-avatar attendance-avatar-fallback"
                              style={{
                                display: student.profileImage
                                  ? "none"
                                  : "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                background: "#eaf0ff",
                                color: "#2457c5",
                              }}
                              aria-label={`${getStudentName(student)} initials`}
                            >
                              {getInitials(student)}
                            </div>

                          </div>

                          <div>
                            <strong>{getStudentName(student)}</strong>

                            <label className="student-roll">
                              {student.rollNo || "—"}
                            </label>
                          </div>

                        </div>
                      </td>

                      <td>{student.totalRecords || 0}</td>
                      <td>{student.present || 0}</td>
                      <td>{student.absent || 0}</td>
                      <td>{student.leave || 0}</td>
                      <td>{student.late || 0}</td>

                      <td>
                        <div className="student-attendance-progress-wrap">

                          <div
                            className="course-attendance-progress"
                            role="progressbar"
                            aria-valuenow={percentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${getStudentName(student)} attendance`}
                          >
                            <div
                              className={`course-attendance-progress-fill ${getPercentageClass(percentage)}`}
                              style={{
                                "--progress-width": `${percentage}%`,
                              }}
                            />
                          </div>

                          <strong
                            className={`course-attendance-percentage ${getPercentageTextClass(percentage)}`}
                          >
                            {formatPercentage(percentage)}
                          </strong>

                        </div>
                      </td>

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

export default AttendanceReports;