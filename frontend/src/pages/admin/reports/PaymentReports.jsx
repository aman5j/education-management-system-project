import { useEffect, useMemo, useState } from "react";
import { FiDownload, FiFileText, FiRefreshCw } from "react-icons/fi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getPaymentReport,
  getPaymentReportFilters,
} from "../../../services/paymentReportService";

import "../../../styles/PaymentReports.css";

const getResponseData = (response) => {
  return response?.data?.data ?? response?.data ?? {};
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatPdfCurrency = (value) => {
  const amount = Number(value || 0);

  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN");
};

const getStudentName = (student) => {
  if (!student) return "-";

  // Current Payment Report API response
  if (student.name) {
    return student.name;
  }

  // Fallback for populated Student object
  return (
    [student.firstName, student.surname]
      .filter(Boolean)
      .join(" ")
      .trim() || "-"
  );
};

const getCourseName = (payment) => {
  // Current Payment Report API response
  if (payment?.course) {
    return payment.course;
  }

  // Fallback for populated admission object
  return (
    payment?.admission?.course?.courseTitle ||
    payment?.admission?.course_title ||
    payment?.admission?.courseType ||
    "-"
  );
};

const getBatchName = (payment) => {
  // Current Payment Report API response
  if (payment?.batch) {
    return payment.batch;
  }

  // Fallback for populated admission object
  return (
    payment?.admission?.batch?.batch_name ||
    payment?.admission?.batch_name ||
    "-"
  );
};

const getReceiptNumber = (payment) => {
  return payment?.receipt_no || payment?.receiptNo || "-";
};

const getPaymentAmount = (payment) => {
  return Number(payment?.amount || 0);
};

const getPaymentMode = (payment) => {
  return payment?.payment_mode || payment?.paymentMode || "-";
};

const getPaymentStatus = (payment) => {
  return payment?.status || "-";
};

const PaymentReports = () => {
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    course_id: "",
    batch_id: "",
    student_id: "",
    status: "",
    payment_mode: "",
  });

  const [filterData, setFilterData] = useState({
    courses: [],
    batches: [],
    students: [],
  });

  const [report, setReport] = useState({
    summary: {},
    transactions: [],
  });

  const [loading, setLoading] = useState(false);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReportFilters();
    loadReport();
  }, []);

  const loadReportFilters = async () => {
    try {
      setFiltersLoading(true);

      const response = await getPaymentReportFilters();
      const data = getResponseData(response);

      setFilterData({
        courses: data?.courses || [],
        batches: data?.batches || [],
        students: data?.students || [],
      });
    } catch (err) {
      console.error("Payment report filters error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load report filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  };

  const loadReport = async (customFilters = filters) => {
    try {
      setLoading(true);
      setError("");

      const params = Object.fromEntries(
        Object.entries(customFilters).filter(
          ([, value]) => value !== "" && value !== null && value !== undefined
        )
      );

      const response = await getPaymentReport(params);
      const data = getResponseData(response);

      setReport({
        summary: data?.summary || {},
        transactions: data?.transactions || [],
      });
    } catch (err) {
      console.error("Payment report error:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load payment report."
      );
    } finally {
      setLoading(false);
    }
  };

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

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "course_id") {
      setFilters((previous) => ({
        ...previous,
        course_id: value,
        batch_id: "",
      }));

      return;
    }

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApply = () => {
    loadReport(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      student_id: "",
      status: "",
      payment_mode: "",
    };

    setFilters(resetFilters);
    loadReport(resetFilters);
  };

  const summary = report.summary || {};
  const transactions = report.transactions || [];

  const selectedCourse = filterData.courses.find(
    (course) => String(course?._id) === String(filters.course_id)
  );

  const selectedBatch = filterData.batches.find(
    (batch) => String(batch?._id) === String(filters.batch_id)
  );

  const selectedStudent = filterData.students.find(
    (student) => String(student?._id) === String(filters.student_id)
  );

  const getAppliedFilters = () => {
    const applied = [];

    if (filters.date_from) {
      applied.push(`From: ${filters.date_from}`);
    }

    if (filters.date_to) {
      applied.push(`To: ${filters.date_to}`);
    }

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

    if (filters.status) {
      applied.push(`Status: ${filters.status}`);
    }

    if (filters.payment_mode) {
      applied.push(`Mode: ${filters.payment_mode}`);
    }

    return applied;
  };

  // const exportExcel = () => {
  //   if (!transactions.length) {
  //     alert("No payment records available for Excel export.");
  //     return;
  //   }

  //   const transactionRows = transactions.map((payment) => ({
  //     "Receipt No": getReceiptNumber(payment),
  //     "Student Name": getStudentName(payment?.student),
  //     "Roll No": payment?.student?.rollNo || "-",
  //     "Course": getCourseName(payment),
  //     "Batch": getBatchName(payment),
  //     "Payment Date": formatDate(payment?.payment_date),
  //     "Payment Mode": getPaymentMode(payment),
  //     Amount: getPaymentAmount(payment),
  //     Status: getPaymentStatus(payment),
  //     Notes: payment?.notes || "",
  //   }));

  //   const summaryRows = [
  //     {
  //       Metric: "Total Students",
  //       Value: Number(summary.totalStudents || 0),
  //     },
  //     {
  //       Metric: "Total Transactions",
  //       Value: Number(summary.totalTransactions || 0),
  //     },
  //     {
  //       Metric: "Total Fees Collected",
  //       Value: Number(summary.totalFeesCollected || 0),
  //     },
  //     {
  //       Metric: "Pending Payments",
  //       Value: Number(summary.pendingPayments || 0),
  //     },
  //     {
  //       Metric: "Overdue Payments",
  //       Value: Number(summary.overduePayments || 0),
  //     },
  //     {
  //       Metric: "Failed Payments",
  //       Value: Number(summary.failedPayments || 0),
  //     },
  //   ];

  //   const workbook = XLSX.utils.book_new();

  //   const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  //   const paymentSheet = XLSX.utils.json_to_sheet(transactionRows);

  //   XLSX.utils.book_append_sheet(
  //     workbook,
  //     summarySheet,
  //     "Summary"
  //   );

  //   XLSX.utils.book_append_sheet(
  //     workbook,
  //     paymentSheet,
  //     "Payments"
  //   );

  //   const filename = `payment-report-${new Date()
  //     .toISOString()
  //     .slice(0, 10)}.xlsx`;

  //   XLSX.writeFile(workbook, filename);
  // };


  const exportExcel = () => {
  if (!transactions.length) {
    alert("No payment records available for Excel export.");
    return;
  }

  const workbook = XLSX.utils.book_new();

  // ---------------------------------------------------------
  // REPORT INFORMATION
  // ---------------------------------------------------------

  const appliedFilters = getAppliedFilters();

  const reportInfo = [
    ["IT Learning Institute"],
    ["Payment Report"],
    [],
    ["Generated", new Date().toLocaleString("en-IN")],
  ];

  if (appliedFilters.length) {
    reportInfo.push([
      "Applied Filters",
      appliedFilters.join(" | "),
    ]);
  } else {
    reportInfo.push([
      "Applied Filters",
      "All Payments",
    ]);
  }

  reportInfo.push([]);

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------

  reportInfo.push(["REPORT SUMMARY"]);

  reportInfo.push([
    "Total Students",
    Number(summary.totalStudents || 0),
  ]);

  reportInfo.push([
    "Total Transactions",
    Number(summary.totalTransactions || 0),
  ]);

  reportInfo.push([
    "Total Fees Collected",
    Number(summary.totalFeesCollected || 0),
  ]);

  reportInfo.push([
    "Pending Payments",
    Number(summary.pendingPayments || 0),
  ]);

  reportInfo.push([
    "Overdue Payments",
    Number(summary.overduePayments || 0),
  ]);

  reportInfo.push([
    "Failed Payments",
    Number(summary.failedPayments || 0),
  ]);

  reportInfo.push([]);

  // ---------------------------------------------------------
  // PAYMENT MODE SUMMARY
  // ---------------------------------------------------------

  reportInfo.push(["PAYMENT MODE SUMMARY"]);

  const paymentModeTotals = {
    Cash: 0,
    UPI: 0,
    Card: 0,
    "Bank Transfer": 0,
  };

  transactions.forEach((payment) => {
    if (getPaymentStatus(payment) !== "Verified") {
      return;
    }

    const mode = getPaymentMode(payment);
    const amount = getPaymentAmount(payment);

    if (
      Object.prototype.hasOwnProperty.call(
        paymentModeTotals,
        mode
      )
    ) {
      paymentModeTotals[mode] += amount;
    }
  });

  Object.entries(paymentModeTotals).forEach(
    ([mode, amount]) => {
      reportInfo.push([
        mode,
        Number(amount.toFixed(2)),
      ]);
    }
  );

  reportInfo.push([]);
  reportInfo.push(["PAYMENT TRANSACTIONS"]);

  // ---------------------------------------------------------
  // COMPLETE TRANSACTION DATA
  // ---------------------------------------------------------

  reportInfo.push([
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
  ]);

  transactions.forEach((payment) => {
    reportInfo.push([
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
    ]);
  });

  // ---------------------------------------------------------
  // REPORT SHEET
  // ---------------------------------------------------------

  const reportSheet =
    XLSX.utils.aoa_to_sheet(reportInfo);

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

  // Freeze the transaction header.
  // Transaction header begins after the report information.
  const transactionHeaderRow =
    reportInfo.findIndex(
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

  // ---------------------------------------------------------
  // SUMMARY SHEET
  // ---------------------------------------------------------

  const summaryRows = [
    ["Metric", "Value"],
    [
      "Total Students",
      Number(summary.totalStudents || 0),
    ],
    [
      "Total Transactions",
      Number(summary.totalTransactions || 0),
    ],
    [
      "Total Fees Collected",
      Number(summary.totalFeesCollected || 0),
    ],
    [
      "Pending Payments",
      Number(summary.pendingPayments || 0),
    ],
    [
      "Overdue Payments",
      Number(summary.overduePayments || 0),
    ],
    [
      "Failed Payments",
      Number(summary.failedPayments || 0),
    ],
  ];

  const summarySheet =
    XLSX.utils.aoa_to_sheet(summaryRows);

  summarySheet["!cols"] = [
    { wch: 28 },
    { wch: 20 },
  ];

  // ---------------------------------------------------------
  // PAYMENTS SHEET
  // ---------------------------------------------------------

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

    ...transactions.map((payment) => [
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

  const paymentSheet =
    XLSX.utils.aoa_to_sheet(paymentRows);

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

  // ---------------------------------------------------------
  // ADD SHEETS
  // ---------------------------------------------------------

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

  // ---------------------------------------------------------
  // DOWNLOAD
  // ---------------------------------------------------------

  const filename = `payment-report-${new Date()
    .toISOString()
    .slice(0, 10)}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

  const exportPDF = () => {
    if (!transactions.length) {
      alert("No payment records available for PDF export.");
      return;
    }

    const doc = new jsPDF("landscape", "mm", "a4");

    doc.setFontSize(18);
    doc.text("IT Learning Institute", 14, 15);

    doc.setFontSize(14);
    doc.text("Payment Report", 14, 23);

    doc.setFontSize(9);

    let currentY = 31;

    const appliedFilters = getAppliedFilters();

    if (appliedFilters.length) {
      doc.text(
        `Filters: ${appliedFilters.join(" | ")}`,
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
      head: [
        [
          "Receipt",
          "Student",
          "Roll No",
          "Course",
          "Batch",
          "Date",
          "Mode",
          "Amount",
          "Status",
        ],
      ],
      body: transactions.map((payment) => [
        getReceiptNumber(payment),
        getStudentName(payment?.student),
        payment?.student?.rollNo || "-",
        getCourseName(payment),
        getBatchName(payment),
        formatDate(payment?.payment_date),
        getPaymentMode(payment),
        formatCurrency(getPaymentAmount(payment)),
        // formatPdfCurrency(getPaymentAmount(payment)),
        // formatCurrency(getPaymentAmount(payment)),
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
    });

    const finalY =
      doc.lastAutoTable?.finalY
        ? doc.lastAutoTable.finalY + 10
        : currentY + 10;

    doc.setFontSize(10);

    doc.text(
      `Total Students: ${Number(summary.totalStudents || 0)}`,
      14,
      finalY
    );

    doc.text(
      `Total Transactions: ${Number(
        summary.totalTransactions || 0
      )}`,
      70,
      finalY
    );

    doc.text(
      `Fees Collected: ${formatCurrency(
      // `Fees Collected: ${formatPdfCurrency(
        summary.totalFeesCollected
      )}`,
      150,
      finalY
    );

    doc.text(
      `Pending: ${Number(summary.pendingPayments || 0)}`,
      240,
      finalY
    );

    const filename = `payment-report-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`;

    doc.save(filename);
  };

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
            onClick={() => loadReport()}
            disabled={loading}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="report-btn excel"
            onClick={exportExcel}
            disabled={!transactions.length}
          >
            <FiDownload />
            Excel
          </button>

          <button
            type="button"
            className="report-btn pdf"
            onClick={exportPDF}
            disabled={!transactions.length}
          >
            <FiFileText />
            PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="report-error">
          {error}
        </div>
      )}

      <div className="payment-report-filters">
        <div className="filter-field">
          <label>From Date</label>
          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label>To Date</label>
          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label>Course</label>

          <select
            name="course_id"
            value={filters.course_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">All Courses</option>

            {filterData.courses.map((course) => (
              <option
                key={course._id}
                value={course._id}
              >
                {course.courseTitle}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Batch</label>

          <select
            name="batch_id"
            value={filters.batch_id}
            onChange={handleChange}
            disabled={filtersLoading || !availableBatches.length}
          >
            <option value="">All Batches</option>

            {availableBatches.map((batch) => (
              <option
                key={batch._id}
                value={batch._id}
              >
                {batch.batch_name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Student</label>

          <select
            name="student_id"
            value={filters.student_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">All Students</option>

            {filterData.students.map((student) => (
              <option
                key={student._id}
                value={student._id}
              >
                {student.rollNo
                  ? `${student.rollNo} - `
                  : ""}
                {getStudentName(student)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Status</label>

          <select
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
          <label>Payment Mode</label>

          <select
            name="payment_mode"
            value={filters.payment_mode}
            onChange={handleChange}
          >
            <option value="">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">
              Bank Transfer
            </option>
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
          >
            Reset
          </button>
        </div>
      </div>

      <div className="payment-report-summary">
        <div className="report-summary-card">
          <span>Total Students</span>
          <strong>
            {Number(summary.totalStudents || 0)}
          </strong>
        </div>

        <div className="report-summary-card">
          <span>Total Transactions</span>
          <strong>
            {Number(summary.totalTransactions || 0)}
          </strong>
        </div>

        <div className="report-summary-card">
          <span>Fees Collected</span>
          <strong>
            {formatCurrency(summary.totalFeesCollected)}
            {/* {formatPdfCurrency(summary.totalFeesCollected)} */}
          </strong>
        </div>

        <div className="report-summary-card">
          <span>Pending Payments</span>
          <strong>
            {Number(summary.pendingPayments || 0)}
          </strong>
        </div>

        <div className="report-summary-card">
          <span>Overdue Payments</span>
          <strong>
            {Number(summary.overduePayments || 0)}
          </strong>
        </div>

        <div className="report-summary-card">
          <span>Failed Payments</span>
          <strong>
            {Number(summary.failedPayments || 0)}
          </strong>
        </div>
      </div>

      <div className="payment-report-table-card">
        <div className="report-table-header">
          <div>
            <h2>Payment Transactions</h2>
            <span>
              {transactions.length} transaction
              {transactions.length !== 1 ? "s" : ""}
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
                      <strong>
                        {getReceiptNumber(payment)}
                      </strong>
                    </td>

                    <td>
                      {getStudentName(payment?.student)}
                    </td>

                    <td>
                      {payment?.student?.rollNo || "-"}
                    </td>

                    <td>
                      {getCourseName(payment)}
                    </td>

                    <td>
                      {getBatchName(payment)}
                    </td>

                    <td>
                      {formatDate(payment?.payment_date)}
                    </td>

                    <td>
                      {getPaymentMode(payment)}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          getPaymentAmount(payment)
                        )}
                      </strong>
                      {/* <strong>
                        {formatPdfCurrency(
                          getPaymentAmount(payment)
                        )}
                      </strong> */}
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
      </div>
    </div>
  );
};

export default PaymentReports;