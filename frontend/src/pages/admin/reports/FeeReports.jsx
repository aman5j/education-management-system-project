import {
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

import "../../../styles/FeeReports.css";

const getResponseData = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
};

const formatCurrency = (
  value
) => {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatDate = (
  value
) => {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-IN"
  );
};

const FeeReports = () => {
  const [filters, setFilters] =
    useState({
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      status: "",
    });

  const [filterData, setFilterData] =
    useState({
      courses: [],
      batches: [],
    });

  const [report, setReport] =
    useState({
      summary: {},
      fees: [],
    });

  const [loading, setLoading] =
    useState(false);

  const [
    filtersLoading,
    setFiltersLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Available Batches
  |--------------------------------------------------------------------------
  */

  const availableBatches =
    useMemo(() => {
      if (!filters.course_id) {
        return filterData.batches;
      }

      return filterData.batches.filter(
        (batch) =>
          String(
            batch?.course_id?._id ||
              batch?.course_id
          ) ===
          String(
            filters.course_id
          )
      );
    }, [
      filters.course_id,
      filterData.batches,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Filters
  |--------------------------------------------------------------------------
  */

  const loadFilters =
    async () => {
      try {
        setFiltersLoading(
          true
        );

        const response =
          await getFeeReportFilters();

        const data =
          getResponseData(
            response
          );

        setFilterData({
          courses:
            Array.isArray(
              data.courses
            )
              ? data.courses
              : [],

          batches:
            Array.isArray(
              data.batches
            )
              ? data.batches
              : [],
        });
      } catch (err) {
        console.error(
          "Fee report filters error:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to load fee report filters."
        );
      } finally {
        setFiltersLoading(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Report
  |--------------------------------------------------------------------------
  */

  const loadReport =
    async (
      currentFilters = filters
    ) => {
      try {
        setLoading(true);

        setError("");

        const params = {};

        Object.entries(
          currentFilters
        ).forEach(
          ([key, value]) => {
            if (
              value !== undefined &&
              value !== null &&
              String(value).trim()
            ) {
              params[key] =
                value;
            }
          }
        );

        const response =
          await getFeeReport(
            params
          );

        const data =
          getResponseData(
            response
          );

        setReport({
          summary:
            data.summary || {},

          fees:
            Array.isArray(
              data.fees
            )
              ? data.fees
              : [],
        });
      } catch (err) {
        console.error(
          "Fee report error:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to load fee report."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadFilters();
    loadReport();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Change
  |--------------------------------------------------------------------------
  */

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFilters(
      (previous) => {
        const next = {
          ...previous,
          [name]: value,
        };

        if (
          name ===
          "course_id"
        ) {
          next.batch_id = "";
        }

        return next;
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Apply
  |--------------------------------------------------------------------------
  */

  const handleApply = () => {
    loadReport(filters);
  };

  /*
  |--------------------------------------------------------------------------
  | Reset
  |--------------------------------------------------------------------------
  */

  const handleReset = () => {
    const reset = {
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      status: "",
    };

    setFilters(reset);

    loadReport(reset);
  };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh =
    async () => {
      await Promise.all([
        loadFilters(),
        loadReport(filters),
      ]);
    };

  /*
  |--------------------------------------------------------------------------
  | Excel
  |--------------------------------------------------------------------------
  */

  const exportExcel = () => {
    const fees =
      report.fees || [];

    if (!fees.length) {
      return;
    }

    const summary =
      report.summary || {};

    const rows =
      fees.map(
        (item, index) => ({
          "S.No":
            index + 1,

          "Student":
            item.student
              ?.name || "-",

          "Roll Number":
            item.student
              ?.rollNo || "-",

          Course:
            item.course
              ?.title || "-",

          "Course Type":
            item.course
              ?.type || "-",

          Batch:
            item.batch
              ?.name || "-",

          "Admission Date":
            formatDate(
              item.admission_date
            ),

          "Course Fee":
            Number(
              item.course_fee ||
                0
            ),

          Discount:
            Number(
              item.discount ||
                0
            ),

          GST:
            Number(
              item.gst || 0
            ),

          "Admission Fee":
            Number(
              item.admission_fee ||
                0
            ),

          "Final Fee":
            Number(
              item.final_amount ||
                0
            ),

          Paid:
            Number(
              item.paid_amount ||
                0
            ),

          Pending:
            Number(
              item.remaining_amount ||
                0
            ),

          "Payment Status":
            item.payment_status ||
            "-",

          "Admission Status":
            item.admission_status ||
            "-",
        })
      );

    const summaryRows = [
      {
        "Report Item":
          "Total Students",
        Value:
          Number(
            summary.totalStudents ||
              0
          ),
      },
      {
        "Report Item":
          "Total Admissions",
        Value:
          Number(
            summary.totalAdmissions ||
              0
          ),
      },
      {
        "Report Item":
          "Total Course Fees",
        Value:
          Number(
            summary.totalCourseFees ||
              0
          ),
      },
      {
        "Report Item":
          "Total Discount",
        Value:
          Number(
            summary.totalDiscount ||
              0
          ),
      },
      {
        "Report Item":
          "Total GST",
        Value:
          Number(
            summary.totalGst ||
              0
          ),
      },
      {
        "Report Item":
          "Total Admission Fees",
        Value:
          Number(
            summary.totalAdmissionFees ||
              0
          ),
      },
      {
        "Report Item":
          "Total Final Fees",
        Value:
          Number(
            summary.totalFinalFees ||
              0
          ),
      },
      {
        "Report Item":
          "Total Paid",
        Value:
          Number(
            summary.totalPaid ||
              0
          ),
      },
      {
        "Report Item":
          "Total Pending",
        Value:
          Number(
            summary.totalPending ||
              0
          ),
      },
      {
        "Report Item":
          "Fully Paid",
        Value:
          Number(
            summary.fullyPaid ||
              0
          ),
      },
      {
        "Report Item":
          "Partially Paid",
        Value:
          Number(
            summary.partiallyPaid ||
              0
          ),
      },
      {
        "Report Item":
          "Unpaid",
        Value:
          Number(
            summary.unpaid ||
              0
          ),
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    const feeSheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    XLSX.utils.book_append_sheet(
      workbook,
      feeSheet,
      "Fee Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `fee-report-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | PDF
  |--------------------------------------------------------------------------
  */

  const exportPDF = () => {
    const fees =
      report.fees || [];

    if (!fees.length) {
      return;
    }

    const summary =
      report.summary || {};

    const doc =
      new jsPDF({
        orientation:
          "landscape",
        unit: "mm",
        format: "a4",
      });

    doc.setFontSize(18);

    doc.text(
      "Fee Report",
      12,
      15
    );

    doc.setFontSize(8);

    doc.text(
      `Generated: ${new Date().toLocaleString(
        "en-IN"
      )}`,
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
      `Final Fees: ${formatCurrency(
        summary.totalFinalFees
      )}`,
      105,
      28
    );

    doc.text(
      `Paid: ${formatCurrency(
        summary.totalPaid
      )}`,
      165,
      28
    );

    doc.text(
      `Pending: ${formatCurrency(
        summary.totalPending
      )}`,
      215,
      28
    );

    autoTable(
      doc,
      {
        startY: 34,

        head: [
          [
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
          ],
        ],

        body:
          fees.map(
            (
              item,
              index
            ) => [
              index + 1,

              item.student
                ?.name || "-",

              item.student
                ?.rollNo || "-",

              item.course
                ?.title || "-",

              item.batch
                ?.name || "-",

              formatDate(
                item.admission_date
              ),

              formatCurrency(
                item.course_fee
              ),

              formatCurrency(
                item.discount
              ),

              formatCurrency(
                item.gst
              ),

              formatCurrency(
                item.admission_fee
              ),

              formatCurrency(
                item.final_amount
              ),

              formatCurrency(
                item.paid_amount
              ),

              formatCurrency(
                item.remaining_amount
              ),

              item.payment_status ||
                "-",

              item.admission_status ||
                "-",
            ]
          ),

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
      }
    );

    doc.save(
      `fee-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  const summary =
    report.summary || {};

  const fees =
    report.fees || [];

  return (
    <div className="fee-reports-page">

      <div className="fee-reports-header">

        <div>
          <h1>
            Fee Reports
          </h1>

          <p>
            Analyze total fees,
            paid fees, pending
            fees and collections.
          </p>
        </div>

        <div className="fee-report-actions">

          <button
            type="button"
            className="fee-report-btn secondary"
            onClick={
              handleRefresh
            }
            disabled={
              loading ||
              filtersLoading
            }
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="fee-report-btn excel"
            onClick={
              exportExcel
            }
            disabled={
              !fees.length
            }
          >
            <FiDownload />
            Excel
          </button>

          <button
            type="button"
            className="fee-report-btn pdf"
            onClick={
              exportPDF
            }
            disabled={
              !fees.length
            }
          >
            <FiFileText />
            PDF
          </button>

        </div>

      </div>

      {error && (
        <div className="fee-report-error">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="fee-report-summary">

        <div className="fee-summary-card">
          <span>
            Total Students
          </span>
          <strong>
            {summary.totalStudents || 0}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            Total Admissions
          </span>
          <strong>
            {summary.totalAdmissions || 0}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            Total Final Fees
          </span>
          <strong>
            {formatCurrency(
              summary.totalFinalFees
            )}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            Total Paid
          </span>
          <strong>
            {formatCurrency(
              summary.totalPaid
            )}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            Total Pending
          </span>
          <strong>
            {formatCurrency(
              summary.totalPending
            )}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            Discount
          </span>
          <strong>
            {formatCurrency(
              summary.totalDiscount
            )}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            GST
          </span>
          <strong>
            {formatCurrency(
              summary.totalGst
            )}
          </strong>
        </div>

        <div className="fee-summary-card">
          <span>
            Admission Fees
          </span>
          <strong>
            {formatCurrency(
              summary.totalAdmissionFees
            )}
          </strong>
        </div>

      </div>

      {/* FILTERS */}

      <div className="fee-report-filters">

        <div className="fee-filter-field">

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
              handleChange
            }
          />

        </div>

        <div className="fee-filter-field">

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
              handleChange
            }
          />

        </div>

        <div className="fee-filter-field">

          <label>
            Course
          </label>

          <select
            name="course_id"
            value={
              filters.course_id
            }
            onChange={
              handleChange
            }
            disabled={
              filtersLoading
            }
          >
            <option value="">
              All Courses
            </option>

            {filterData.courses.map(
              (course) => (
                <option
                  key={
                    course._id
                  }
                  value={
                    course._id
                  }
                >
                  {
                    course.courseTitle
                  }
                </option>
              )
            )}
          </select>

        </div>

        <div className="fee-filter-field">

          <label>
            Batch
          </label>

          <select
            name="batch_id"
            value={
              filters.batch_id
            }
            onChange={
              handleChange
            }
            disabled={
              filtersLoading
            }
          >
            <option value="">
              All Batches
            </option>

            {availableBatches.map(
              (batch) => (
                <option
                  key={
                    batch._id
                  }
                  value={
                    batch._id
                  }
                >
                  {
                    batch.batch_name
                  }
                </option>
              )
            )}
          </select>

        </div>

        <div className="fee-filter-field">

          <label>
            Admission Status
          </label>

          <select
            name="status"
            value={
              filters.status
            }
            onChange={
              handleChange
            }
          >
            <option value="">
              All Status
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Completed">
              Completed
            </option>

            <option value="Dropped">
              Dropped
            </option>
          </select>

        </div>

        <div className="fee-filter-actions">

          <button
            type="button"
            className="fee-report-btn primary"
            onClick={
              handleApply
            }
          >
            Apply
          </button>

          <button
            type="button"
            className="fee-report-btn secondary"
            onClick={
              handleReset
            }
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
                <td colSpan="15">
                  Loading fee report...
                </td>
              </tr>
            ) : !fees.length ? (
              <tr>
                <td colSpan="15">
                  No fee records found.
                </td>
              </tr>
            ) : (
              fees.map(
                (
                  item,
                  index
                ) => (
                  <tr
                    key={
                      item._id ||
                      index
                    }
                  >
                    <td>
                      {index + 1}
                    </td>

                    <td>
                      <strong>
                        {
                          item.student
                            ?.name ||
                          "-"
                        }
                      </strong>
                    </td>

                    <td>
                      {
                        item.student
                          ?.rollNo ||
                        "-"
                      }
                    </td>

                    <td>
                      {
                        item.course
                          ?.title ||
                        "-"
                      }
                    </td>

                    <td>
                      {
                        item.batch
                          ?.name ||
                        "-"
                      }
                    </td>

                    <td>
                      {formatDate(
                        item.admission_date
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.course_fee
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.discount
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.gst
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.admission_fee
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.final_amount
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.paid_amount
                      )}
                    </td>

                    <td>
                      {formatCurrency(
                        item.remaining_amount
                      )}
                    </td>

                    <td>
                      <span
                        className={`fee-status ${String(
                          item.payment_status ||
                            ""
                        ).toLowerCase()}`}
                      >
                        {
                          item.payment_status ||
                          "-"
                        }
                      </span>
                    </td>

                    <td>
                      {
                        item.admission_status ||
                        "-"
                      }
                    </td>
                  </tr>
                )
              )
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
};

export default FeeReports;