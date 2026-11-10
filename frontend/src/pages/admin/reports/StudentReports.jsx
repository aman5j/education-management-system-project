import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import {
  getStudentReport,
  getStudentReportFilters,
} from "../../../services/studentReportService";
import { getAssetUrl } from "../../../utils/assetUrl";
import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import { fetchAllReportPages } from "../../../utils/fetchAllReportPages";
import { IoIosCall } from "react-icons/io";
import { MdOutgoingMail, MdDateRange } from "react-icons/md";
import { FaUserFriends, FaFilePdf } from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { RiFileExcel2Line } from "react-icons/ri";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "../../../styles/StudentReports.css";

const EMPTY_FILTERS = {
  date_from: "",
  date_to: "",
  course_id: "",
  batch_id: "",
  status: "",
};

const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN");
};

const getStatusLabel = (status) => {
  if (!status) return "-";
  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const getStudentName = (student) =>
  student?.studentName ||
  [student?.firstName, student?.surname].filter(Boolean).join(" ").trim() ||
  "-";

const getInitials = (name) =>
  String(name || "Student")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "S";

const StudentReports = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [filterData, setFilterData] = useState({
    courses: [],
    batches: [],
  });

  const [report, setReport] = useState({
    summary: {},
    students: [],
    pagination: DEFAULT_PAGINATION,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);

  const requestId = useRef(0);
  const initialLoadStarted = useRef(false);

  const availableBatches = useMemo(() => {
    if (!filters.course_id) return filterData.batches;

    return filterData.batches.filter((batch) => {
      const courseId = batch?.course_id?._id || batch?.course_id;
      return String(courseId || "") === String(filters.course_id);
    });
  }, [filters.course_id, filterData.batches]);

  const loadFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);

      const response = await getStudentReportFilters();
      const data = getResponseData(response);

      setFilterData({
        courses: Array.isArray(data.courses) ? data.courses : [],
        batches: Array.isArray(data.batches) ? data.batches : [],
      });
    } catch (error) {
      console.error("Student report filters error:", error);
      notification.error(getApiErrorMessage(error));
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async ({
      currentFilters = EMPTY_FILTERS,
      currentSearch = "",
      currentPage = 1,
      currentLimit = 10,
    } = {}) => {
      const currentRequestId = ++requestId.current;

      try {
        setLoading(true);

        const params = {
          ...currentFilters,
          q: currentSearch.trim(),
          page: currentPage,
          limit: currentLimit,
        };

        const response = await getStudentReport(params);
        const data = getResponseData(response);

        if (currentRequestId !== requestId.current) return;

        setReport({
          summary: data.summary || {},
          students: Array.isArray(data.students) ? data.students : [],
          pagination: data.pagination || {
            ...DEFAULT_PAGINATION,
            page: currentPage,
            limit: currentLimit,
          },
        });
      } catch (error) {
        if (currentRequestId !== requestId.current) return;

        console.error("Student report error:", error);
        setReport({
          summary: {},
          students: [],
          pagination: {
            ...DEFAULT_PAGINATION,
            page: currentPage,
            limit: currentLimit,
          },
        });

        notification.error(getApiErrorMessage(error));
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (authLoading || !isAuthenticated || initialLoadStarted.current) {
      return;
    }

    initialLoadStarted.current = true;
    void loadFilters();
    void loadReport();
  }, [authLoading, isAuthenticated, loadFilters, loadReport]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "course_id" ? { batch_id: "" } : {}),
    }));
  };

  const handleApply = () => {
    if (
      filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
    ) {
      notification.warning("From Date cannot be later than To Date.");
      return;
    }

    setPage(1);
    setAppliedSearch(searchTerm.trim());

    void loadReport({
      currentFilters: filters,
      currentSearch: searchTerm,
      currentPage: 1,
      currentLimit: limit,
    });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setSearchTerm("");
    setAppliedSearch("");
    setPage(1);

    void loadReport({
      currentFilters: EMPTY_FILTERS,
      currentSearch: "",
      currentPage: 1,
      currentLimit: limit,
    });
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);

    void loadReport({
      currentFilters: filters,
      currentSearch: appliedSearch,
      currentPage: nextPage,
      currentLimit: limit,
    });
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);

    void loadReport({
      currentFilters: filters,
      currentSearch: appliedSearch,
      currentPage: 1,
      currentLimit: nextLimit,
    });
  };

  const students = report.students || [];
  const summary = report.summary || {};
  const pagination = report.pagination || DEFAULT_PAGINATION;



const getAllStudentsForExport = async () => {
  return fetchAllReportPages({
    fetchPage: getStudentReport,
    filters: {
      ...filters,
      q: appliedSearch.trim(),
    },
    recordsKey: "students",
  });
};

const exportExcel = async () => {
  if (exporting || loading) return;

  setExporting(true);

  try {
    notification.info("Preparing complete student report...");

    const { rows: allStudents, summary: exportSummary, total } =
      await getAllStudentsForExport();

    if (!allStudents.length) {
      notification.warning("No student records available to export.");
      return;
    }

    const rows = allStudents.map((student, index) => ({
      "S.No": index + 1,
      "Student Name": getStudentName(student),
      "Father Name": student.fatherName || "-",
      "Roll No": student.rollNo || "-",
      Gender: student.gender || "-",
      Mobile: student.mobile || "-",
      Email: student.email || "-",
      Course: student.course || "-",
      Batch: student.batch || "-",
      "Admission Date": formatDate(student.admissionDate),
      "Admission Status": student.admissionStatus || "-",
      Status: getStatusLabel(student.status),
      "Registration Date": formatDate(student.createdAt),
    }));

    const summaryRows = [
      {
        Metric: "Total Students",
        Value: Number(exportSummary.totalStudents || 0),
      },
      {
        Metric: "Active Students",
        Value: Number(exportSummary.activeStudents || 0),
      },
      {
        Metric: "Inactive Students",
        Value: Number(exportSummary.inactiveStudents || 0),
      },
      {
        Metric: "Students in Selected Period",
        Value: Number(exportSummary.newStudents || 0),
      },
      {
        Metric: "Total Records Exported",
        Value: total,
      },
      {
        Metric: "Export Date",
        Value: new Date().toLocaleString("en-IN"),
      },
    ];

    const workbook = XLSX.utils.book_new();
    const reportSheet = XLSX.utils.json_to_sheet(rows);
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);

    reportSheet["!cols"] = [
      { wch: 8 },
      { wch: 26 },
      { wch: 25 },
      { wch: 18 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 28 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
    ];

    summarySheet["!cols"] = [
      { wch: 34 },
      { wch: 25 },
    ];

    reportSheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    if (reportSheet["!ref"]) {
      reportSheet["!autofilter"] = {
        ref: reportSheet["!ref"],
      };
    }

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      "Student Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `student-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    notification.success(
      `Student Excel exported successfully (${total} records).`
    );
  } catch (error) {
    console.error("Student Excel export error:", error);
    notification.error(getApiErrorMessage(error));
  } finally {
    setExporting(false);
  }
};

const exportPDF = async () => {
  if (exporting || loading) return;

  setExporting(true);

  try {
    notification.info("Preparing complete student PDF...");

    const { rows: allStudents, summary: exportSummary, total } =
      await getAllStudentsForExport();

    if (!allStudents.length) {
      notification.warning("No student records available to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(18);
    doc.text("IT Learning Institute", 14, 15);

    doc.setFontSize(14);
    doc.text("Student Report", 14, 23);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      14,
      30
    );

    let currentY = 37;
    const appliedFilters = [];

    if (filters.date_from) {
      appliedFilters.push(`From: ${filters.date_from}`);
    }

    if (filters.date_to) {
      appliedFilters.push(`To: ${filters.date_to}`);
    }

    if (filters.course_id) {
      const course = filterData.courses.find(
        (item) => String(item._id) === String(filters.course_id)
      );

      if (course) {
        appliedFilters.push(`Course: ${course.courseTitle}`);
      }
    }

    if (filters.batch_id) {
      const batch = filterData.batches.find(
        (item) => String(item._id) === String(filters.batch_id)
      );

      if (batch) {
        appliedFilters.push(`Batch: ${batch.batch_name}`);
      }
    }

    if (filters.status) {
      appliedFilters.push(
        `Status: ${getStatusLabel(filters.status)}`
      );
    }

    if (appliedSearch) {
      appliedFilters.push(`Search: ${appliedSearch}`);
    }

    if (appliedFilters.length) {
      doc.text(
        `Filters: ${appliedFilters.join(" | ")}`,
        14,
        currentY
      );
      currentY += 7;
    }

    doc.text(
      `Total Students: ${Number(exportSummary.totalStudents || 0)}`,
      14,
      currentY
    );

    doc.text(
      `Active: ${Number(exportSummary.activeStudents || 0)}`,
      75,
      currentY
    );

    doc.text(
      `Inactive: ${Number(exportSummary.inactiveStudents || 0)}`,
      115,
      currentY
    );

    doc.text(
      `Exported Records: ${total}`,
      165,
      currentY
    );

    doc.text(
      `Period Students: ${Number(exportSummary.newStudents || 0)}`,
      220,
      currentY
    );

    currentY += 7;

    autoTable(doc, {
      startY: currentY,
      head: [[
        "S.No",
        "Student",
        "Father Name",
        "Roll No",
        "Gender",
        "Mobile",
        "Email",
        "Course",
        "Batch",
        "Admission Date",
        "Status",
      ]],
      body: allStudents.map((student, index) => [
        index + 1,
        getStudentName(student),
        student.fatherName || "-",
        student.rollNo || "-",
        student.gender || "-",
        student.mobile || "-",
        student.email || "-",
        student.course || "-",
        student.batch || "-",
        formatDate(student.admissionDate),
        getStatusLabel(student.status),
      ]),
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: {
        fontSize: 7,
      },
      margin: {
        left: 10,
        right: 10,
      },
      showHead: "everyPage",
    });

    doc.save(
      `student-report-${new Date().toISOString().slice(0, 10)}.pdf`
    );

    notification.success(
      `Student PDF exported successfully (${total} records).`
    );
  } catch (error) {
    console.error("Student PDF export error:", error);
    notification.error(getApiErrorMessage(error));
  } finally {
    setExporting(false);
  }
};



  return (
    <div className="student-reports-page">
      <div className="page-header">
        <div>
          <h1>Student Reports</h1>
        </div>

        <div className="student-report-actions">
          <button
            type="button"
            className="themebtn exceldownload"
            onClick={exportExcel}
            disabled={!students.length || loading || exporting}
          >
            <RiFileExcel2Line />
            {exporting ? "Preparing..." : "Excel"}
          </button>

          <button
            type="button"
            className="themebtn pdfdownload"
            onClick={exportPDF}
            disabled={!students.length || loading || exporting}
          >
            <FaFilePdf />
            {exporting ? "Preparing..." : "PDF"}
          </button>
        </div>
      </div>

      <div className="student-report-summary">
        <div className="dashboard-stat-card card-success">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-success"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Students</span>
            <strong className="stat-card-value">{Number(summary.totalStudents || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-purple">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Active Students</span>
            <strong className="stat-card-value">{Number(summary.activeStudents || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-danger">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-danger"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Inactive Students</span>
            <strong className="stat-card-value">{Number(summary.inactiveStudents || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-bluewarning">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-bluewarning"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">New Students</span>
            <strong className="stat-card-value">{Number(summary.newStudents || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="common-card-filters">
        <div className="input-search">
          <label htmlFor="student-report-search">Search Student</label>
          <input
            id="student-report-search"
            type="search"
            placeholder="Name, roll no, email, mobile..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleApply();
            }}
          />
        </div>

        <div className="input-search">
          <label htmlFor="student-report-date-from">From Date</label>
          <input
            id="student-report-date-from"
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleChange}
          />
        </div>

        <div className="input-search">
          <label htmlFor="student-report-date-to">To Date</label>
          <input
            id="student-report-date-to"
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleChange}
          />
        </div>

        <div className="input-search">
          <label htmlFor="student-report-course">Course</label>
          <select
            id="student-report-course"
            name="course_id"
            value={filters.course_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">All Courses</option>
            {filterData.courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseTitle}
              </option>
            ))}
          </select>
        </div>

        <div className="input-search">
          <label htmlFor="student-report-batch">Batch</label>
          <select
            id="student-report-batch"
            name="batch_id"
            value={filters.batch_id}
            onChange={handleChange}
            disabled={filtersLoading || !availableBatches.length}
          >
            <option value="">All Batches</option>
            {availableBatches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.batch_name}
              </option>
            ))}
          </select>
        </div>

        <div className="input-search">
          <label htmlFor="student-report-status">Status</label>
          <select
            id="student-report-status"
            name="status"
            value={filters.status}
            onChange={handleChange}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="student-filter-actions">
          <button
            type="button"
            className="themebtn"
            onClick={handleApply}
            disabled={loading}
          >
            Apply Filters
          </button>

          <button
            type="button"
            className="themebtn themebtnline"
            onClick={handleReset}
            disabled={loading}
          >
            <FiRefreshCw /> Reset
          </button>
        </div>
      </div>

      <div className="common-card">
        {loading ? (
          <div className="student-report-empty">Loading student report...</div>
        ) : students.length === 0 ? (
          <div className="student-report-empty">
            {appliedSearch
              ? "No students match your search."
              : "No student records found for the selected filters."}
          </div>
        ) : (
          <div className="common-table-wrapper">
            <table className="common-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Gender</th>
                  <th>Contact</th>
                  <th>Course / Batch</th>
                  <th>Admission Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div className="student-name-cell">
                        <div className="student-avatar-wrapper">
                          {student.profileImage ? (
                            <img
                              alt={`${getStudentName(student)} profile`}
                              className="student-avatar"
                              src={getAssetUrl(student.profileImage)}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                                const fallback =
                                  event.currentTarget.parentElement?.querySelector(
                                    ".student-avatar-fallback"
                                  );
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}

                          <div
                            className="student-avatar-fallback"
                            style={{
                              display: student.profileImage ? "none" : "flex",
                            }}
                          >
                            {getInitials(getStudentName(student))}
                          </div>
                        </div>

                        <div className="student-report-identity">
                          <strong>{getStudentName(student)}</strong>
                          <span>Father: {student.fatherName || "-"}</span>

                          {student.signature && (
                            <div className="student-report-signature">
                              <img
                                className="student-signature"
                                src={getAssetUrl(student.signature)}
                                alt={`${getStudentName(student)} signature`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="student-roll">{student.rollNo || "-"}</span>
                    </td>

                    <td>{student.gender || "-"}</td>

                    <td>
                      <div className="contact-details">
                        <div className="contact-li">
                          <IoIosCall />
                          <span>{student.mobile || "-"}</span>
                        </div>
                        <div className="contact-li">
                          <MdOutgoingMail />
                          <span>{student.email || "-"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {student.course || "-"}
                      <br />
                      <span className="batchtag">{student.batch || "-"}</span>
                    </td>

                    <td>
                      <div className="contact-details">
                        <div className="contact-li">
                          <MdDateRange />
                          <span>{formatDate(student.admissionDate)}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`student-report-status ${String(
                          student.status || ""
                        ).toLowerCase()}`}
                      >
                        {getStatusLabel(student.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page || page}
          totalPages={pagination.totalPages || 0}
          total={pagination.total || 0}
          itemCount={students.length}
          itemLabel="students"
          limit={pagination.limit || limit}
          loading={loading}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>
    </div>
  );
};

export default StudentReports;