
import { useCallback, useEffect, useState } from "react";
import { FaClipboardList, FaUserFriends, FaFilePdf } from "react-icons/fa";
import { GiOfficeChair } from "react-icons/gi";
import { FiRefreshCw } from "react-icons/fi";
import { RiFileExcel2Line } from "react-icons/ri";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getBatchReport,
  getBatchReportFilters,
} from "../../../services/batchReportService";

import notification from "../../../utils/notification";
import Pagination from "../../../components/common/Pagination";
import { fetchAllReportPages } from "../../../utils/fetchAllReportPages";

import "../../../styles/BatchReports.css";

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

const initialFilters = {
  search: "",
  course_id: "",
  status: "",
};

const BatchReports = () => {
  const [filters, setFilters] = useState(initialFilters);
  const [filterData, setFilterData] = useState({ courses: [], batches: [] });
  const [report, setReport] = useState({
    summary: {},
    batches: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadFilters = async () => {
    try {
      setFiltersLoading(true);
      const response = await getBatchReportFilters();
      const data = getData(response);

      setFilterData({
        courses: Array.isArray(data.courses) ? data.courses : [],
        batches: Array.isArray(data.batches) ? data.batches : [],
      });
    } catch (error) {
      console.error("Batch report filters error:", error);
      notification.error(
        error?.response?.data?.message || "Unable to load batch report filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  };

  const loadReport = useCallback(async (
    currentFilters = filters,
    page = 1,
    limit = report.pagination.limit
  ) => {
    try {
      setLoading(true);

      const params = { page, limit };

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (String(value || "").trim()) {
          params[key] = String(value).trim();
        }
      });

      const response = await getBatchReport(params);
      const data = getData(response);

      setReport({
        summary: data.summary || {},
        batches: Array.isArray(data.batches) ? data.batches : [],
        pagination: data.pagination || {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    } catch (error) {
      console.error("Batch report error:", error);
      notification.error(
        error?.response?.data?.message || "Unable to load batch report."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, report.pagination.limit]);

  useEffect(() => {
    loadFilters();
    loadReport(initialFilters, 1, 10);
    // Initial report and filter loading only.
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

  const handleRefresh = async () => {
    await Promise.all([
      loadFilters(),
      loadReport(filters, 1, report.pagination.limit),
    ]);
  };

  const getExportData = async () =>
    fetchAllReportPages({
      fetchPage: getBatchReport,
      filters,
      recordsKey: "batches",
    });

  const exportExcel = async () => {
    if (exporting) return;

    try {
      setExporting(true);
      const { rows, summary } = await getExportData();

      if (!rows.length) {
        notification.info("There are no batch records to export.");
        return;
      }

      const batchRows = rows.map((item, index) => {
        const batch = item.batch || {};
        const course = batch.course_id || {};

        return {
          "S.No": index + 1,
          "Batch Name": batch.batch_name || "-",
          Course: course.courseTitle || "-",
          "Course Type": course.courseType || "-",
          Category: course.courseCategory || "-",
          "Maximum Seats": Number(item.maxSeats || 0),
          "Occupied Seats": Number(item.occupiedSeats || 0),
          "Available Seats": Number(item.availableSeats || 0),
          "Occupancy %": Number(item.occupancyPercentage || 0),
          Students: Number(item.totalStudents || 0),
          Admissions: Number(item.totalAdmissions || 0),
          Active: Number(item.activeAdmissions || 0),
          Completed: Number(item.completedAdmissions || 0),
          Dropped: Number(item.droppedAdmissions || 0),
          "Course Fees": Number(item.totalCourseFees || 0),
          Paid: Number(item.totalPaidAmount || 0),
          Remaining: Number(item.totalRemainingAmount || 0),
          Status: batch.status || "-",
          Created: batch.createdAt
            ? new Date(batch.createdAt).toLocaleString("en-IN")
            : "-",
          Updated: batch.updatedAt
            ? new Date(batch.updatedAt).toLocaleString("en-IN")
            : "-",
        };
      });

      const summaryRows = [
        ["Total Batches", summary.totalBatches],
        ["Total Students", summary.totalStudents],
        ["Total Admissions", summary.totalAdmissions],
        ["Total Capacity", summary.totalCapacity],
        ["Occupied Seats", summary.totalOccupiedSeats],
        ["Available Seats", summary.totalAvailableSeats],
        ["Active Admissions", summary.activeAdmissions],
        ["Completed Admissions", summary.completedAdmissions],
        ["Dropped Admissions", summary.droppedAdmissions],
        ["Total Course Fees", summary.totalCourseFees],
        ["Total Paid", summary.totalPaidAmount],
        ["Total Remaining", summary.totalRemainingAmount],
      ].map(([label, value]) => ({
        "Report Item": label,
        Value: Number(value || 0),
      }));

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(batchRows),
        "Batch Report"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        "Summary"
      );

      XLSX.writeFile(
        workbook,
        `batch-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      notification.success(`Excel exported successfully (${rows.length} batches).`);
    } catch (error) {
      console.error("Batch Excel export error:", error);
      notification.error(
        error?.response?.data?.message || error.message || "Unable to export batch report."
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
        notification.info("There are no batch records to export.");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(18);
      doc.text("Batch Report", 14, 16);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 23);
      doc.text(`Batches: ${summary.totalBatches || 0}`, 14, 30);
      doc.text(`Students: ${summary.totalStudents || 0}`, 55, 30);
      doc.text(`Admissions: ${summary.totalAdmissions || 0}`, 100, 30);
      doc.text(`Capacity: ${summary.totalCapacity || 0}`, 150, 30);
      doc.text(
        `Remaining: ${formatPdfCurrency(summary.totalRemainingAmount)}`,
        200,
        30
      );

      autoTable(doc, {
        startY: 36,
        head: [[
          "S.No", "Batch", "Course", "Type", "Max", "Occupied",
          "Available", "Occupancy", "Students", "Admissions", "Active",
          "Completed", "Dropped", "Fees", "Paid", "Remaining", "Status",
        ]],
        body: rows.map((item, index) => {
          const batch = item.batch || {};
          const course = batch.course_id || {};

          return [
            index + 1,
            batch.batch_name || "-",
            course.courseTitle || "-",
            course.courseType || "-",
            Number(item.maxSeats || 0),
            Number(item.occupiedSeats || 0),
            Number(item.availableSeats || 0),
            `${Number(item.occupancyPercentage || 0)}%`,
            Number(item.totalStudents || 0),
            Number(item.totalAdmissions || 0),
            Number(item.activeAdmissions || 0),
            Number(item.completedAdmissions || 0),
            Number(item.droppedAdmissions || 0),
            formatPdfCurrency(item.totalCourseFees),
            formatPdfCurrency(item.totalPaidAmount),
            formatPdfCurrency(item.totalRemainingAmount),
            batch.status || "-",
          ];
        }),
        styles: { fontSize: 5.7, cellPadding: 1.5 },
        headStyles: { fontSize: 5.7 },
        margin: { left: 7, right: 7 },
        showHead: "everyPage",
      });

      doc.save(
        `batch-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );

      notification.success(`PDF exported successfully (${rows.length} batches).`);
    } catch (error) {
      console.error("Batch PDF export error:", error);
      notification.error(
        error?.response?.data?.message || error.message || "Unable to export batch report."
      );
    } finally {
      setExporting(false);
    }
  };

  const summary = report.summary || {};
  const batches = report.batches || [];
  const pagination = report.pagination || {};

  return (
    <div className="batch-reports-page">
      <div className="page-header">
        <div>
          <h1>Batch Reports</h1>
        </div>

        <div className="student-report-actions">
          <button
            type="button"
            className="themebtn"
            onClick={handleRefresh}
            disabled={loading || filtersLoading}
          >
            <FiRefreshCw /> Refresh
          </button>

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

      <div className="batch-report-summary">
        <div className="dashboard-stat-card card-success">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-success"><FaClipboardList /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Batches</span>
            <strong className="stat-card-value">{Number(summary.totalBatches || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-purple">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Students</span>
            <strong className="stat-card-value">{Number(summary.totalStudents || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-bluewarning">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-bluewarning"><GiOfficeChair /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Seats</span>
            <strong className="stat-card-value">{Number(summary.totalCapacity || 0)}</strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-danger">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-danger"><GiOfficeChair /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Available Seats</span>
            <strong className="stat-card-value">{Number(summary.totalAvailableSeats || 0)}</strong>
          </div>
        </div>
      </div>

      <div className="common-card-filters">
        <div className="input-search noicon">
          <label htmlFor="batch-report-search">Search Batch</label>
          <input
            id="batch-report-search"
            name="search"
            value={filters.search}
            onChange={handleChange}
            placeholder="Search batch..."
          />
        </div>

        <div className="input-search">
          <label htmlFor="batch-report-course">Course</label>
          <select
            id="batch-report-course"
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
          <label htmlFor="batch-report-status">Status</label>
          <select
            id="batch-report-status"
            name="status"
            value={filters.status}
            onChange={handleChange}
          >
            <option value="">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Closed">Closed</option>
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
                <th>Batch</th>
                <th>Course Type</th>
                <th>Max Seats</th>
                <th>Occupied</th>
                <th>Available</th>
                <th>Occupancy</th>
                <th>Students</th>
                <th>Admissions</th>
                <th>Course Fees</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan="12">Loading batch report...</td></tr>
              ) : !batches.length ? (
                <tr><td colSpan="12">No batch records found.</td></tr>
              ) : (
                batches.map((item, index) => {
                  const batch = item.batch || {};
                  const course = batch.course_id || {};

                  return (
                    <tr key={batch._id || index}>
                      <td className="batch-name-cell">
                        <strong>{batch.batch_name || "-"}</strong>
                        <span>{course.courseTitle || "-"}</span>
                      </td>

                      <td>
                        <span className="course-type">
                          {course.courseType || "-"}
                        </span>
                      </td>

                      <td>{Number(item.maxSeats || 0)}</td>
                      <td>{Number(item.occupiedSeats || 0)}</td>
                      <td>{Number(item.availableSeats || 0)}</td>

                      <td>
                        <div className="occupancy-cell">
                          <div className="occupancy-bar">
                            <span
                              style={{
                                width: `${Math.min(
                                  100,
                                  Number(item.occupancyPercentage || 0)
                                )}%`,
                              }}
                            />
                          </div>
                          <small>{Number(item.occupancyPercentage || 0)}%</small>
                        </div>
                      </td>

                      <td>{Number(item.totalStudents || 0)}</td>
                      <td>{Number(item.totalAdmissions || 0)}</td>
                      <td><span className="tag-purple">{formatCurrency(item.totalCourseFees)}</span></td>
                      <td><span className="tag-success">{formatCurrency(item.totalPaidAmount)}</span></td>
                      <td><span className="tag-danger">{formatCurrency(item.totalRemainingAmount)}</span></td>

                      <td>
                        <span className={`batch-status-badge ${String(batch.status || "").toLowerCase()}`}>
                          {batch.status || "-"}
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
          itemCount={batches.length}
          itemLabel="batches"
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

export default BatchReports;
