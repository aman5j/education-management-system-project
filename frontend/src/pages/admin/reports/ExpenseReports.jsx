
import { useCallback, useEffect, useState } from "react";
import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiPrinter,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { getExpenseReport } from "../../../services/expenseService";
import {
  fetchAllReportPages,
} from "../../../utils/fetchAllReportPages";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/ExpenseReports.css";

const CATEGORIES = [
  "Rent",
  "Salary",
  "Electricity",
  "Internet",
  "Stationery",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Travel",
  "Software",
  "Utilities",
  "Other",
];

const INITIAL_FILTERS = {
  from: "",
  to: "",
  category: "",
  status: "",
};

const INITIAL_REPORT = {
  summary: {
    totalAmount: 0,
    totalRecords: 0,
    paidAmount: 0,
    pendingAmount: 0,
  },
  statusBreakdown: [],
  categoryBreakdown: [],
  monthlyTrend: [],
  records: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
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

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN");
};

const getResponseData = (response) =>
  response?.data?.data ?? response?.data ?? {};

const cleanFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined
    )
  );

const ExpenseReports = () => {
  // Draft filters are changed by the user.
  // They do not trigger a report request until Apply is clicked.
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Only applied filters are used for report requests and exports.
  const [appliedFilters, setAppliedFilters] = useState(
    INITIAL_FILTERS
  );

  const [report, setReport] = useState(INITIAL_REPORT);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(
    async (currentFilters, currentPage) => {
      setLoading(true);
      setError("");

      try {
        const response = await getExpenseReport({
          ...cleanFilters(currentFilters),
          page: currentPage,
          limit: 10,
        });

        const data = getResponseData(response);

        setReport({
          summary: {
            ...INITIAL_REPORT.summary,
            ...(data?.summary || {}),
          },
          statusBreakdown: Array.isArray(data?.statusBreakdown)
            ? data.statusBreakdown
            : [],
          categoryBreakdown: Array.isArray(data?.categoryBreakdown)
            ? data.categoryBreakdown
            : [],
          monthlyTrend: Array.isArray(data?.monthlyTrend)
            ? data.monthlyTrend
            : [],
          records: Array.isArray(data?.records)
            ? data.records
            : [],
          pagination: {
            ...INITIAL_REPORT.pagination,
            ...(data?.pagination || {}),
          },
        });

        setHasLoaded(true);
      } catch (err) {
        const message = getApiErrorMessage(err);

        setError(message);
        notification.error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load and subsequent applied-filter/page changes.
  // Draft filter changes do not cause requests.
  useEffect(() => {
    loadReport(appliedFilters, page);
  }, [loadReport, appliedFilters, page]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleApply = () => {
    if (
      filters.from &&
      filters.to &&
      filters.from > filters.to
    ) {
      notification.warning(
        "'From' date cannot be after 'To' date."
      );
      return;
    }

    const nextFilters = {
      ...filters,
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

  const summary = report.summary || INITIAL_REPORT.summary;
  const records = report.records || [];
  const pagination = report.pagination || INITIAL_REPORT.pagination;

  const getAppliedFilterLabels = () => {
    const labels = [];

    if (appliedFilters.from) {
      labels.push(`From: ${appliedFilters.from}`);
    }

    if (appliedFilters.to) {
      labels.push(`To: ${appliedFilters.to}`);
    }

    if (appliedFilters.category) {
      labels.push(`Category: ${appliedFilters.category}`);
    }

    if (appliedFilters.status) {
      labels.push(`Status: ${appliedFilters.status}`);
    }

    return labels;
  };

  const buildExpenseRows = (allRecords) =>
    allRecords.map((expense, index) => ({
      "S.No.": index + 1,
      Title: expense.title || "-",
      Category: expense.category || "-",
      Amount: Number(expense.amount || 0),
      "Expense Date": formatDate(expense.expenseDate),
      "Payment Method": expense.paymentMethod || "-",
      Vendor: expense.vendor || "-",
      Status: expense.status || "-",
      Description: expense.description || "",
      "Receipt Uploaded": expense.receiptUrl ? "Yes" : "No",
    }));

  const fetchCompleteExpenseReport = async () => {
    return fetchAllReportPages({
      fetchPage: getExpenseReport,
      filters: cleanFilters(appliedFilters),
      recordsKey: "records",
    });
  };

  const exportExcel = async () => {
    if (exporting || loading) return;

    setExporting(true);
    const toastId = notification.loading(
      "Preparing complete expense Excel report..."
    );

    try {
      const result = await fetchCompleteExpenseReport();
      const allRecords = result.rows;
      const exportSummary = {
        ...INITIAL_REPORT.summary,
        ...(result.summary || {}),
      };

      if (!allRecords.length) {
        notification.dismiss(toastId);
        notification.info("No expense records match the applied filters.");
        return;
      }

      const workbook = XLSX.utils.book_new();

      const expenseRows = buildExpenseRows(allRecords);

      const summaryRows = [
        {
          Metric: "Total Expenses",
          Value: Number(exportSummary.totalAmount || 0),
        },
        {
          Metric: "Total Records",
          Value: Number(exportSummary.totalRecords || 0),
        },
        {
          Metric: "Paid Amount",
          Value: Number(exportSummary.paidAmount || 0),
        },
        {
          Metric: "Pending Amount",
          Value: Number(exportSummary.pendingAmount || 0),
        },
        {
          Metric: "Exported Records",
          Value: allRecords.length,
        },
      ];

      const statusRows = (report.statusBreakdown || []).map((item) => ({
        Status: item._id || "-",
        "Number of Records": Number(item.count || 0),
        "Total Amount": Number(item.amount || 0),
      }));

      const categoryRows = (report.categoryBreakdown || []).map(
        (item) => ({
          Category: item._id || "Other",
          "Number of Records": Number(item.count || 0),
          "Total Amount": Number(item.amount || 0),
        })
      );

      const monthlyRows = (report.monthlyTrend || []).map((item) => ({
        Year: item._id?.year || "",
        Month: item._id?.month || "",
        "Number of Records": Number(item.count || 0),
        "Total Amount": Number(item.amount || 0),
      }));

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(expenseRows),
        "Expense Records"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(summaryRows),
        "Summary"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(categoryRows),
        "Category Breakdown"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(statusRows),
        "Status Breakdown"
      );

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(monthlyRows),
        "Monthly Trend"
      );

      XLSX.writeFile(
        workbook,
        `expense-report-${new Date().toISOString().slice(0, 10)}.xlsx`
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

  const exportPDF = async () => {
    if (exporting || loading) return;

    setExporting(true);
    const toastId = notification.loading(
      "Preparing complete expense PDF report..."
    );

    try {
      const result = await fetchCompleteExpenseReport();
      const allRecords = result.rows;
      const exportSummary = {
        ...INITIAL_REPORT.summary,
        ...(result.summary || {}),
      };

      if (!allRecords.length) {
        notification.dismiss(toastId);
        notification.info("No expense records match the applied filters.");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.text("Expense Report", 14, 15);

      doc.setFontSize(9);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        14,
        22
      );

      const filterText = getAppliedFilterLabels().join(" | ");

      if (filterText) {
        doc.text(filterText, 14, 28);
      }

      autoTable(doc, {
        startY: filterText ? 34 : 29,
        head: [[
          "Title",
          "Category",
          "Amount",
          "Date",
          "Payment Method",
          "Vendor",
          "Status",
          "Receipt",
        ]],
        body: allRecords.map((expense) => [
          expense.title || "-",
          expense.category || "-",
          formatPdfCurrency(expense.amount),
          formatDate(expense.expenseDate),
          expense.paymentMethod || "-",
          expense.vendor || "-",
          expense.status || "-",
          expense.receiptUrl ? "Uploaded" : "No receipt",
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

      const finalY = (doc.lastAutoTable?.finalY || 40) + 9;

      // If the table ends near the bottom of a page,
      // put the summary on a fresh page.
      const summaryY =
        finalY > 180 ? (doc.addPage(), 20) : finalY;

      doc.setFontSize(10);
      doc.text(
        `Total Expenses: ${formatPdfCurrency(exportSummary.totalAmount)}`,
        14,
        summaryY
      );
      doc.text(
        `Paid: ${formatPdfCurrency(exportSummary.paidAmount)}`,
        105,
        summaryY
      );
      doc.text(
        `Pending: ${formatPdfCurrency(exportSummary.pendingAmount)}`,
        185,
        summaryY
      );
      doc.text(
        `Total Records: ${Number(exportSummary.totalRecords || 0)}`,
        14,
        summaryY + 7
      );
      doc.text(
        `Exported Records: ${allRecords.length}`,
        105,
        summaryY + 7
      );

      doc.save(
        `expense-report-${new Date().toISOString().slice(0, 10)}.pdf`
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

  return (
    <div className="expense-reports-page">
      <div className="expense-reports-header">
        <div>
          <span className="expense-reports-eyebrow">
            FINANCE REPORTS
          </span>
          <h1>Expense Reports</h1>
          <p>
            Review institute expenses, payment status and category-wise
            spending.
          </p>
        </div>

        <button
          type="button"
          className="expense-report-secondary-button"
          onClick={handleRefresh}
          disabled={loading || exporting}
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {error && (
        <div className="expense-report-alert" role="alert">
          {error}
        </div>
      )}

      <section className="expense-report-filter-card">
        <div className="expense-report-section-heading">
          <div>
            <h2>Filter Report</h2>
            <p>
              Choose the date range and expense details, then apply.
            </p>
          </div>
        </div>

        <div className="expense-report-filters">
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
            Category
            <select
              name="category"
              value={filters.category}
              onChange={handleChange}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            Payment Status
            <select
              name="status"
              value={filters.status}
              onChange={handleChange}
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </label>

          <div className="expense-report-filter-actions">
            <button
              type="button"
              className="expense-report-primary-button"
              onClick={handleApply}
              disabled={loading || exporting}
            >
              <FiSearch /> Apply
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={handleReset}
              disabled={loading || exporting}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="expense-report-summary-grid">
        <article className="expense-report-summary-card">
          <span>Total Expenses</span>
          <strong>{formatCurrency(summary.totalAmount)}</strong>
          <small>{summary.totalRecords || 0} records</small>
        </article>

        <article className="expense-report-summary-card">
          <span>Paid Amount</span>
          <strong>{formatCurrency(summary.paidAmount)}</strong>
          <small>Recorded as paid</small>
        </article>

        <article className="expense-report-summary-card">
          <span>Pending Amount</span>
          <strong>{formatCurrency(summary.pendingAmount)}</strong>
          <small>Awaiting payment</small>
        </article>
      </section>

      <section className="expense-report-card">
        <div className="expense-report-section-heading expense-report-table-heading">
          <div>
            <h2>Expense Records</h2>
            <p>
              {pagination.total || 0} matching records
              {pagination.totalPages > 0
                ? ` · Page ${pagination.page} of ${pagination.totalPages}`
                : ""}
            </p>
          </div>

          <div className="expense-report-export-actions">
            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={exportExcel}
              disabled={
                loading ||
                exporting ||
                !pagination.total
              }
            >
              <FiDownload />
              {exporting ? "Preparing..." : "Excel"}
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={exportPDF}
              disabled={
                loading ||
                exporting ||
                !pagination.total
              }
            >
              <FiFileText />
              {exporting ? "Preparing..." : "PDF"}
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={() => window.print()}
              disabled={loading || exporting}
            >
              <FiPrinter /> Print
            </button>
          </div>
        </div>

        {loading ? (
          <div className="expense-report-state">
            Loading Expense Reports...
          </div>
        ) : !records.length ? (
          <div className="expense-report-state">
            {hasLoaded
              ? "No expense records match the applied filters."
              : "No expense records found."}
          </div>
        ) : (
          <div className="expense-report-table-wrapper">
            <table className="expense-report-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Vendor</th>
                  <th>Status</th>
                  <th>Receipt</th>
                </tr>
              </thead>

              <tbody>
                {records.map((expense) => (
                  <tr key={expense._id}>
                    <td>
                      <strong>{expense.title || "-"}</strong>
                      {expense.description && (
                        <small className="expense-report-description">
                          {expense.description}
                        </small>
                      )}
                    </td>

                    <td>{expense.category || "-"}</td>

                    <td className="expense-report-amount">
                      {formatCurrency(expense.amount)}
                    </td>

                    <td>{formatDate(expense.expenseDate)}</td>
                    <td>{expense.paymentMethod || "-"}</td>
                    <td>{expense.vendor || "-"}</td>

                    <td>
                      <span
                        className={`expense-report-status ${
                          expense.status === "Paid"
                            ? "paid"
                            : "pending"
                        }`}
                      >
                        {expense.status || "-"}
                      </span>
                    </td>

                    <td>
                      {expense.receiptUrl ? (
                        <span className="expense-report-receipt">
                          <FiFileText /> Uploaded
                        </span>
                      ) : (
                        <span className="expense-report-no-receipt">
                          No receipt
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="expense-report-pagination">
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
              className="expense-report-secondary-button"
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
              className="expense-report-secondary-button"
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

      <section className="expense-report-card">
        <div className="expense-report-section-heading">
          <div>
            <h2>Category Breakdown</h2>
            <p>
              Total spending grouped by expense category for the
              applied filters.
            </p>
          </div>
        </div>

        {!report.categoryBreakdown.length ? (
          <div className="expense-report-state">
            No category breakdown available.
          </div>
        ) : (
          <div className="expense-report-category-list">
            {report.categoryBreakdown.map((item) => (
              <div
                className="expense-report-category-row"
                key={item._id || "Other"}
              >
                <div>
                  <strong>{item._id || "Other"}</strong>
                  <small>{item.count || 0} records</small>
                </div>

                <strong>{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ExpenseReports;
