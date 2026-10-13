
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

const ExpenseReports = () => {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    category: "",
    status: "",
  });

  const [report, setReport] = useState({
    summary: {},
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
  });

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

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
        const response = await getExpenseReport(params);
        const data = getResponseData(response);

        setReport({
          summary: data?.summary || {},
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
          pagination: data?.pagination || {
            page: currentPage,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        });

        setHasLoaded(true);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Unable to load Expense Reports. Check the report API and try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [filters, page]
  );

  useEffect(() => {
    loadReport(filters, page);
  }, [loadReport, filters, page]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

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
    const reset = {
      from: "",
      to: "",
      category: "",
      status: "",
    };

    setFilters(reset);
    setPage(1);
    loadReport(reset, 1);
  };

  const handleRefresh = () => {
    loadReport(filters, page);
  };

  const summary = report.summary || {};
  const records = report.records || [];
  const pagination = report.pagination || {};

  const exportExcel = () => {
    if (!records.length) {
      window.alert("No expense records available on this page to export.");
      return;
    }

    const expenseRows = records.map((expense, index) => ({
      "S.No.": (pagination.page - 1) * pagination.limit + index + 1,
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

    const summaryRows = [
      { Metric: "Total Expenses", Value: Number(summary.totalAmount || 0) },
      { Metric: "Total Records", Value: Number(summary.totalRecords || 0) },
      { Metric: "Paid Amount", Value: Number(summary.paidAmount || 0) },
      { Metric: "Pending Amount", Value: Number(summary.pendingAmount || 0) },
    ];

    const workbook = XLSX.utils.book_new();

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
      XLSX.utils.json_to_sheet(
        report.categoryBreakdown.map((item) => ({
          Category: item._id || "Other",
          "Number of Records": Number(item.count || 0),
          "Total Amount": Number(item.amount || 0),
        }))
      ),
      "Category Breakdown"
    );

    XLSX.writeFile(
      workbook,
      `expense-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportPDF = () => {
    if (!records.length) {
      window.alert("No expense records available on this page to export.");
      return;
    }

    const doc = new jsPDF("landscape");

    doc.setFontSize(16);
    doc.text("Expense Report", 14, 15);

    doc.setFontSize(9);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      14,
      22
    );

    const filterText = [
      filters.from ? `From: ${filters.from}` : "",
      filters.to ? `To: ${filters.to}` : "",
      filters.category ? `Category: ${filters.category}` : "",
      filters.status ? `Status: ${filters.status}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

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
      body: records.map((expense) => [
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

    doc.setFontSize(10);
    doc.text(
      `Total Expenses: ${formatPdfCurrency(summary.totalAmount)}`,
      14,
      finalY
    );
    doc.text(
      `Paid: ${formatPdfCurrency(summary.paidAmount)}`,
      105,
      finalY
    );
    doc.text(
      `Pending: ${formatPdfCurrency(summary.pendingAmount)}`,
      185,
      finalY
    );

    doc.save(
      `expense-report-${new Date().toISOString().slice(0, 10)}.pdf`
    );
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
          disabled={loading}
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
            <p>Choose the date range and expense details.</p>
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
              disabled={loading}
            >
              <FiSearch /> Apply
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={handleReset}
              disabled={loading}
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
              disabled={!records.length}
            >
              <FiDownload /> Excel
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={exportPDF}
              disabled={!records.length}
            >
              <FiFileText /> PDF
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
              onClick={() => window.print()}
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
              ? "No expense records match the selected filters."
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
            Showing {records.length ? (pagination.page - 1) * pagination.limit + 1 : 0}
            {"–"}
            {(pagination.page - 1) * pagination.limit + records.length}
            {" of "}
            {pagination.total || 0}
          </span>

          <div>
            <button
              type="button"
              className="expense-report-secondary-button"
              disabled={loading || (pagination.page || 1) <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
            >
              Previous
            </button>

            <button
              type="button"
              className="expense-report-secondary-button"
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

      <section className="expense-report-card">
        <div className="expense-report-section-heading">
          <div>
            <h2>Category Breakdown</h2>
            <p>Total spending grouped by expense category for the selected filters.</p>
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
