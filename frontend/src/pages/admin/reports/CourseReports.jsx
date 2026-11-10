
import { useCallback, useEffect, useState } from "react";
import { FaBookOpen, FaFilePdf } from "react-icons/fa";
import { MdCurrencyRupee, MdDateRange } from "react-icons/md";
import { FiRefreshCw } from "react-icons/fi";
import { RiFileExcel2Line } from "react-icons/ri";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { getCourseReport } from "../../../services/courseReportService";
import { getAssetUrl } from "../../../utils/assetUrl";
import notification from "../../../utils/notification";
import Pagination from "../../../components/common/Pagination";
import { fetchAllReportPages } from "../../../utils/fetchAllReportPages";

import "../../../styles/CourseReports.css";

const getData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPdfCurrency = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDuration = (duration, unit) => {
  if (duration === null || duration === undefined || duration === "") {
    return "-";
  }
  return `${duration} ${unit || ""}`.trim();
};

const initialFilters = {
  course_search: "",
  course_status: "",
  course_type: "",
  course_category: "",
};

const CourseReports = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [report, setReport] = useState({
    summary: {},
    courses: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  });
  const [filterOptions, setFilterOptions] = useState({
    courseTypes: [],
    categories: [],
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadReport = useCallback(async (
    currentFilters = filters,
    page = 1,
    limit = report.pagination.limit
  ) => {
    try {
      setLoading(true);

      const params = {
        page,
        limit,
      };

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          params[key] = String(value).trim();
        }
      });

      const response = await getCourseReport(params);
      const data = getData(response);

      setReport({
        summary: data.summary || {},
        courses: Array.isArray(data.courses) ? data.courses : [],
        pagination: data.pagination || {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      });

      if (data.filterOptions) {
        setFilterOptions({
          courseTypes: Array.isArray(data.filterOptions.courseTypes)
            ? data.filterOptions.courseTypes
            : [],
          categories: Array.isArray(data.filterOptions.categories)
            ? data.filterOptions.categories
            : [],
        });
      }
    } catch (error) {
      console.error("Course report error:", error);
      notification.error(
        error?.response?.data?.message || "Unable to load course report."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, report.pagination.limit]);

  useEffect(() => {
    loadReport(initialFilters, 1, 10);
    // Initial report request only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleApply = () => {
    loadReport(filters, 1, report.pagination.limit);
  };

  const handleReset = () => {
    setFilters(initialFilters);
    loadReport(initialFilters, 1, report.pagination.limit);
  };

  const getExportData = async () => {
    const result = await fetchAllReportPages({
      fetchPage: getCourseReport,
      filters,
      recordsKey: "courses",
    });

    return result;
  };

  const exportExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);
      const { rows, summary } = await getExportData();

      if (!rows.length) {
        notification.info("There are no course records to export.");
        return;
      }

      const courseRows = rows.map((item, index) => {
        const course = item.course || {};

        return {
          "S.No": index + 1,
          Course: course.courseTitle || "-",
          "Course Type": course.courseType || "-",
          Category: course.courseCategory || "-",
          MRP: Number(course.mrp || 0),
          Price: Number(course.price || 0),
          "Display Order": Number(course.displayOrder || 0),
          Duration: formatDuration(course.duration, course.durationUnit),
          "Duration Unit": course.durationUnit || "-",
          "Course Image": course.courseImage || "-",
          "Preview Video": course.previewVideo || "-",
          "Total Lectures": Number(course.totalLectures || 0),
          "Practical Marks": Number(course.practicalMarks || 0),
          "Objective Marks": Number(course.objectiveMarks || 0),
          "Certificate Subject": course.certificateSubject || "-",
          Popular: course.popular ? "Yes" : "No",
          Recommended: course.recommended ? "Yes" : "No",
          "MRP Visible": course.mrpVisible ? "Yes" : "No",
          "Hide Exam Result": course.hideExamResult ? "Yes" : "No",
          Status: course.status || "-",
          Students: Number(item.totalStudents || 0),
          Admissions: Number(item.totalAdmissions || 0),
          Active: Number(item.activeAdmissions || 0),
          Completed: Number(item.completedAdmissions || 0),
          Dropped: Number(item.droppedAdmissions || 0),
          "Course Fees": Number(item.totalCourseFees || 0),
          Paid: Number(item.totalPaidAmount || 0),
          Remaining: Number(item.totalRemainingAmount || 0),
          Description: course.description || "",
          Syllabus: course.syllabus || "",
          Eligibility: course.eligibility || "",
        };
      });

      const summaryRows = [
        ["Total Courses", summary.totalCourses],
        ["Total Students", summary.totalStudents],
        ["Total Admissions", summary.totalAdmissions],
        ["Active Admissions", summary.activeAdmissions],
        ["Completed Admissions", summary.completedAdmissions],
        ["Dropped Admissions", summary.droppedAdmissions],
        ["Total Course Fees", summary.totalCourseFees],
        ["Total Paid Amount", summary.totalPaidAmount],
        ["Total Remaining Amount", summary.totalRemainingAmount],
      ].map(([label, value]) => ({
        "Report Item": label,
        Value: Number(value || 0),
      }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(courseRows),
        "Course Report"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        "Summary"
      );

      XLSX.writeFile(
        workbook,
        `course-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      notification.success(`Excel exported successfully (${rows.length} courses).`);
    } catch (error) {
      console.error("Course Excel export error:", error);
      notification.error(
        error?.response?.data?.message || error.message || "Unable to export course report."
      );
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    if (exporting) return;

    try {
      setExporting(true);
      const { rows, summary } = await getExportData();

      if (!rows.length) {
        notification.info("There are no course records to export.");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(18);
      doc.text("Course Report", 14, 16);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 23);

      doc.text(`Courses: ${summary.totalCourses || 0}`, 14, 30);
      doc.text(`Students: ${summary.totalStudents || 0}`, 55, 30);
      doc.text(`Admissions: ${summary.totalAdmissions || 0}`, 100, 30);
      doc.text(`Active: ${summary.activeAdmissions || 0}`, 155, 30);
      doc.text(
        `Remaining: ${formatPdfCurrency(summary.totalRemainingAmount)}`,
        200,
        30
      );

      autoTable(doc, {
        startY: 37,
        head: [[
          "S.No", "Course", "Type", "Category", "MRP", "Price",
          "Duration", "Lectures", "Students", "Admissions", "Active",
          "Completed", "Dropped", "Fees", "Paid", "Remaining", "Status",
        ]],
        body: rows.map((item, index) => {
          const course = item.course || {};

          return [
            index + 1,
            course.courseTitle || "-",
            course.courseType || "-",
            course.courseCategory || "-",
            formatPdfCurrency(course.mrp),
            formatPdfCurrency(course.price),
            formatDuration(course.duration, course.durationUnit),
            Number(course.totalLectures || 0),
            Number(item.totalStudents || 0),
            Number(item.totalAdmissions || 0),
            Number(item.activeAdmissions || 0),
            Number(item.completedAdmissions || 0),
            Number(item.droppedAdmissions || 0),
            formatPdfCurrency(item.totalCourseFees),
            formatPdfCurrency(item.totalPaidAmount),
            formatPdfCurrency(item.totalRemainingAmount),
            course.status || "-",
          ];
        }),
        styles: { fontSize: 5.5, cellPadding: 1.5 },
        headStyles: { fontSize: 5.5 },
        margin: { left: 7, right: 7 },
        showHead: "everyPage",
      });

      doc.save(
        `course-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );

      notification.success(`PDF exported successfully (${rows.length} courses).`);
    } catch (error) {
      console.error("Course PDF export error:", error);
      notification.error(
        error?.response?.data?.message || error.message || "Unable to export course report."
      );
    } finally {
      setExporting(false);
    }
  };

  const summary = report.summary || {};
  const courses = report.courses || [];
  const pagination = report.pagination || {};

  return (
    <div className="course-reports-page">
      <div className="page-header">
        <div>
          <h1>Course Reports</h1>
        </div>

        <div className="admission-report-actions">
          <button
            type="button"
            className="themebtn exceldownload"
            onClick={exportExcel}
            disabled={exporting || loading || !pagination.total}
          >
            <RiFileExcel2Line />
            {exporting ? "Preparing..." : "Excel"}
          </button>

          <button
            type="button"
            className="themebtn pdfdownload"
            onClick={exportPDF}
            disabled={exporting || loading || !pagination.total}
          >
            <FaFilePdf />
            {exporting ? "Preparing..." : "PDF"}
          </button>
        </div>
      </div>

      <div className="course-report-summary">
        <div className="dashboard-stat-card card-purple">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple"><FaBookOpen /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Courses</span>
            <strong className="stat-card-value">{Number(summary.totalCourses || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-success">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-success"><FaBookOpen /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Completed Admissions</span>
            <strong className="stat-card-value">{Number(summary.completedAdmissions || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-bluewarning">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-bluewarning"><MdCurrencyRupee /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Course Fees</span>
            <strong className="stat-card-value">{formatCurrency(summary.totalCourseFees)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-danger">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-danger"><MdCurrencyRupee /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Remaining Fees</span>
            <strong className="stat-card-value">{formatCurrency(summary.totalRemainingAmount)}</strong>
          </div>
        </div>
      </div>

      <div className="common-card-filters">
        <div className="input-search noicon">
          <label htmlFor="course-report-search">Search Course</label>
          <input
            id="course-report-search"
            name="course_search"
            value={filters.course_search}
            onChange={handleChange}
            placeholder="Search course..."
          />
        </div>

        <div className="input-search">
          <label htmlFor="course-report-status">Status</label>
          <select
            id="course-report-status"
            name="course_status"
            value={filters.course_status}
            onChange={handleChange}
          >
            <option value="">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        <div className="input-search">
          <label htmlFor="course-report-type">Course Type</label>
          <select
            id="course-report-type"
            name="course_type"
            value={filters.course_type}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">All Course Types</option>
            {filterOptions.courseTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="input-search">
          <label htmlFor="course-report-category">Category</label>
          <select
            id="course-report-category"
            name="course_category"
            value={filters.course_category}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>{category}</option>
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
            <FiRefreshCw /> Reset
          </button>
        </div>
      </div>

      <div className="common-card">
        <div className="common-table-wrapper">
          <table className="common-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Course</th>
                <th>Category</th>
                <th>MRP</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Lectures</th>
                <th>Popular</th>
                <th>Recommended</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="10">Loading course report...</td></tr>
              ) : !courses.length ? (
                <tr><td colSpan="10">No course records found.</td></tr>
              ) : (
                courses.map((item, index) => {
                  const course = item.course || {};

                  return (
                    <tr key={course._id || index}>
                      <td>
                        {course.courseImage ? (
                          <img
                            className="course-report-image"
                            src={getAssetUrl(course.courseImage)}
                            alt={course.courseTitle || "Course"}
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="course-report-image-placeholder">—</div>
                        )}
                      </td>

                      <td className="course-name-cell">
                        <strong>{course.courseTitle || "-"}</strong>
                        <span>{course.courseType || "-"}</span>
                      </td>

                      <td>{course.courseCategory || "-"}</td>
                      <td><span className="tag-purple">{formatCurrency(course.mrp)}</span></td>
                      <td><span className="tag-success">{formatCurrency(course.price)}</span></td>
                      <td>
                        <div className="contact-details">
                          <div className="contact-li">
                            <MdDateRange />
                            <span>{formatDuration(course.duration, course.durationUnit)}</span>
                          </div>
                        </div>
                      </td>
                      <td>{Number(course.totalLectures || 0)}</td>

                      <td>
                        <span className={`report-badge ${course.popular ? "yes" : "no"}`}>
                          {course.popular ? "Yes" : "No"}
                        </span>
                      </td>

                      <td>
                        <span className={`report-badge ${course.recommended ? "yes" : "no"}`}>
                          {course.recommended ? "Yes" : "No"}
                        </span>
                      </td>

                      <td>
                        <span className={`course-status-badge ${String(course.status || "").toLowerCase()}`}>
                          {course.status || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={pagination.page || 1}
          totalPages={pagination.totalPages || 0}
          total={pagination.total || 0}
          itemCount={courses.length}
          itemLabel="courses"
          limit={pagination.limit || 10}
          loading={loading}
          onPageChange={(nextPage) =>
            loadReport(filters, nextPage, pagination.limit || 10)
          }
          onLimitChange={(nextLimit) =>
            loadReport(filters, 1, nextLimit)
          }
        />
      </div>
    </div>
  );
};

export default CourseReports;
