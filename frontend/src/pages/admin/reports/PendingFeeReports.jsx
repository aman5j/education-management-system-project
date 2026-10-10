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
  getPendingFeeReport,
  getPendingFeeReportFilters,
} from "../../../services/pendingFeeReportService";

import "../../../styles/PendingFeeReports.css";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(
    "en-IN"
  );
};

const getStudentName = (student) => {
  if (!student) {
    return "-";
  }

  if (student.name) {
    return student.name;
  }

  return [
    student.firstName,
    student.surname,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "-";
};

const PendingFeeReports = () => {
  const [rows, setRows] = useState([]);

  const [summary, setSummary] = useState({
    studentsWithPendingFees: 0,
    pendingAdmissions: 0,
    totalFinalFees: 0,
    totalPaid: 0,
    totalPending: 0,
    unpaidAdmissions: 0,
    partiallyPaidAdmissions: 0,
  });

  const [filterData, setFilterData] =
    useState({
      courses: [],
      batches: [],
      students: [],
    });

  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    course_id: "",
    batch_id: "",
    student_id: "",
    status: "",
  });

  const [loading, setLoading] =
    useState(true);

  const [filtersLoading, setFiltersLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadFilters = async () => {
    try {
      setFiltersLoading(true);

      const response =
        await getPendingFeeReportFilters();

      const data =
        response?.data?.data;

      setFilterData({
        courses: Array.isArray(
          data?.courses
        )
          ? data.courses
          : [],

        batches: Array.isArray(
          data?.batches
        )
          ? data.batches
          : [],

        students: Array.isArray(
          data?.students
        )
          ? data.students
          : [],
      });
    } catch (loadError) {
      console.error(loadError);

      setError(
        loadError?.response?.data
          ?.message ||
          "Unable to load report filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      const params = Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) =>
            value !== "" &&
            value !== null &&
            value !== undefined
        )
      );

      const response =
        await getPendingFeeReport(
          params
        );

      const data =
        response?.data?.data;

      setRows(
        Array.isArray(data?.rows)
          ? data.rows
          : []
      );

      setSummary(
        data?.summary || {
          studentsWithPendingFees: 0,
          pendingAdmissions: 0,
          totalFinalFees: 0,
          totalPaid: 0,
          totalPending: 0,
          unpaidAdmissions: 0,
          partiallyPaidAdmissions: 0,
        }
      );
    } catch (loadError) {
      console.error(loadError);

      setError(
        loadError?.response?.data
          ?.message ||
          "Unable to load pending fee report."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadReport();
  }, [
    filters.date_from,
    filters.date_to,
    filters.course_id,
    filters.batch_id,
    filters.student_id,
    filters.status,
  ]);

  const availableBatches =
    useMemo(() => {
      if (!filters.course_id) {
        return filterData.batches;
      }

      return filterData.batches.filter(
        (batch) =>
          batch?.course_id?._id ===
          filters.course_id
      );
    }, [
      filterData.batches,
      filters.course_id,
    ]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFilters((previous) => ({
      ...previous,

      [name]: value,

      ...(name === "course_id"
        ? {
            batch_id: "",
          }
        : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      student_id: "",
      status: "",
    });
  };

  const exportExcel = () => {
    if (!rows.length) {
      return;
    }

    const reportRows = rows.map(
      (row) => ({
        Student:
          getStudentName(row.student),

        "Roll No":
          row.student?.rollNo || "-",

        Course:
          row.course?.courseTitle ||
          "-",

        Batch:
          row.batch?.batch_name ||
          "-",

        "Admission Date":
          formatDate(
            row.admission_date
          ),

        "Final Fee":
          Number(
            row.final_amount || 0
          ),

        Paid:
          Number(
            row.paid_amount || 0
          ),

        Pending:
          Number(
            row.remaining_amount || 0
          ),

        "Payment Status":
          row.payment_status || "-",

        "Admission Status":
          row.status || "-",
      })
    );

    const summaryRows = [
      {
        Metric:
          "Students With Pending Fees",
        Value:
          summary.studentsWithPendingFees,
      },
      {
        Metric:
          "Pending Admissions",
        Value:
          summary.pendingAdmissions,
      },
      {
        Metric:
          "Total Final Fees",
        Value:
          summary.totalFinalFees,
      },
      {
        Metric:
          "Total Paid",
        Value:
          summary.totalPaid,
      },
      {
        Metric:
          "Total Pending",
        Value:
          summary.totalPending,
      },
      {
        Metric:
          "Unpaid Admissions",
        Value:
          summary.unpaidAdmissions,
      },
      {
        Metric:
          "Partially Paid Admissions",
        Value:
          summary.partiallyPaidAdmissions,
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    const reportSheet =
      XLSX.utils.json_to_sheet(
        reportRows
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      "Pending Fee Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `pending-fee-report-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  const exportPDF = () => {
    if (!rows.length) {
      return;
    }

    const doc = new jsPDF(
      "landscape"
    );

    doc.setFontSize(16);

    doc.text(
      "Pending Fee Report",
      14,
      15
    );

    doc.setFontSize(9);

    doc.text(
      `Generated: ${new Date().toLocaleString(
        "en-IN"
      )}`,
      14,
      22
    );

    autoTable(doc, {
      startY: 28,

      head: [
        [
          "Student",
          "Roll No",
          "Course",
          "Batch",
          "Admission Date",
          "Final Fee",
          "Paid",
          "Pending",
          "Payment Status",
          "Admission Status",
        ],
      ],

      body: rows.map((row) => [
        getStudentName(row.student),

        row.student?.rollNo || "-",

        row.course?.courseTitle ||
          "-",

        row.batch?.batch_name ||
          "-",

        formatDate(
          row.admission_date
        ),

        money(row.final_amount),

        money(row.paid_amount),

        money(
          row.remaining_amount
        ),

        row.payment_status || "-",

        row.status || "-",
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
        ? doc.lastAutoTable.finalY +
          10
        : 40;

    doc.setFontSize(9);

    doc.text(
      `Students With Pending Fees: ${summary.studentsWithPendingFees}`,
      14,
      finalY
    );

    doc.text(
      `Pending Admissions: ${summary.pendingAdmissions}`,
      85,
      finalY
    );

    doc.text(
      `Total Paid: ${money(summary.totalPaid)}`,
      155,
      finalY
    );

    doc.text(
      `Total Pending: ${money(summary.totalPending)}`,
      220,
      finalY
    );

    doc.save(
      `pending-fee-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="pending-fee-reports-page">
      <div className="pending-fee-reports-header">
        <div>
          <h1>
            Pending Fee Reports
          </h1>

          <p>
            Identify students and
            admissions with outstanding
            fee balances.
          </p>
        </div>

        <div className="pending-fee-report-actions">
          <button
            type="button"
            className="report-btn secondary"
            onClick={loadReport}
            disabled={loading}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="report-btn excel"
            onClick={exportExcel}
            disabled={!rows.length}
          >
            <FiDownload />
            Excel
          </button>

          <button
            type="button"
            className="report-btn pdf"
            onClick={exportPDF}
            disabled={!rows.length}
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

      <div className="pending-fee-summary">
        <div className="pending-fee-summary-card">
          <span>
            Students With Pending Fees
          </span>
          <strong>
            {
              summary.studentsWithPendingFees
            }
          </strong>
        </div>

        <div className="pending-fee-summary-card">
          <span>
            Pending Admissions
          </span>
          <strong>
            {summary.pendingAdmissions}
          </strong>
        </div>

        <div className="pending-fee-summary-card">
          <span>
            Total Final Fees
          </span>
          <strong>
            {money(summary.totalFinalFees)}
          </strong>
        </div>

        <div className="pending-fee-summary-card">
          <span>
            Total Paid
          </span>
          <strong>
            {money(summary.totalPaid)}
          </strong>
        </div>

        <div className="pending-fee-summary-card pending">
          <span>
            Total Pending
          </span>
          <strong>
            {money(summary.totalPending)}
          </strong>
        </div>
      </div>

      <div className="pending-fee-filters">
        <div className="filter-field">
          <label>
            From Date
          </label>

          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label>
            To Date
          </label>

          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label>
            Course
          </label>

          <select
            name="course_id"
            value={filters.course_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">
              All Courses
            </option>

            {filterData.courses.map(
              (course) => (
                <option
                  key={course._id}
                  value={course._id}
                >
                  {course.courseTitle}
                </option>
              )
            )}
          </select>
        </div>

        <div className="filter-field">
          <label>
            Batch
          </label>

          <select
            name="batch_id"
            value={filters.batch_id}
            onChange={handleChange}
            disabled={
              filtersLoading ||
              !availableBatches.length
            }
          >
            <option value="">
              All Batches
            </option>

            {availableBatches.map(
              (batch) => (
                <option
                  key={batch._id}
                  value={batch._id}
                >
                  {batch.batch_name}
                </option>
              )
            )}
          </select>
        </div>

        <div className="filter-field">
          <label>
            Student
          </label>

          <select
            name="student_id"
            value={filters.student_id}
            onChange={handleChange}
            disabled={filtersLoading}
          >
            <option value="">
              All Students
            </option>

            {filterData.students.map(
              (student) => (
                <option
                  key={student._id}
                  value={student._id}
                >
                  {student.rollNo
                    ? `${student.rollNo} - ${getStudentName(
                        student
                      )}`
                    : getStudentName(
                        student
                      )}
                </option>
              )
            )}
          </select>
        </div>

        <div className="filter-field">
          <label>
            Admission Status
          </label>

          <select
            name="status"
            value={filters.status}
            onChange={handleChange}
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

        <button
          type="button"
          className="reset-filter-btn"
          onClick={resetFilters}
        >
          Reset Filters
        </button>
      </div>

      <div className="pending-fee-table-wrapper">
        {loading ? (
          <div className="report-loading">
            Loading pending fee report...
          </div>
        ) : !rows.length ? (
          <div className="report-empty">
            No pending fees found.
          </div>
        ) : (
          <table className="pending-fee-table">
            <thead>
              <tr>
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
                  Admission Date
                </th>

                <th>
                  Final Fee
                </th>

                <th>
                  Paid
                </th>

                <th>
                  Pending
                </th>

                <th>
                  Payment Status
                </th>

                <th>
                  Admission Status
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={
                    row.admission_id
                  }
                >
                  <td>
                    {getStudentName(
                      row.student
                    )}
                  </td>

                  <td>
                    {row.student?.rollNo ||
                      "-"}
                  </td>

                  <td>
                    {row.course
                      ?.courseTitle ||
                      "-"}
                  </td>

                  <td>
                    {row.batch
                      ?.batch_name ||
                      "-"}
                  </td>

                  <td>
                    {formatDate(
                      row.admission_date
                    )}
                  </td>

                  <td>
                    {money(
                      row.final_amount
                    )}
                  </td>

                  <td>
                    {money(
                      row.paid_amount
                    )}
                  </td>

                  <td className="pending-amount">
                    {money(
                      row.remaining_amount
                    )}
                  </td>

                  <td>
                    <span
                      className={`payment-status ${row.payment_status
                        ?.toLowerCase()}`}
                    >
                      {
                        row.payment_status
                      }
                    </span>
                  </td>

                  <td>
                    <span className="admission-status">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PendingFeeReports;