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
  getPaymentReport,
  getPaymentReportFilters,
} from "../../../services/paymentReportService";

import notification from "../../../utils/notification";
import Pagination from "../../../components/common/Pagination";
import { fetchAllReportPages } from "../../../utils/fetchAllReportPages";

import "../../../styles/PaymentReports.css";

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const INITIAL_FILTERS = {
  date_from: "",
  date_to: "",
  course_id: "",
  batch_id: "",
  student_id: "",
  status: "",
  payment_mode: "",
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

const getStudentName = (student) => {
  if (!student) return "-";

  if (student.name) return student.name;

  return (
    [student.firstName, student.surname]
      .filter(Boolean)
      .join(" ")
      .trim() || "-"
  );
};

const getCourseName = (payment) =>
  payment?.course ||
  payment?.admission?.course?.courseTitle ||
  payment?.admission?.course_title ||
  payment?.admission?.courseType ||
  "-";

const getBatchName = (payment) =>
  payment?.batch ||
  payment?.admission?.batch?.batch_name ||
  payment?.admission?.batch_name ||
  "-";

const getReceiptNumber = (payment) =>
  payment?.receipt_no || payment?.receiptNo || "-";

const getPaymentAmount = (payment) =>
  Number(payment?.amount || 0);

const getPaymentMode = (payment) =>
  payment?.payment_mode || payment?.paymentMode || "-";

const getPaymentStatus = (payment) =>
  payment?.status || "-";

const PaymentReports = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [filterData, setFilterData] = useState({
    courses: [],
    batches: [],
    students: [],
  });

  const [report, setReport] = useState({
    summary: {},
    paymentModeSummary: [],
    transactions: [],
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
        batch?.course_id?._id ||
        batch?.course_id ||
        batch?.course?._id;

      return String(batchCourseId) === String(filters.course_id);
    });
  }, [filters.course_id, filterData.batches]);

  const loadReportFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);

      const response = await getPaymentReportFilters();
      const data = getResponseData(response);

      setFilterData({
        courses: Array.isArray(data.courses)
          ? data.courses
          : [],
        batches: Array.isArray(data.batches)
          ? data.batches
          : [],
        students: Array.isArray(data.students)
          ? data.students
          : [],
      });
    } catch (error) {
      console.error("Payment report filters error:", error);

      notification.error(
        error?.response?.data?.message ||
          "Unable to load report filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async (
      currentFilters = appliedFilters,
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

        const response = await getPaymentReport(params);
        const data = getResponseData(response);

        setAppliedFilters({ ...currentFilters });

        setReport({
          summary: data.summary || {},
          paymentModeSummary: Array.isArray(data.paymentModeSummary)
            ? data.paymentModeSummary
            : [],
          transactions: Array.isArray(data.transactions)
            ? data.transactions
            : [],
          pagination: data.pagination || {
            ...INITIAL_PAGINATION,
            limit,
          },
        });
      } catch (error) {
        console.error("Payment report error:", error);

        notification.error(
          error?.response?.data?.message ||
            "Unable to load payment report."
        );
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, report.pagination.limit]
  );

  useEffect(() => {
    loadReportFilters();
    loadReport(INITIAL_FILTERS, 1, 10);

    // Initial report load only.
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
        "From Date cannot be later than To Date."
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
      loadReport(
        appliedFilters,
        report.pagination.page || 1,
        report.pagination.limit || 10
      ),
      loadReportFilters(),
    ]);
  };

  const getAppliedFilters = (filterValues = appliedFilters) => {
    const applied = [];

    if (filterValues.date_from) {
      applied.push(`From: ${filterValues.date_from}`);
    }

    if (filterValues.date_to) {
      applied.push(`To: ${filterValues.date_to}`);
    }

    const selectedCourse = filterData.courses.find(
      (course) =>
        String(course?._id) === String(filterValues.course_id)
    );

    const selectedBatch = filterData.batches.find(
      (batch) =>
        String(batch?._id) === String(filterValues.batch_id)
    );

    const selectedStudent = filterData.students.find(
      (student) =>
        String(student?._id) === String(filterValues.student_id)
    );

    if (selectedCourse) {
      applied.push(
        `Course: ${selectedCourse.courseTitle || "-"}`
      );
    }

    if (selectedBatch) {
      applied.push(
        `Batch: ${selectedBatch.batch_name || "-"}`
      );
    }

    if (selectedStudent) {
      applied.push(
        `Student: ${getStudentName(selectedStudent)}`
      );
    }

    if (filterValues.status) {
      applied.push(`Status: ${filterValues.status}`);
    }

    if (filterValues.payment_mode) {
      applied.push(`Mode: ${filterValues.payment_mode}`);
    }

    return applied;
  };

  const getExportData = async () =>
    fetchAllReportPages({
      fetchPage: getPaymentReport,
      filters: appliedFilters,
      recordsKey: "transactions",
    });

  const getPaymentModeRows = (paymentModeSummary) => {
    if (Array.isArray(paymentModeSummary) && paymentModeSummary.length) {
      return paymentModeSummary;
    }

    return [
      { mode: "Cash", amount: 0 },
      { mode: "UPI", amount: 0 },
      { mode: "Card", amount: 0 },
      { mode: "Bank Transfer", amount: 0 },
    ];
  };

  const exportExcel = async () => {
    if (exporting || loading) return;

    try {
      setExporting(true);

      // const { rows, summary, paymentModeSummary } =
      //   await getExportData();

      const { rows, summary } = await getExportData();

      const paymentModeTotals = {
        Cash: 0,
        UPI: 0,
        Card: 0,
        "Bank Transfer": 0,
      };

      rows.forEach((payment) => {
        if (getPaymentStatus(payment) !== "Verified") return;

        const mode = getPaymentMode(payment);

        if (Object.prototype.hasOwnProperty.call(paymentModeTotals, mode)) {
          paymentModeTotals[mode] += getPaymentAmount(payment);
        }
      });

      const paymentModeSummary = Object.entries(paymentModeTotals).map(
        ([mode, amount]) => ({
          mode,
          amount: Number(amount.toFixed(2)),
        })
      );

      if (!rows.length) {
        notification.info(
          "No payment records available for Excel export."
        );
        return;
      }

      const workbook = XLSX.utils.book_new();
      const applied = getAppliedFilters();

      const modeRows = getPaymentModeRows(paymentModeSummary);

      const reportInfo = [
        ["IT Learning Institute"],
        ["Payment Report"],
        [],
        ["Generated", new Date().toLocaleString("en-IN")],
        [
          "Applied Filters",
          applied.length ? applied.join(" | ") : "All Payments",
        ],
        [],
        ["REPORT SUMMARY"],
        ["Total Students", Number(summary.totalStudents || 0)],
        ["Total Transactions", Number(summary.totalTransactions || 0)],
        ["Total Fees Collected", Number(summary.totalFeesCollected || 0)],
        ["Pending Payments", Number(summary.pendingPayments || 0)],
        ["Overdue Payments", Number(summary.overduePayments || 0)],
        ["Failed Payments", Number(summary.failedPayments || 0)],
        [],
        ["PAYMENT MODE SUMMARY"],
        ...modeRows.map((item) => [
          item.mode,
          Number(item.amount || 0),
        ]),
        [],
        ["PAYMENT TRANSACTIONS"],
        [
          "Receipt No",
          "Student Name",
          "Roll No",
          "Course",
          "Batch",
          "Payment Date",
          "Payment Mode",
          "Amount",
          "Status",
          "Notes",
        ],
        ...rows.map((payment) => [
          getReceiptNumber(payment),
          getStudentName(payment?.student),
          payment?.student?.rollNo || "-",
          getCourseName(payment),
          getBatchName(payment),
          formatDate(payment?.payment_date),
          getPaymentMode(payment),
          getPaymentAmount(payment),
          getPaymentStatus(payment),
          payment?.notes || "",
        ]),
      ];

      const reportSheet = XLSX.utils.aoa_to_sheet(reportInfo);

      reportSheet["!cols"] = [
        { wch: 28 },
        { wch: 28 },
        { wch: 18 },
        { wch: 32 },
        { wch: 25 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 15 },
        { wch: 35 },
      ];

      const transactionHeaderRow = reportInfo.findIndex(
        (row) =>
          row.length === 10 &&
          row[0] === "Receipt No"
      );

      if (transactionHeaderRow >= 0) {
        reportSheet["!freeze"] = {
          xSplit: 0,
          ySplit: transactionHeaderRow + 1,
        };

        reportSheet["!autofilter"] = {
          ref: `A${transactionHeaderRow + 1}:J${reportInfo.length}`,
        };
      }

      const summaryRows = [
        ["Metric", "Value"],
        ["Total Students", Number(summary.totalStudents || 0)],
        ["Total Transactions", Number(summary.totalTransactions || 0)],
        ["Total Fees Collected", Number(summary.totalFeesCollected || 0)],
        ["Pending Payments", Number(summary.pendingPayments || 0)],
        ["Overdue Payments", Number(summary.overduePayments || 0)],
        ["Failed Payments", Number(summary.failedPayments || 0)],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      summarySheet["!cols"] = [
        { wch: 28 },
        { wch: 20 },
      ];

      const paymentRows = [
        [
          "Receipt No",
          "Student Name",
          "Roll No",
          "Course",
          "Batch",
          "Payment Date",
          "Payment Mode",
          "Amount",
          "Status",
          "Notes",
        ],
        ...rows.map((payment) => [
          getReceiptNumber(payment),
          getStudentName(payment?.student),
          payment?.student?.rollNo || "-",
          getCourseName(payment),
          getBatchName(payment),
          formatDate(payment?.payment_date),
          getPaymentMode(payment),
          getPaymentAmount(payment),
          getPaymentStatus(payment),
          payment?.notes || "",
        ]),
      ];

      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentRows);

      paymentSheet["!cols"] = [
        { wch: 26 },
        { wch: 24 },
        { wch: 20 },
        { wch: 32 },
        { wch: 24 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 15 },
        { wch: 35 },
      ];

      paymentSheet["!freeze"] = {
        xSplit: 0,
        ySplit: 1,
      };

      paymentSheet["!autofilter"] = {
        ref: `A1:J${paymentRows.length}`,
      };

      XLSX.utils.book_append_sheet(
        workbook,
        reportSheet,
        "Payment Report"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Summary"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        paymentSheet,
        "Payments"
      );

      XLSX.writeFile(
        workbook,
        `payment-report-${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      notification.success(
        `Excel exported successfully (${rows.length} transactions).`
      );
    } catch (error) {
      console.error("Payment Excel export error:", error);

      notification.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to export payment report."
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
        notification.info(
          "No payment records available for PDF export."
        );
        return;
      }

      const doc = new jsPDF("landscape", "mm", "a4");

      doc.setFontSize(18);
      doc.text("IT Learning Institute", 14, 15);

      doc.setFontSize(14);
      doc.text("Payment Report", 14, 23);

      doc.setFontSize(9);

      let currentY = 31;
      const applied = getAppliedFilters();

      if (applied.length) {
        doc.text(
          `Filters: ${applied.join(" | ")}`,
          14,
          currentY
        );
        currentY += 7;
      }

      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        14,
        currentY
      );

      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [[
          "Receipt",
          "Student",
          "Roll No",
          "Course",
          "Batch",
          "Date",
          "Mode",
          "Amount",
          "Status",
        ]],
        body: rows.map((payment) => [
          getReceiptNumber(payment),
          getStudentName(payment?.student),
          payment?.student?.rollNo || "-",
          getCourseName(payment),
          getBatchName(payment),
          formatDate(payment?.payment_date),
          getPaymentMode(payment),
          formatPdfCurrency(getPaymentAmount(payment)),
          getPaymentStatus(payment),
        ]),
        styles: {
          fontSize: 7,
          cellPadding: 2,
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

      const finalY = doc.lastAutoTable?.finalY
        ? doc.lastAutoTable.finalY + 10
        : currentY + 10;

      // Keep the summary on a new page if the table leaves insufficient space.
      const summaryY =
        finalY > 175 ? 20 : finalY;

      if (finalY > 175) {
        doc.addPage();
      }

      doc.setFontSize(10);

      doc.text(
        `Total Students: ${Number(summary.totalStudents || 0)}`,
        14,
        summaryY
      );

      doc.text(
        `Total Transactions: ${Number(summary.totalTransactions || 0)}`,
        80,
        summaryY
      );

      doc.text(
        `Fees Collected: ${formatPdfCurrency(
          summary.totalFeesCollected
        )}`,
        170,
        summaryY
      );

      doc.text(
        `Pending: ${formatPdfCurrency(summary.pendingPayments)}`,
        240,
        summaryY
      );

      doc.save(
        `payment-report-${new Date().toISOString().slice(0, 10)}.pdf`
      );

      notification.success(
        `PDF exported successfully (${rows.length} transactions).`
      );
    } catch (error) {
      console.error("Payment PDF export error:", error);

      notification.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to export payment report."
      );
    } finally {
      setExporting(false);
    }
  };

  const summary = report.summary || {};
  const transactions = report.transactions || [];
  const pagination = report.pagination || INITIAL_PAGINATION;

  return (
    <div className="payment-reports-page">
      <div className="payment-reports-header">
        <div>
          <h1>Payment Reports</h1>
          <p>
            View, filter and export payment collection reports.
          </p>
        </div>

        <div className="payment-report-actions">
          <button
            type="button"
            className="report-btn secondary"
            onClick={handleRefresh}
            disabled={loading || filtersLoading || exporting}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="report-btn excel"
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
            className="report-btn pdf"
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

      {/* FILTERS */}

      <div className="payment-report-filters">
        <div className="filter-field">
          <label htmlFor="payment-date-from">From Date</label>
          <input
            id="payment-date-from"
            type="date"
            name="date_from"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="payment-date-to">To Date</label>
          <input
            id="payment-date-to"
            type="date"
            name="date_to"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="payment-course">Course</label>
          <select
            id="payment-course"
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

        <div className="filter-field">
          <label htmlFor="payment-batch">Batch</label>
          <select
            id="payment-batch"
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

        <div className="filter-field">
          <label htmlFor="payment-student">Student</label>
          <select
            id="payment-student"
            name="student_id"
            value={filters.student_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">All Students</option>

            {filterData.students.map((student) => (
              <option key={student._id} value={student._id}>
                {student.rollNo ? `${student.rollNo} - ` : ""}
                {getStudentName(student)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="payment-status">Status</label>
          <select
            id="payment-status"
            name="status"
            value={filters.status}
            onChange={handleChange}
          >
            <option value="">All Status</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="payment-mode">Payment Mode</label>
          <select
            id="payment-mode"
            name="payment_mode"
            value={filters.payment_mode}
            onChange={handleChange}
          >
            <option value="">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>

        <div className="report-filter-buttons">
          <button
            type="button"
            className="report-btn primary"
            onClick={handleApply}
            disabled={loading}
          >
            Apply Filters
          </button>

          <button
            type="button"
            className="report-btn secondary"
            onClick={handleReset}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="payment-report-summary">
        <div className="report-summary-card">
          <span>Total Students</span>
          <strong>{Number(summary.totalStudents || 0)}</strong>
        </div>

        <div className="report-summary-card">
          <span>Total Transactions</span>
          <strong>{Number(summary.totalTransactions || 0)}</strong>
        </div>

        <div className="report-summary-card">
          <span>Fees Collected</span>
          <strong>{formatCurrency(summary.totalFeesCollected)}</strong>
        </div>

        <div className="report-summary-card">
          <span>Pending Payments</span>
          <strong>{formatCurrency(summary.pendingPayments)}</strong>
        </div>

        <div className="report-summary-card">
          <span>Overdue Payments</span>
          <strong>{formatCurrency(summary.overduePayments)}</strong>
        </div>

        <div className="report-summary-card">
          <span>Failed Payments</span>
          <strong>{formatCurrency(summary.failedPayments)}</strong>
        </div>
      </div>

      {/* TRANSACTIONS */}

      <div className="payment-report-table-card">
        <div className="report-table-header">
          <div>
            <h2>Payment Transactions</h2>
            <span>
              Showing {transactions.length} of {pagination.total || 0} transactions
            </span>
          </div>
        </div>

        {loading ? (
          <div className="report-empty-state">
            Loading payment report...
          </div>
        ) : transactions.length === 0 ? (
          <div className="report-empty-state">
            No payment records found for the selected filters.
          </div>
        ) : (
          <div className="report-table-wrapper">
            <table className="payment-report-table">
              <thead>
                <tr>
                  <th>Receipt No</th>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Payment Date</th>
                  <th>Mode</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map((payment) => (
                  <tr key={payment._id}>
                    <td>
                      <strong>{getReceiptNumber(payment)}</strong>
                    </td>

                    <td>{getStudentName(payment?.student)}</td>
                    <td>{payment?.student?.rollNo || "-"}</td>
                    <td>{getCourseName(payment)}</td>
                    <td>{getBatchName(payment)}</td>
                    <td>{formatDate(payment?.payment_date)}</td>
                    <td>{getPaymentMode(payment)}</td>

                    <td>
                      <strong>
                        {formatCurrency(getPaymentAmount(payment))}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`payment-status ${String(
                          getPaymentStatus(payment)
                        ).toLowerCase()}`}
                      >
                        {getPaymentStatus(payment)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={pagination.page || 1}
          totalPages={pagination.totalPages || 0}
          total={pagination.total || 0}
          itemCount={transactions.length}
          itemLabel="transactions"
          limit={pagination.limit || 10}
          loading={loading}
          onPageChange={(nextPage) =>
            loadReport(
              appliedFilters,
              nextPage,
              pagination.limit || 10
            )
          }
          onLimitChange={(nextLimit) =>
            loadReport(appliedFilters, 1, nextLimit)
          }
        />
      </div>
    </div>
  );
};

export default PaymentReports;