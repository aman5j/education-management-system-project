import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getFeeReport,
  getFeeReportFilters,
} from "../../../services/feeReportService";

import notification from "../../../utils/notification";
import Pagination from "../../../components/common/Pagination";
import { fetchAllReportPages } from "../../../utils/fetchAllReportPages";

import "../../../styles/FeeReports.css";

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const INITIAL_FILTERS = {
  date_from: "",
  date_to: "",
  course_id: "",
  batch_id: "",
  status: "",
};

const INITIAL_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
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

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN");
};

const FeeReports = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [filterData, setFilterData] = useState({
    courses: [],
    batches: [],
  });

  const [report, setReport] = useState({
    summary: {},
    fees: [],
    pagination: INITIAL_PAGINATION,
  });

  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const availableBatches = useMemo(() => {
    if (!filters.course_id) {
      return filterData.batches;
    }

    return filterData.batches.filter((batch) => {
      const batchCourseId =
        batch?.course_id?._id || batch?.course_id;

      return String(batchCourseId) === String(filters.course_id);
    });
  }, [filters.course_id, filterData.batches]);

  const loadFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);

      const response = await getFeeReportFilters();
      const data = getResponseData(response);

      setFilterData({
        courses: Array.isArray(data.courses)
          ? data.courses
          : [],
        batches: Array.isArray(data.batches)
          ? data.batches
          : [],
      });
    } catch (error) {
      console.error("Fee report filters error:", error);

      notification.error(
        error?.response?.data?.message ||
          "Unable to load fee report filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async (
      currentFilters = filters,
      page = 1,
      limit = report.pagination.limit || 10
    ) => {
      try {
        setLoading(true);

        const params = {
          page,
          limit,
        };

        Object.entries(currentFilters).forEach(([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            String(value).trim()
          ) {
            params[key] = String(value).trim();
          }
        });

        const response = await getFeeReport(params);
        const data = getResponseData(response);

        setReport({
          summary: data.summary || {},
          fees: Array.isArray(data.fees) ? data.fees : [],
          pagination: data.pagination || {
            ...INITIAL_PAGINATION,
            limit,
          },
        });
      } catch (error) {
        console.error("Fee report error:", error);

        notification.error(
          error?.response?.data?.message ||
            "Unable to load fee report."
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, report.pagination.limit]
  );

  useEffect(() => {
    loadFilters();
    loadReport(INITIAL_FILTERS, 1, 10);

    // Initial data load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (name === "course_id") {
        next.batch_id = "";
      }

      return next;
    });
  };

  const handleApply = () => {
    if (
      filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
    ) {
      notification.warning(
        "Date From cannot be later than Date To."
      );
      return;
    }

    loadReport(filters, 1, report.pagination.limit || 10);
  };

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    loadReport(INITIAL_FILTERS, 1, report.pagination.limit || 10);
  };

  const handleRefresh = async () => {
    await Promise.all([
      loadFilters(),
      loadReport(filters, report.pagination.page || 1, report.pagination.limit || 10),
    ]);
  };

  const getExportData = async () =>
    fetchAllReportPages({
      fetchPage: getFeeReport,
      filters,
      recordsKey: "fees",
    });

  const buildExcelRows = (fees) =>
    fees.map((item, index) => ({
      "S.No": index + 1,
      Student: item.student?.name || "-",
      "Roll Number": item.student?.rollNo || "-",
      Course: item.course?.title || "-",
      "Course Type": item.course?.type || "-",
      Batch: item.batch?.name || "-",
      "Admission Date": formatDate(item.admission_date),
      "Course Fee": Number(item.course_fee || 0),
      Discount: Number(item.discount || 0),
      GST: Number(item.gst || 0),
      "Admission Fee": Number(item.admission_fee || 0),
      "Final Fee": Number(item.final_amount || 0),
      Paid: Number(item.paid_amount || 0),
      Pending: Number(item.remaining_amount || 0),
      "Payment Status": item.payment_status || "-",
      "Admission Status": item.admission_status || "-",
    }));

  const buildSummaryRows = (summary) => [
    ["Total Students", summary.totalStudents],
    ["Total Admissions", summary.totalAdmissions],
    ["Total Course Fees", summary.totalCourseFees],
    ["Total Discount", summary.totalDiscount],
    ["Total GST", summary.totalGst],
    ["Total Admission Fees", summary.totalAdmissionFees],
    ["Total Final Fees", summary.totalFinalFees],
    ["Total Paid", summary.totalPaid],
    ["Total Pending", summary.totalPending],
    ["Fully Paid", summary.fullyPaid],
    ["Partially Paid", summary.partiallyPaid],
    ["Unpaid", summary.unpaid],
  ].map(([label, value]) => ({
    "Report Item": label,
    Value: Number(value || 0),
  }));

  const exportExcel = async () => {
    if (exporting || loading) return;

    try {
      setExporting(true);

      const { rows, summary } = await getExportData();

      if (!rows.length) {
        notification.info("There are no fee records to export.");
        return;
      }

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(buildExcelRows(rows)),
        "Fee Report"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(buildSummaryRows(summary)),
        "Summary"
      );

      XLSX.writeFile(
        workbook,
        `fee-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      notification.success(
        `Excel exported successfully (${rows.length} records).`
      );
    } catch (error) {
      console.error("Fee Excel export error:", error);

      notification.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to export fee report."
      );
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    if (exporting || loading) return;

    try {
      setExporting(true);

      const { rows, summary } = await getExportData();

      if (!rows.length) {
        notification.info("There are no fee records to export.");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(18);
      doc.text("Fee Report", 12, 15);

      doc.setFontSize(8);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        12,
        22
      );

      doc.text(
        `Students: ${summary.totalStudents || 0}`,
        12,
        28
      );

      doc.text(
        `Admissions: ${summary.totalAdmissions || 0}`,
        55,
        28
      );

      doc.text(
        `Final Fees: ${formatPdfCurrency(summary.totalFinalFees)}`,
        105,
        28
      );

      doc.text(
        `Paid: ${formatPdfCurrency(summary.totalPaid)}`,
        165,
        28
      );

      doc.text(
        `Pending: ${formatPdfCurrency(summary.totalPending)}`,
        215,
        28
      );

      autoTable(doc, {
        startY: 34,
        head: [[
          "S.No",
          "Student",
          "Roll No",
          "Course",
          "Batch",
          "Admission Date",
          "Course Fee",
          "Discount",
          "GST",
          "Admission Fee",
          "Final Fee",
          "Paid",
          "Pending",
          "Payment",
          "Status",
        ]],
        body: rows.map((item, index) => [
          index + 1,
          item.student?.name || "-",
          item.student?.rollNo || "-",
          item.course?.title || "-",
          item.batch?.name || "-",
          formatDate(item.admission_date),
          formatPdfCurrency(item.course_fee),
          formatPdfCurrency(item.discount),
          formatPdfCurrency(item.gst),
          formatPdfCurrency(item.admission_fee),
          formatPdfCurrency(item.final_amount),
          formatPdfCurrency(item.paid_amount),
          formatPdfCurrency(item.remaining_amount),
          item.payment_status || "-",
          item.admission_status || "-",
        ]),
        styles: {
          fontSize: 5.8,
          cellPadding: 1.5,
        },
        headStyles: {
          fontSize: 5.8,
        },
        margin: {
          left: 7,
          right: 7,
        },
        showHead: "everyPage",
      });

      doc.save(
        `fee-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );

      notification.success(
        `PDF exported successfully (${rows.length} records).`
      );
    } catch (error) {
      console.error("Fee PDF export error:", error);

      notification.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to export fee report."
      );
    } finally {
      setExporting(false);
    }
  };

  const summary = report.summary || {};
  const fees = report.fees || [];
  const pagination = report.pagination || INITIAL_PAGINATION;

  return (
    <div className="fee-reports-page">
      <div className="fee-reports-header">
        <div>
          <h1>Fee Reports</h1>
          <p>
            Analyze total fees, paid fees, pending fees and collections.
          </p>
        </div>

        <div className="fee-report-actions">
          <button
            type="button"
            className="fee-report-btn secondary"
            onClick={handleRefresh}
            disabled={loading || filtersLoading || exporting}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="fee-report-btn excel"
            onClick={exportExcel}
            disabled={
              exporting ||
              loading ||
              !pagination.total
            }
          >
            <FiDownload />
            {exporting ? "Preparing..." : "Excel"}
          </button>

          <button
            type="button"
            className="fee-report-btn pdf"
            onClick={exportPDF}
            disabled={
              exporting ||
              loading ||
              !pagination.total
            }
          >
            <FiFileText />
            {exporting ? "Preparing..." : "PDF"}
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="fee-report-summary">
        <div className="fee-summary-card">
          <span>Total Students</span>
          <strong>{summary.totalStudents || 0}</strong>
        </div>

        <div className="fee-summary-card">
          <span>Total Admissions</span>
          <strong>{summary.totalAdmissions || 0}</strong>
        </div>

        <div className="fee-summary-card">
          <span>Total Final Fees</span>
          <strong>{formatCurrency(summary.totalFinalFees)}</strong>
        </div>

        <div className="fee-summary-card">
          <span>Total Paid</span>
          <strong>{formatCurrency(summary.totalPaid)}</strong>
        </div>

        <div className="fee-summary-card">
          <span>Total Pending</span>
          <strong>{formatCurrency(summary.totalPending)}</strong>
        </div>

        <div className="fee-summary-card">
          <span>Discount</span>
          <strong>{formatCurrency(summary.totalDiscount)}</strong>
        </div>

        <div className="fee-summary-card">
          <span>GST</span>
          <strong>{formatCurrency(summary.totalGst)}</strong>
        </div>

        <div className="fee-summary-card">
          <span>Admission Fees</span>
          <strong>{formatCurrency(summary.totalAdmissionFees)}</strong>
        </div>
      </div>

      {/* FILTERS */}

      <div className="fee-report-filters">
        <div className="fee-filter-field">
          <label htmlFor="fee-date-from">Date From</label>
          <input
            id="fee-date-from"
            type="date"
            name="date_from"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="fee-filter-field">
          <label htmlFor="fee-date-to">Date To</label>
          <input
            id="fee-date-to"
            type="date"
            name="date_to"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="fee-filter-field">
          <label htmlFor="fee-course">Course</label>
          <select
            id="fee-course"
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

        <div className="fee-filter-field">
          <label htmlFor="fee-batch">Batch</label>
          <select
            id="fee-batch"
            name="batch_id"
            value={filters.batch_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">All Batches</option>

            {availableBatches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.batch_name}
              </option>
            ))}
          </select>
        </div>

        <div className="fee-filter-field">
          <label htmlFor="fee-admission-status">
            Admission Status
          </label>
          <select
            id="fee-admission-status"
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

        <div className="fee-filter-actions">
          <button
            type="button"
            className="fee-report-btn primary"
            onClick={handleApply}
            disabled={loading}
          >
            Apply
          </button>

          <button
            type="button"
            className="fee-report-btn secondary"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {/* TABLE */}

      <div className="fee-report-table-wrapper">
        <table className="fee-report-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Student</th>
              <th>Roll No</th>
              <th>Course</th>
              <th>Batch</th>
              <th>Admission Date</th>
              <th>Course Fee</th>
              <th>Discount</th>
              <th>GST</th>
              <th>Admission Fee</th>
              <th>Final Fee</th>
              <th>Paid</th>
              <th>Pending</th>
              <th>Payment Status</th>
              <th>Admission Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="15">Loading fee report...</td>
              </tr>
            ) : !fees.length ? (
              <tr>
                <td colSpan="15">No fee records found.</td>
              </tr>
            ) : (
              fees.map((item, index) => (
                <tr key={item._id || index}>
                  <td>
                    {(pagination.page - 1) * pagination.limit +
                      index +
                      1}
                  </td>

                  <td>
                    <strong>{item.student?.name || "-"}</strong>
                  </td>

                  <td>{item.student?.rollNo || "-"}</td>
                  <td>{item.course?.title || "-"}</td>
                  <td>{item.batch?.name || "-"}</td>
                  <td>{formatDate(item.admission_date)}</td>
                  <td>{formatCurrency(item.course_fee)}</td>
                  <td>{formatCurrency(item.discount)}</td>
                  <td>{formatCurrency(item.gst)}</td>
                  <td>{formatCurrency(item.admission_fee)}</td>
                  <td>{formatCurrency(item.final_amount)}</td>
                  <td>{formatCurrency(item.paid_amount)}</td>
                  <td>{formatCurrency(item.remaining_amount)}</td>

                  <td>
                    <span
                      className={`fee-status ${String(
                        item.payment_status || ""
                      ).toLowerCase()}`}
                    >
                      {item.payment_status || "-"}
                    </span>
                  </td>

                  <td>{item.admission_status || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={pagination.page || 1}
        totalPages={pagination.totalPages || 0}
        total={pagination.total || 0}
        itemCount={fees.length}
        itemLabel="fee records"
        limit={pagination.limit || 10}
        loading={loading}
        onPageChange={(nextPage) =>
          loadReport(
            filters,
            nextPage,
            pagination.limit || 10
          )
        }
        onLimitChange={(nextLimit) =>
          loadReport(filters, 1, nextLimit)
        }
      />
    </div>
  );
};

export default FeeReports;