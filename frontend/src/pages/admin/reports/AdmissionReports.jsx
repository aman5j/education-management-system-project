import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FiRefreshCw,
} from "react-icons/fi";
import { IoIosCall } from "react-icons/io";
import { MdOutgoingMail, MdDateRange, MdCurrencyRupee } from "react-icons/md";
import { FaFilePdf, FaUserFriends } from "react-icons/fa";
import { RiFileExcel2Line } from "react-icons/ri";
import { fetchAllReportPages } from "../../../utils/fetchAllReportPages";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getAdmissionReport,
  getAdmissionReportFilters,
} from "../../../services/admissionReportService";

import { getAssetUrl } from "../../../utils/assetUrl";
import Pagination from "../../../components/common/Pagination";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/AdmissionReports.css";

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

const getInitials = (name) =>
  String(name || "Student")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "S";

const AdmissionReports = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [exporting, setExporting] = useState(false);

  const [filterData, setFilterData] = useState({
    courses: [],
    batches: [],
  });

  const [report, setReport] = useState({
    summary: {},
    admissions: [],
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

      const response = await getAdmissionReportFilters();
      const data = getResponseData(response);

      setFilterData({
        courses: Array.isArray(data.courses) ? data.courses : [],
        batches: Array.isArray(data.batches) ? data.batches : [],
      });
    } catch (error) {
      console.error("Admission report filters error:", error);
      notification.error(getApiErrorMessage(error));
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async ({
      currentFilters = EMPTY_FILTERS,
      currentPage = 1,
      currentLimit = 10,
    } = {}) => {
      const currentRequestId = ++requestId.current;

      try {
        setLoading(true);

        const params = {
          ...currentFilters,
          page: currentPage,
          limit: currentLimit,
        };

        const response = await getAdmissionReport(params);
        const data = getResponseData(response);

        if (currentRequestId !== requestId.current) return;

        setReport({
          summary: data.summary || {},
          admissions: Array.isArray(data.admissions)
            ? data.admissions
            : [],
          pagination: data.pagination || {
            ...DEFAULT_PAGINATION,
            page: currentPage,
            limit: currentLimit,
          },
        });
      } catch (error) {
        if (currentRequestId !== requestId.current) return;

        console.error("Admission report error:", error);

        setReport({
          summary: {},
          admissions: [],
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
    if (initialLoadStarted.current) return;

    initialLoadStarted.current = true;
    void loadFilters();
    void loadReport();
  }, [loadFilters, loadReport]);

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

    void loadReport({
      currentFilters: filters,
      currentPage: 1,
      currentLimit: limit,
    });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);

    void loadReport({
      currentFilters: EMPTY_FILTERS,
      currentPage: 1,
      currentLimit: limit,
    });
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);

    void loadReport({
      currentFilters: filters,
      currentPage: nextPage,
      currentLimit: limit,
    });
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);

    void loadReport({
      currentFilters: filters,
      currentPage: 1,
      currentLimit: nextLimit,
    });
  };

  const summary = report.summary || {};
  const admissions = report.admissions || [];
  const pagination = report.pagination || DEFAULT_PAGINATION;


const getAllAdmissionsForExport = async () => {
  return fetchAllReportPages({
    fetchPage: getAdmissionReport,
    filters: {
      ...filters,
    },
    recordsKey: "admissions",
  });
};

const exportExcel = async () => {
  if (exporting || loading) return;

  setExporting(true);

  try {
    notification.info("Preparing complete admission report...");

    const { rows: allAdmissions, summary: exportSummary, total } =
      await getAllAdmissionsForExport();

    if (!allAdmissions.length) {
      notification.warning("No admission records available to export.");
      return;
    }

    const rows = allAdmissions.map((admission, index) => ({
      "S.No": index + 1,
      "Student Name": admission.student?.name || "-",
      "Roll No": admission.student?.rollNo || "-",
      Mobile: admission.student?.mobile || "-",
      Email: admission.student?.email || "-",
      Course: admission.course?.courseTitle || "-",
      Batch: admission.batch?.batch_name || "-",
      "Course Fee": Number(admission.courseFee || 0),
      "Discount Type": admission.discountType || "-",
      "Discount Value": Number(admission.discountValue || 0),
      "GST Amount": Number(admission.gstAmount || 0),
      "Final Amount": Number(admission.finalAmount || 0),
      "Admission Fee": Number(admission.admissionFee || 0),
      Paid: Number(admission.paidAmount || 0),
      Remaining: Number(admission.remainingAmount || 0),
      "Admission Date": formatDate(admission.admissionDate),
      "Referral Source": admission.referralSource || "-",
      Status: admission.status || "-",
    }));

    const summaryRows = [
      {
        Metric: "Total Admissions",
        Value: Number(exportSummary.totalAdmissions || 0),
      },
      {
        Metric: "Active Admissions",
        Value: Number(exportSummary.activeAdmissions || 0),
      },
      {
        Metric: "Completed Admissions",
        Value: Number(exportSummary.completedAdmissions || 0),
      },
      {
        Metric: "Dropped Admissions",
        Value: Number(exportSummary.droppedAdmissions || 0),
      },
      {
        Metric: "Total Course Fees",
        Value: Number(exportSummary.totalCourseFees || 0),
      },
      {
        Metric: "Total Final Amount",
        Value: Number(exportSummary.totalFinalAmount || 0),
      },
      {
        Metric: "Total Admission Fees",
        Value: Number(exportSummary.totalAdmissionFees || 0),
      },
      {
        Metric: "Total Paid Amount",
        Value: Number(exportSummary.totalPaidAmount || 0),
      },
      {
        Metric: "Total Remaining Amount",
        Value: Number(exportSummary.totalRemainingAmount || 0),
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

    reportSheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    if (reportSheet["!ref"]) {
      reportSheet["!autofilter"] = {
        ref: reportSheet["!ref"],
      };
    }

    reportSheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 30 },
      { wch: 30 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
    ];

    summarySheet["!cols"] = [
      { wch: 34 },
      { wch: 25 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      "Admission Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `admission-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    notification.success(
      `Admission Excel exported successfully (${total} records).`
    );
  } catch (error) {
    console.error("Admission Excel export error:", error);
    notification.error(getApiErrorMessage(error));
  } finally {
    setExporting(false);
  }
};

const exportPDF = async () => {
  if (exporting || loading) return;

  setExporting(true);

  try {
    notification.info("Preparing complete admission PDF...");

    const { rows: allAdmissions, summary: exportSummary, total } =
      await getAllAdmissionsForExport();

    if (!allAdmissions.length) {
      notification.warning("No admission records available to export.");
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
    doc.text("Admission Report", 14, 23);

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
      appliedFilters.push(`Status: ${filters.status}`);
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
      `Total Admissions: ${Number(exportSummary.totalAdmissions || 0)}`,
      14,
      currentY
    );

    doc.text(
      `Active: ${Number(exportSummary.activeAdmissions || 0)}`,
      75,
      currentY
    );

    doc.text(
      `Completed: ${Number(exportSummary.completedAdmissions || 0)}`,
      125,
      currentY
    );

    doc.text(
      `Dropped: ${Number(exportSummary.droppedAdmissions || 0)}`,
      195,
      currentY
    );

    currentY += 8;

    autoTable(doc, {
      startY: currentY,
      head: [[
        "S.No",
        "Student",
        "Roll No",
        "Course",
        "Batch",
        "Admission Date",
        "Course Fee",
        "Final",
        "Paid",
        "Remaining",
        "Status",
      ]],
      body: allAdmissions.map((admission, index) => [
        index + 1,
        admission.student?.name || "-",
        admission.student?.rollNo || "-",
        admission.course?.courseTitle || "-",
        admission.batch?.batch_name || "-",
        formatDate(admission.admissionDate),
        formatPdfCurrency(admission.courseFee),
        formatPdfCurrency(admission.finalAmount),
        formatPdfCurrency(admission.paidAmount),
        formatPdfCurrency(admission.remainingAmount),
        admission.status || "-",
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

    const finalY = doc.lastAutoTable?.finalY || currentY + 10;

    // Put totals on a new page if there is not enough room.
    if (finalY > 175) {
      doc.addPage();
      currentY = 20;
    } else {
      currentY = finalY + 8;
    }

    doc.setFontSize(8);

    doc.text(
      `Total Records Exported: ${total}`,
      14,
      currentY
    );

    doc.text(
      `Total Final Amount: ${formatPdfCurrency(exportSummary.totalFinalAmount)}`,
      14,
      currentY + 7
    );

    doc.text(
      `Total Paid: ${formatPdfCurrency(exportSummary.totalPaidAmount)}`,
      90,
      currentY + 7
    );

    doc.text(
      `Total Remaining: ${formatPdfCurrency(exportSummary.totalRemainingAmount)}`,
      165,
      currentY + 7
    );

    doc.save(
      `admission-report-${new Date().toISOString().slice(0, 10)}.pdf`
    );

    notification.success(
      `Admission PDF exported successfully (${total} records).`
    );
  } catch (error) {
    console.error("Admission PDF export error:", error);
    notification.error(getApiErrorMessage(error));
  } finally {
    setExporting(false);
  }
};


  return (
    <div className="admission-reports-page">
      <div className="page-header">
        <div>
          <h1>Admission Reports</h1>
        </div>

        <div className="admission-report-actions">
          <button
            type="button"
            className="themebtn exceldownload"
            onClick={exportExcel}
            disabled={!admissions.length || loading || exporting}
          >
            <RiFileExcel2Line />
            {exporting ? "Preparing..." : "Excel"}
          </button>

          <button
            type="button"
            className="themebtn pdfdownload"
            onClick={exportPDF}
            disabled={!admissions.length || loading || exporting}
          >
            <FaFilePdf />
            {exporting ? "Preparing..." : "PDF"}
          </button>
        </div>
      </div>

      <div className="admission-report-summary">
        <div className="dashboard-stat-card card-success">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-success"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Total Admissions</span>
            <strong className="stat-card-value">
              {Number(summary.totalAdmissions || 0)}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-purple">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-purple"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Active Admissions</span>
            <strong className="stat-card-value">
              {Number(summary.activeAdmissions || 0)}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-danger">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-danger"><MdCurrencyRupee /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Remaining Fees</span>
            <strong className="stat-card-value">
              {formatCurrency(summary.totalRemainingAmount)}
            </strong>
          </div>
        </div>

        <div className="dashboard-stat-card card-success">
          <div className="stat-card-top">
            <div className="stat-icon stat-icon-success"><FaUserFriends /></div>
          </div>
          <div className="stat-card-body">
            <span className="stat-card-title">Completed</span>
            <strong className="stat-card-value">
              {Number(summary.completedAdmissions || 0)}
            </strong>
          </div>
        </div>
      </div>

      <div className="common-card-filters">
        <div className="input-search noicon">
          <label htmlFor="admission-report-date-from">From Date</label>
          <input
            id="admission-report-date-from"
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleChange}
          />
        </div>

        <div className="input-search noicon">
          <label htmlFor="admission-report-date-to">To Date</label>
          <input
            id="admission-report-date-to"
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleChange}
          />
        </div>

        <div className="input-search">
          <label htmlFor="admission-report-course">Course</label>
          <select
            id="admission-report-course"
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
          <label htmlFor="admission-report-batch">Batch</label>
          <select
            id="admission-report-batch"
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
          <label htmlFor="admission-report-status">Status</label>
          <select
            id="admission-report-status"
            name="status"
            value={filters.status}
            onChange={handleChange}
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Dropped">Dropped</option>
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
        {loading ? (
          <div className="admission-report-state">
            Loading admission report...
          </div>
        ) : admissions.length === 0 ? (
          <div className="admission-report-state">
            No admission records found.
          </div>
        ) : (
          <div className="common-table-wrapper">
            <table className="common-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Course / Batch</th>
                  <th>Contact</th>
                  <th>Admission Date</th>
                  <th>Final Amount</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {admissions.map((admission, index) => (
                  <tr key={admission._id}>
                    <td>
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>

                    <td>
                      <div className="admission-report-student">
                        <div className="student-name-cell">
                          <div className="student-avatar-wrapper">
                            {admission.student?.profileImage ? (
                              <img
                                alt={`${admission.student.name || "Student"} profile`}
                                className="student-avatar"
                                src={getAssetUrl(admission.student.profileImage)}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                  const fallback =
                                    event.currentTarget.parentElement?.querySelector(
                                      ".admission-report-avatar-fallback"
                                    );
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}

                            <div
                              className="student-avatar admission-report-avatar-fallback"
                              style={{
                                display: admission.student?.profileImage
                                  ? "none"
                                  : "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                background: "#eaf0ff",
                                color: "#2457c5",
                              }}
                            >
                              {getInitials(admission.student?.name)}
                            </div>
                          </div>

                          <div>
                            <strong>{admission.student?.name || "—"}</strong>

                            {admission.student?.fatherName && (
                              <small>{admission.student.fatherName}</small>
                            )}

                            {admission.student?.signature && (
                              <img
                                alt={`${admission.student?.name || "Student"} signature`}
                                className="student-signature"
                                src={getAssetUrl(admission.student.signature)}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="student-roll">
                        {admission.student?.rollNo || "-"}
                      </span>
                    </td>

                    <td>
                      {admission.course?.courseTitle || "-"}
                      <br />
                      <span className="batchtag">
                        {admission.batch?.batch_name || "-"}
                      </span>
                    </td>

                    <td>
                      <div className="contact-details">
                        <div className="contact-li">
                          <IoIosCall />
                          <span>{admission.student?.mobile || "-"}</span>
                        </div>
                        <div className="contact-li">
                          <MdOutgoingMail />
                          <span>{admission.student?.email || "-"}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="contact-details">
                        <div className="contact-li">
                          <MdDateRange />
                          <span>{formatDate(admission.admissionDate)}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong className="tag-purple">
                        {formatCurrency(admission.finalAmount)}
                      </strong>
                    </td>

                    <td>
                      <strong className="tag-success">
                        {formatCurrency(admission.paidAmount)}
                      </strong>
                    </td>

                    <td>
                      <strong className="tag-danger">
                        {formatCurrency(admission.remainingAmount)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`admission-report-status admission-report-status-${String(
                          admission.status || ""
                        ).toLowerCase()}`}
                      >
                        {admission.status || "-"}
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
          itemCount={admissions.length}
          itemLabel="admissions"
          limit={pagination.limit || limit}
          loading={loading}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>
    </div>
  );
};

export default AdmissionReports;