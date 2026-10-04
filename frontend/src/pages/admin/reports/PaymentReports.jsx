import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiDownload,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";

import {
  getPaymentReport,
} from "../../../services/paymentReportService";

import "../../../styles/PaymentReports.css";

const PaymentReports = () => {
  const [report, setReport] =
    useState({
      summary: {
        totalStudents: 0,
        totalTransactions: 0,
        totalFeesCollected: 0,
        pendingPayments: 0,
        overduePayments: 0,
        failedPayments: 0,
      },
      paymentModeSummary: [],
      transactions: [],
    });

  const [filters, setFilters] =
    useState({
      date_from: "",
      date_to: "",
      status: "",
      payment_mode: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadReport =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getPaymentReport(
            filters
          );

        const data =
          response?.data?.data;

        setReport({
          summary:
            data?.summary || {
              totalStudents: 0,
              totalTransactions: 0,
              totalFeesCollected: 0,
              pendingPayments: 0,
              overduePayments: 0,
              failedPayments: 0,
            },

          paymentModeSummary:
            Array.isArray(
              data?.paymentModeSummary
            )
              ? data.paymentModeSummary
              : [],

          transactions:
            Array.isArray(
              data?.transactions
            )
              ? data.transactions
              : [],
        });
      } catch (reportError) {
        console.error(
          "Payment report error:",
          reportError
        );

        setError(
          reportError?.response
            ?.data?.message ||
            "Unable to load payment report."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadReport();
  }, []);

  const handleFilterChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFilters(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  const handleApply =
    () => {
      loadReport();
    };

  const handleReset =
    () => {
      setFilters({
        date_from: "",
        date_to: "",
        status: "",
        payment_mode: "",
      });

      setTimeout(
        () => {
          loadReport();
        },
        0
      );
    };

  const formatCurrency =
    (amount) => {
      return `₹${Number(
        amount || 0
      ).toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`;
    };

  const formatDate =
    (date) => {
      if (!date) {
        return "-";
      }

      const parsed =
        new Date(date);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return "-";
      }

      return parsed.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );
    };

  /*
  |--------------------------------------------------------------------------
  | CSV Export
  |--------------------------------------------------------------------------
  */

  const exportCSV =
    () => {
      const rows =
        report.transactions;

      if (!rows.length) {
        alert(
          "No payment data available for export."
        );

        return;
      }

      const headers = [
        "Receipt Number",
        "Payment Date",
        "Student Name",
        "Roll No",
        "Course",
        "Batch",
        "Payment Mode",
        "Amount",
        "Status",
      ];

      const csvRows =
        rows.map(
          (row) => [
            row.receipt_no,
            formatDate(
              row.payment_date
            ),
            row.student?.name ||
              "",
            row.student?.rollNo ||
              "",
            row.course || "",
            row.batch || "",
            row.payment_mode ||
              "",
            row.amount || 0,
            row.status || "",
          ]
        );

      const csvContent = [
        headers,
        ...csvRows,
      ]
        .map(
          (row) =>
            row
              .map(
                (value) =>
                  `"${String(
                    value ?? ""
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(",")
        )
        .join("\n");

      const blob =
        new Blob(
          [csvContent],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        "payment-report.csv";

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Total Mode Amount
  |--------------------------------------------------------------------------
  */

  const totalModeAmount =
    useMemo(() => {
      return report.paymentModeSummary.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount || 0
          ),
        0
      );
    }, [
      report.paymentModeSummary,
    ]);

  return (
    <div className="payment-report-page">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="payment-report-header">
        <div>
          <h1>
            Payment Reports
          </h1>

          <p>
            Analyze student payments,
            collections and outstanding
            transactions.
          </p>
        </div>

        <button
          type="button"
          className="payment-report-export-button"
          onClick={
            exportCSV
          }
        >
          <FiDownload />
          Export CSV
        </button>
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="payment-report-card">
        <div className="payment-report-section-header">
          <div>
            <h2>
              Report Filters
            </h2>

            <p>
              Filter payment transactions
              by date and status.
            </p>
          </div>
        </div>

        <div className="payment-report-filters">
          <div className="payment-report-field">
            <label>
              Date From
            </label>

            <input
              type="date"
              name="date_from"
              value={
                filters.date_from
              }
              onChange={
                handleFilterChange
              }
            />
          </div>

          <div className="payment-report-field">
            <label>
              Date To
            </label>

            <input
              type="date"
              name="date_to"
              value={
                filters.date_to
              }
              onChange={
                handleFilterChange
              }
            />
          </div>

          <div className="payment-report-field">
            <label>
              Status
            </label>

            <select
              name="status"
              value={
                filters.status
              }
              onChange={
                handleFilterChange
              }
            >
              <option value="">
                All Statuses
              </option>

              <option value="Verified">
                Verified
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Failed">
                Failed
              </option>

              <option value="Overdue">
                Overdue
              </option>
            </select>
          </div>

          <div className="payment-report-field">
            <label>
              Payment Mode
            </label>

            <select
              name="payment_mode"
              value={
                filters.payment_mode
              }
              onChange={
                handleFilterChange
              }
            >
              <option value="">
                All Modes
              </option>

              <option value="Cash">
                Cash
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Bank Transfer">
                Bank Transfer
              </option>
            </select>
          </div>

          <div className="payment-report-filter-actions">
            <button
              type="button"
              className="payment-report-apply-button"
              onClick={
                handleApply
              }
            >
              <FiSearch />
              Apply
            </button>

            <button
              type="button"
              className="payment-report-reset-button"
              onClick={
                handleReset
              }
            >
              <FiRefreshCw />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="payment-report-error">
          {error}
        </div>
      )}

      {/* =====================================================
          SUMMARY CARDS
      ===================================================== */}

      <div className="payment-report-summary-grid">
        <div className="payment-report-summary-card">
          <span>
            Total Students
          </span>

          <strong>
            {
              report.summary
                .totalStudents
            }
          </strong>
        </div>

        <div className="payment-report-summary-card payment-report-collected">
          <span>
            Total Fees Collected
          </span>

          <strong>
            {formatCurrency(
              report.summary
                .totalFeesCollected
            )}
          </strong>
        </div>

        <div className="payment-report-summary-card payment-report-pending">
          <span>
            Pending Payments
          </span>

          <strong>
            {formatCurrency(
              report.summary
                .pendingPayments
            )}
          </strong>
        </div>

        <div className="payment-report-summary-card payment-report-overdue">
          <span>
            Overdue Payments
          </span>

          <strong>
            {formatCurrency(
              report.summary
                .overduePayments
            )}
          </strong>
        </div>
      </div>

      {/* =====================================================
          PAYMENT MODE SUMMARY
      ===================================================== */}

      <div className="payment-report-card">
        <div className="payment-report-section-header">
          <div>
            <h2>
              Payment Mode Summary
            </h2>

            <p>
              Verified payment collection
              by payment mode.
            </p>
          </div>

          <div className="payment-report-total">
            <FiTrendingUp />

            <span>
              Total
            </span>

            <strong>
              {formatCurrency(
                totalModeAmount
              )}
            </strong>
          </div>
        </div>

        <div className="payment-mode-grid">
          {report.paymentModeSummary.map(
            (item) => (
              <div
                className="payment-mode-card"
                key={
                  item.mode
                }
              >
                <span>
                  {
                    item.mode
                  }
                </span>

                <strong>
                  {formatCurrency(
                    item.amount
                  )}
                </strong>
              </div>
            )
          )}
        </div>
      </div>

      {/* =====================================================
          TRANSACTIONS
      ===================================================== */}

      <div className="payment-report-card">
        <div className="payment-report-section-header">
          <div>
            <h2>
              Payment Transactions
            </h2>

            <p>
              {
                report.summary
                  .totalTransactions
              }{" "}
              transactions found.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="payment-report-state">
            Loading payment report...
          </div>
        ) : report
            .transactions
            .length === 0 ? (
          <div className="payment-report-state">
            No payment transactions
            found for the selected
            filters.
          </div>
        ) : (
          <div className="payment-report-table-wrapper">
            <table className="payment-report-table">
              <thead>
                <tr>
                  <th>
                    Receipt No.
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Student
                  </th>

                  <th>
                    Roll No
                  </th>

                  <th>
                    Course
                  </th>

                  <th>
                    Batch
                  </th>

                  <th>
                    Mode
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {report.transactions.map(
                  (transaction) => (
                    <tr
                      key={
                        transaction._id
                      }
                    >
                      <td>
                        <strong>
                          {
                            transaction.receipt_no
                          }
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          transaction.payment_date
                        )}
                      </td>

                      <td>
                        {
                          transaction
                            .student
                            ?.name
                        }
                      </td>

                      <td>
                        {
                          transaction
                            .student
                            ?.rollNo
                        }
                      </td>

                      <td>
                        {
                          transaction.course
                        }
                      </td>

                      <td>
                        {
                          transaction.batch
                        }
                      </td>

                      <td>
                        {
                          transaction.payment_mode
                        }
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            transaction.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`payment-report-status payment-report-status-${String(
                            transaction.status ||
                              ""
                          ).toLowerCase()}`}
                        >
                          {
                            transaction.status
                          }
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentReports;