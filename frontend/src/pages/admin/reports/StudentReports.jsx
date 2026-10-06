import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../../../context/AuthContext";

import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getStudentReport,
  getStudentReportFilters,
} from "../../../services/studentReportService";

import "../../../styles/StudentReports.css";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getResponseData = (
  response
) => {
  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

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

const getStatusLabel = (
  status
) => {
  if (!status) {
    return "-";
  }

  return (
    String(status)
      .charAt(0)
      .toUpperCase() +
    String(status).slice(1)
  );
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

const StudentReports = () => {
  const {
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  const [filters, setFilters] =
    useState({
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      status: "",
    });

  const [
    filterData,
    setFilterData,
  ] = useState({
    courses: [],
    batches: [],
  });

  const [report, setReport] =
    useState({
      summary: {},
      students: [],
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
  | Available batches
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
          String(filters.course_id)
      );
    }, [
      filters.course_id,
      filterData.batches,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Load filters
  |--------------------------------------------------------------------------
  */

  const loadFilters =
    async () => {
      try {
        setFiltersLoading(true);

        const response =
          await getStudentReportFilters();

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
          "Student report filters error:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to load student report filters."
        );
      } finally {
        setFiltersLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Load report
  |--------------------------------------------------------------------------
  */

  const loadReport =
    async (
      currentFilters = filters
    ) => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getStudentReport(
            currentFilters
          );

        const data =
          getResponseData(
            response
          );

        setReport({
          summary:
            data.summary || {},

          students:
            Array.isArray(
              data.students
            )
              ? data.students
              : [],
        });
      } catch (err) {
        console.error(
          "Student report error:",
          err
        );

        setError(
          err?.response?.data
            ?.message ||
            "Unable to load student report."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Initial load
  |--------------------------------------------------------------------------
  */

//   useEffect(() => {
//     loadFilters();
//     loadReport();
//   }, []);

// useEffect(() => {
//   if (!authReady || !isAuthenticated) {
//     return;
//   }

//   loadFilters();
//   loadReport();
// }, [
//   authReady,
//   isAuthenticated,
// ]);

useEffect(() => {
  if (authLoading) {
    return;
  }

  if (!isAuthenticated) {
    return;
  }

  loadFilters();
  loadReport();
}, [
  authLoading,
  isAuthenticated,
]);

  /*
  |--------------------------------------------------------------------------
  | Filter change
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
          name === "course_id"
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
    const resetFilters = {
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      status: "",
    };

    setFilters(
      resetFilters
    );

    loadReport(
      resetFilters
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Excel Export
  |--------------------------------------------------------------------------
  */

  const exportExcel = () => {
    const students =
      report.students || [];

    if (!students.length) {
      alert(
        "No student records available to export."
      );

      return;
    }

    const summary =
      report.summary || {};

    const rows = students.map(
      (student, index) => ({
        "S.No": index + 1,

        "Student Name":
          student.studentName ||
          "-",

        "Roll No":
          student.rollNo ||
          "-",

        Gender:
          student.gender ||
          "-",

        Mobile:
          student.mobile ||
          "-",

        Email:
          student.email ||
          "-",

        Course:
          student.course ||
          "-",

        Batch:
          student.batch ||
          "-",

        "Admission Date":
          formatDate(
            student.admissionDate
          ),

        "Admission Status":
          student.admissionStatus ||
          "-",

        Status:
          getStatusLabel(
            student.status
          ),

        "Registration Date":
          formatDate(
            student.createdAt
          ),
      })
    );

    const summaryRows = [
      {
        Metric:
          "Total Students",
        Value:
          Number(
            summary.totalStudents ||
              0
          ),
      },
      {
        Metric:
          "Active Students",
        Value:
          Number(
            summary.activeStudents ||
              0
          ),
      },
      {
        Metric:
          "Inactive Students",
        Value:
          Number(
            summary.inactiveStudents ||
              0
          ),
      },
      {
        Metric:
          "Suspended Students",
        Value:
          Number(
            summary.suspendedStudents ||
              0
          ),
      },
      {
        Metric:
          "Students in Selected Period",
        Value:
          Number(
            summary.newStudents ||
              0
          ),
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    const reportSheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    reportSheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 28 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
    ];

    summarySheet["!cols"] = [
      { wch: 32 },
      { wch: 18 },
    ];

    reportSheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    reportSheet["!autofilter"] = {
      ref: reportSheet["!ref"],
    };

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      "Student Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `student-report-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | PDF Export
  |--------------------------------------------------------------------------
  */

  const exportPDF = () => {
    const students =
      report.students || [];

    if (!students.length) {
      alert(
        "No student records available to export."
      );

      return;
    }

    const summary =
      report.summary || {};

    const doc =
      new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

    doc.setFontSize(18);

    doc.text(
      "IT Learning Institute",
      14,
      15
    );

    doc.setFontSize(14);

    doc.text(
      "Student Report",
      14,
      23
    );

    doc.setFontSize(9);

    doc.text(
      `Generated: ${new Date().toLocaleString(
        "en-IN"
      )}`,
      14,
      30
    );

    let currentY = 37;

    /*
    |--------------------------------------------------------------------------
    | Applied Filters
    |--------------------------------------------------------------------------
    */

    const appliedFilters = [];

    if (filters.date_from) {
      appliedFilters.push(
        `From: ${filters.date_from}`
      );
    }

    if (filters.date_to) {
      appliedFilters.push(
        `To: ${filters.date_to}`
      );
    }

    if (filters.course_id) {
      const course =
        filterData.courses.find(
          (item) =>
            String(
              item._id
            ) ===
            String(
              filters.course_id
            )
        );

      if (course) {
        appliedFilters.push(
          `Course: ${course.courseTitle}`
        );
      }
    }

    if (filters.batch_id) {
      const batch =
        filterData.batches.find(
          (item) =>
            String(
              item._id
            ) ===
            String(
              filters.batch_id
            )
        );

      if (batch) {
        appliedFilters.push(
          `Batch: ${batch.batch_name}`
        );
      }
    }

    if (filters.status) {
      appliedFilters.push(
        `Status: ${getStatusLabel(
          filters.status
        )}`
      );
    }

    if (
      appliedFilters.length
    ) {
      doc.setFontSize(9);

      doc.text(
        `Filters: ${appliedFilters.join(
          " | "
        )}`,
        14,
        currentY
      );

      currentY += 7;
    }

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    doc.setFontSize(9);

    doc.text(
      `Total Students: ${Number(
        summary.totalStudents || 0
      )}`,
      14,
      currentY
    );

    doc.text(
      `Active: ${Number(
        summary.activeStudents || 0
      )}`,
      65,
      currentY
    );

    doc.text(
      `Inactive: ${Number(
        summary.inactiveStudents || 0
      )}`,
      105,
      currentY
    );

    doc.text(
      `Suspended: ${Number(
        summary.suspendedStudents || 0
      )}`,
      155,
      currentY
    );

    doc.text(
      `Period Students: ${Number(
        summary.newStudents || 0
      )}`,
      215,
      currentY
    );

    currentY += 7;

    /*
    |--------------------------------------------------------------------------
    | Table
    |--------------------------------------------------------------------------
    */

    autoTable(doc, {
      startY: currentY,

      head: [
        [
          "S.No",
          "Student",
          "Roll No",
          "Gender",
          "Mobile",
          "Course",
          "Batch",
          "Admission Date",
          "Status",
        ],
      ],

      body: students.map(
        (student, index) => [
          index + 1,

          student.studentName ||
            "-",

          student.rollNo ||
            "-",

          student.gender ||
            "-",

          student.mobile ||
            "-",

          student.course ||
            "-",

          student.batch ||
            "-",

          formatDate(
            student.admissionDate
          ),

          getStatusLabel(
            student.status
          ),
        ]
      ),

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

    const filename =
      `student-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

    doc.save(filename);
  };

  const summary =
    report.summary || {};

  const students =
    report.students || [];

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="student-reports-page">
      <div className="student-reports-header">
        <div>
          <h1>
            Student Reports
          </h1>

          <p>
            View, filter and export
            student reports.
          </p>
        </div>

        <div className="student-report-actions">
          <button
            type="button"
            className="student-report-btn secondary"
            onClick={() =>
              loadReport()
            }
            disabled={loading}
          >
            <FiRefreshCw />
            Refresh
          </button>

          <button
            type="button"
            className="student-report-btn excel"
            onClick={exportExcel}
            disabled={
              !students.length
            }
          >
            <FiDownload />
            Excel
          </button>

          <button
            type="button"
            className="student-report-btn pdf"
            onClick={exportPDF}
            disabled={
              !students.length
            }
          >
            <FiFileText />
            PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="student-report-error">
          {error}
        </div>
      )}

      <div className="student-report-filters">
        <div className="student-filter-field">
          <label>
            From Date
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

        <div className="student-filter-field">
          <label>
            To Date
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

        <div className="student-filter-field">
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

        <div className="student-filter-field">
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

        <div className="student-filter-field">
          <label>
            Status
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

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            <option value="suspended">
              Suspended
            </option>
          </select>
        </div>

        <div className="student-filter-actions">
          <button
            type="button"
            className="student-report-btn primary"
            onClick={
              handleApply
            }
            disabled={loading}
          >
            Apply Filters
          </button>

          <button
            type="button"
            className="student-report-btn secondary"
            onClick={
              handleReset
            }
          >
            Reset
          </button>
        </div>
      </div>

      <div className="student-report-summary">
        <div className="student-summary-card">
          <span>
            Total Students
          </span>

          <strong>
            {Number(
              summary.totalStudents ||
                0
            )}
          </strong>
        </div>

        <div className="student-summary-card">
          <span>
            Active Students
          </span>

          <strong>
            {Number(
              summary.activeStudents ||
                0
            )}
          </strong>
        </div>

        <div className="student-summary-card">
          <span>
            Inactive Students
          </span>

          <strong>
            {Number(
              summary.inactiveStudents ||
                0
            )}
          </strong>
        </div>

        <div className="student-summary-card">
          <span>
            Suspended Students
          </span>

          <strong>
            {Number(
              summary.suspendedStudents ||
                0
            )}
          </strong>
        </div>

        <div className="student-summary-card">
          <span>
            Students in Period
          </span>

          <strong>
            {Number(
              summary.newStudents ||
                0
            )}
          </strong>
        </div>
      </div>

      <div className="student-report-table-card">
        <div className="student-report-table-header">
          <div>
            <h2>
              Student Records
            </h2>

            <span>
              {students.length} student
              {students.length !== 1
                ? "s"
                : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="student-report-empty">
            Loading student report...
          </div>
        ) : students.length ===
          0 ? (
          <div className="student-report-empty">
            No student records found
            for the selected filters.
          </div>
        ) : (
          <div className="student-report-table-wrapper">
            <table className="student-report-table">
              <thead>
                <tr>
                  <th>
                    Student
                  </th>

                  <th>
                    Roll No
                  </th>

                  <th>
                    Gender
                  </th>

                  <th>
                    Mobile
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
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {students.map(
                  (student) => (
                    <tr
                      key={
                        student._id
                      }
                    >
                      <td>
                        <strong>
                          {student.studentName ||
                            "-"}
                        </strong>
                      </td>

                      <td>
                        {student.rollNo ||
                          "-"}
                      </td>

                      <td>
                        {student.gender ||
                          "-"}
                      </td>

                      <td>
                        {student.mobile ||
                          "-"}
                      </td>

                      <td>
                        {student.course ||
                          "-"}
                      </td>

                      <td>
                        {student.batch ||
                          "-"}
                      </td>

                      <td>
                        {formatDate(
                          student.admissionDate
                        )}
                      </td>

                      <td>
                        <span
                          className={`student-report-status ${String(
                            student.status ||
                              ""
                          ).toLowerCase()}`}
                        >
                          {getStatusLabel(
                            student.status
                          )}
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

export default StudentReports;