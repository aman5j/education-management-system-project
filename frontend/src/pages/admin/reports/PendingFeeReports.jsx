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
  FiFilter,
} from "react-icons/fi";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getPendingFeeReport,
  getPendingFeeReportFilters,
} from "../../../services/pendingFeeReportService";

import Pagination from "../../../components/common/Pagination";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import {
  fetchAllReportPages,
} from "../../../utils/fetchAllReportPages";

import "../../../styles/PendingFeeReports.css";

const INITIAL_FILTERS = {
  date_from: "",
  date_to: "",
  course_id: "",
  batch_id: "",
  student_id: "",
  status: "",
};

const INITIAL_SUMMARY = {
  studentsWithPendingFees: 0,
  pendingAdmissions: 0,
  totalFinalFees: 0,
  totalPaid: 0,
  totalPending: 0,
  unpaidAdmissions: 0,
  partiallyPaidAdmissions: 0,
};

const INITIAL_PAGINATION = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN");
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

const cleanFilters = (filters = {}) =>
  Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) =>
        value !== "" &&
        value !== null &&
        value !== undefined
    )
  );

const PendingFeeReports = () => {
  const [rows, setRows] = useState([]);

  const [summary, setSummary] = useState(
    INITIAL_SUMMARY
  );

  const [pagination, setPagination] = useState(
    INITIAL_PAGINATION
  );

  const [filterData, setFilterData] = useState({
    courses: [],
    batches: [],
    students: [],
  });

  // Draft values are edited by the user.
  const [filters, setFilters] = useState(
    INITIAL_FILTERS
  );

  // Applied values are used for report requests and exports.
  const [appliedFilters, setAppliedFilters] = useState(
    INITIAL_FILTERS
  );

  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const availableBatches = useMemo(() => {
    if (!filters.course_id) {
      return filterData.batches;
    }

    return filterData.batches.filter((batch) => {
      const batchCourseId =
        batch?.course_id?._id ||
        batch?.course_id;

      return String(batchCourseId || "") ===
        String(filters.course_id);
    });
  }, [filterData.batches, filters.course_id]);

  const loadFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);

      const response =
        await getPendingFeeReportFilters();

      const data = response?.data?.data;

      setFilterData({
        courses: Array.isArray(data?.courses)
          ? data.courses
          : [],

        batches: Array.isArray(data?.batches)
          ? data.batches
          : [],

        students: Array.isArray(data?.students)
          ? data.students
          : [],
      });
    } catch (error) {
      console.error(
        "Pending fee report filters error:",
        error
      );

      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadReport = useCallback(
    async (
      // nextFilters = appliedFilters,
      // requestedPage = 1,
      // requestedLimit = pagination.limit
      nextFilters = INITIAL_FILTERS,
      requestedPage = 1,
      requestedLimit = INITIAL_PAGINATION.limit
    ) => {
      try {
        setLoading(true);

        const params = {
          ...cleanFilters(nextFilters),
          page: requestedPage,
          limit: requestedLimit,
        };

        const response =
          await getPendingFeeReport(params);

        const data = response?.data?.data;

        setRows(
          Array.isArray(data?.rows)
            ? data.rows
            : []
        );

        setSummary({
          ...INITIAL_SUMMARY,
          ...(data?.summary || {}),
        });

        setPagination({
          ...INITIAL_PAGINATION,
          ...(data?.pagination || {}),
        });

        return true;
      } catch (error) {
        console.error(
          "Pending fee report error:",
          error
        );

        notification.error(
          getApiErrorMessage(error)
        );

        return false;
      } finally {
        setLoading(false);
      }
    },
    [appliedFilters, pagination.limit]
  );

  useEffect(() => {
    loadFilters();
    loadReport(INITIAL_FILTERS, 1, 10);
  }, [loadFilters, loadReport]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "course_id"
        ? { batch_id: "" }
        : {}),
    }));
  };

  const handleApplyFilters = async () => {
    if (
      filters.date_from &&
      filters.date_to &&
      filters.date_from > filters.date_to
    ) {
      notification.warning(
        "From Date cannot be after To Date."
      );
      return;
    }

    const nextFilters = { ...filters };

    setAppliedFilters(nextFilters);

    await loadReport(
      nextFilters,
      1,
      pagination.limit
    );
  };

  const handleResetFilters = async () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);

    await loadReport(
      INITIAL_FILTERS,
      1,
      pagination.limit
    );
  };

  const handleRefresh = async () => {
    await loadReport(
      appliedFilters,
      pagination.page,
      pagination.limit
    );
  };

  const handlePageChange = async (nextPage) => {
    await loadReport(
      appliedFilters,
      nextPage,
      pagination.limit
    );
  };

  const handleLimitChange = async (nextLimit) => {
    await loadReport(
      appliedFilters,
      1,
      nextLimit
    );
  };

  // Fetch all matching pages before creating an export.
  const getExportData = async () => {
    return fetchAllReportPages({
      fetchPage: (params) =>
        getPendingFeeReport(params),
      filters: cleanFilters(appliedFilters),
      recordsKey: "rows",
    });
  };

  const getExcelRows = (allRows) =>
    allRows.map((row) => ({
      Student: getStudentName(row.student),

      "Roll No": row.student?.rollNo || "-",

      Course: row.course?.courseTitle || "-",

      Batch: row.batch?.batch_name || "-",

      "Admission Date": formatDate(row.admission_date),

      "Final Fee": Number(row.final_amount || 0),

      Paid: Number(row.paid_amount || 0),

      Pending: Number(row.remaining_amount || 0),

      "Payment Status": row.payment_status || "-",

      "Admission Status": row.status || "-",
    }));

  const getSummaryRows = (reportSummary) => [
    {
      Metric: "Students With Pending Fees",
      Value: reportSummary.studentsWithPendingFees,
    },
    {
      Metric: "Pending Admissions",
      Value: reportSummary.pendingAdmissions,
    },
    {
      Metric: "Total Final Fees",
      Value: reportSummary.totalFinalFees,
    },
    {
      Metric: "Total Paid",
      Value: reportSummary.totalPaid,
    },
    {
      Metric: "Total Pending",
      Value: reportSummary.totalPending,
    },
    {
      Metric: "Unpaid Admissions",
      Value: reportSummary.unpaidAdmissions,
    },
    {
      Metric: "Partially Paid Admissions",
      Value: reportSummary.partiallyPaidAdmissions,
    },
  ];

  const exportExcel = async () => {
    if (exporting || loading) {
      return;
    }

    try {
      setExporting(true);

      const {
        rows: allRows,
        summary: exportSummary,
      } = await getExportData();

      if (!allRows.length) {
        notification.info(
          "No pending fee records available for Excel export."
        );
        return;
      }

      const workbook = XLSX.utils.book_new();

      const reportSheet = XLSX.utils.json_to_sheet(
        getExcelRows(allRows)
      );

      const summarySheet = XLSX.utils.json_to_sheet(
        getSummaryRows({
          ...INITIAL_SUMMARY,
          ...exportSummary,
        })
      );

      reportSheet["!cols"] = [
        { wch: 26 },
        { wch: 16 },
        { wch: 28 },
        { wch: 22 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
      ];

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

      notification.success(
        `Excel exported successfully (${allRows.length} records).`
      );
    } catch (error) {
      console.error(
        "Pending fee Excel export error:",
        error
      );

      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    if (exporting || loading) {
      return;
    }

    try {
      setExporting(true);

      const {
        rows: allRows,
        summary: exportSummary,
      } = await getExportData();

      if (!allRows.length) {
        notification.info(
          "No pending fee records available for PDF export."
        );
        return;
      }

      const finalSummary = {
        ...INITIAL_SUMMARY,
        ...exportSummary,
      };

      const doc = new jsPDF("landscape", "mm", "a4");

      doc.setFontSize(16);
      doc.text("Pending Fee Report", 14, 15);

      doc.setFontSize(9);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        14,
        22
      );

      autoTable(doc, {
        startY: 28,

        head: [[
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
        ]],

        body: allRows.map((row) => [
          getStudentName(row.student),
          row.student?.rollNo || "-",
          row.course?.courseTitle || "-",
          row.batch?.batch_name || "-",
          formatDate(row.admission_date),
          money(row.final_amount),
          money(row.paid_amount),
          money(row.remaining_amount),
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

        showHead: "everyPage",
      });

      const finalY = doc.lastAutoTable?.finalY
        ? doc.lastAutoTable.finalY + 10
        : 40;

      const summaryY = finalY > 175 ? 20 : finalY;

      if (finalY > 175) {
        doc.addPage();
      }

      doc.setFontSize(9);

      doc.text(
        `Students With Pending Fees: ${finalSummary.studentsWithPendingFees}`,
        14,
        summaryY
      );

      doc.text(
        `Pending Admissions: ${finalSummary.pendingAdmissions}`,
        85,
        summaryY
      );

      doc.text(
        `Total Paid: ${money(finalSummary.totalPaid)}`,
        155,
        summaryY
      );

      doc.text(
        `Total Pending: ${money(finalSummary.totalPending)}`,
        220,
        summaryY
      );

      doc.save(
        `pending-fee-report-${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );

      notification.success(
        `PDF exported successfully (${allRows.length} records).`
      );
    } catch (error) {
      console.error(
        "Pending fee PDF export error:",
        error
      );

      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="pending-fee-reports-page">
      <div className="pending-fee-reports-header">
        <div>
          <h1>Pending Fee Reports</h1>

          <p>
            Identify students and admissions with outstanding
            fee balances.
          </p>
        </div>

        <div className="pending-fee-report-actions">
          <button
            type="button"
            className="report-btn secondary"
            onClick={handleRefresh}
            disabled={loading || exporting}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="report-btn excel"
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
            className="report-btn pdf"
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
        </div>
      </div>

      {/* SUMMARY */}
      <div className="pending-fee-summary">
        <div className="pending-fee-summary-card">
          <span>Students With Pending Fees</span>
          <strong>
            {Number(summary.studentsWithPendingFees || 0)}
          </strong>
        </div>

        <div className="pending-fee-summary-card">
          <span>Pending Admissions</span>
          <strong>
            {Number(summary.pendingAdmissions || 0)}
          </strong>
        </div>

        <div className="pending-fee-summary-card">
          <span>Total Final Fees</span>
          <strong>{money(summary.totalFinalFees)}</strong>
        </div>

        <div className="pending-fee-summary-card">
          <span>Total Paid</span>
          <strong>{money(summary.totalPaid)}</strong>
        </div>

        <div className="pending-fee-summary-card pending">
          <span>Total Pending</span>
          <strong>{money(summary.totalPending)}</strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className="pending-fee-filters">
        <div className="filter-field">
          <label htmlFor="pending-fee-date-from">
            From Date
          </label>

          <input
            id="pending-fee-date-from"
            type="date"
            name="date_from"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="pending-fee-date-to">
            To Date
          </label>

          <input
            id="pending-fee-date-to"
            type="date"
            name="date_to"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={handleChange}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="pending-fee-course">
            Course
          </label>

          <select
            id="pending-fee-course"
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
          <label htmlFor="pending-fee-batch">
            Batch
          </label>

          <select
            id="pending-fee-batch"
            name="batch_id"
            value={filters.batch_id}
            onChange={handleChange}
            disabled={
              filtersLoading ||
              !availableBatches.length
            }
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
          <label htmlFor="pending-fee-student">
            Student
          </label>

          <select
            id="pending-fee-student"
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
                  ? `${student.rollNo} - ${getStudentName(student)}`
                  : getStudentName(student)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="pending-fee-status">
            Admission Status
          </label>

          <select
            id="pending-fee-status"
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

        <div className="pending-fee-filter-actions">
          <button
            type="button"
            className="report-btn primary"
            onClick={handleApplyFilters}
            disabled={loading}
          >
            <FiFilter />
            Apply Filters
          </button>

          <button
            type="button"
            className="reset-filter-btn"
            onClick={handleResetFilters}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {/* REPORT TABLE */}
      <div className="pending-fee-table-wrapper">
        <div className="pending-fee-table-heading">
          <div>
            <h2>Pending Fee Admissions</h2>
            <span>
              Showing {rows.length} of {pagination.total} admissions
            </span>
          </div>
        </div>

        {loading ? (
          <div className="report-loading">
            Loading pending fee report...
          </div>
        ) : !rows.length ? (
          <div className="report-empty">
            No pending fees found for the selected filters.
          </div>
        ) : (
          <div className="pending-fee-table-scroll">
            <table className="pending-fee-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Admission Date</th>
                  <th>Final Fee</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Payment Status</th>
                  <th>Admission Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.admission_id}>
                    <td>{getStudentName(row.student)}</td>

                    <td>{row.student?.rollNo || "-"}</td>

                    <td>{row.course?.courseTitle || "-"}</td>

                    <td>{row.batch?.batch_name || "-"}</td>

                    <td>{formatDate(row.admission_date)}</td>

                    <td>{money(row.final_amount)}</td>

                    <td>{money(row.paid_amount)}</td>

                    <td className="pending-amount">
                      {money(row.remaining_amount)}
                    </td>

                    <td>
                      <span
                        className={`payment-status ${
                          row.payment_status?.toLowerCase() || ""
                        }`}
                      >
                        {row.payment_status}
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
          </div>
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          itemCount={rows.length}
          itemLabel="admissions"
          limit={pagination.limit}
          loading={loading || exporting}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>
    </div>
  );
};

export default PendingFeeReports;