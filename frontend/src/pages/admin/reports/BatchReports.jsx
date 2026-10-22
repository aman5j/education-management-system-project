import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { FaClipboardList } from "react-icons/fa";
import { FaUserFriends } from "react-icons/fa";
import { GiOfficeChair } from "react-icons/gi";

import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { RiFileExcel2Line } from "react-icons/ri";

import { FaFilePdf } from "react-icons/fa";
import {
  getBatchReport,
  getBatchReportFilters,
} from "../../../services/batchReportService";

import "../../../styles/BatchReports.css";
import { FaBookOpen } from "react-icons/fa6";

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

const formatCurrency = (
  value
) => {
  const amount =
    Number(value || 0);

  return `₹${amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatPdfCurrency = (
  value
) => {
  return `Rs. ${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

const BatchReports = () => {
  const [filters, setFilters] =
    useState({
      search: "",
      course_id: "",
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
      batches: [],
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
  | Load Filter Data
  |--------------------------------------------------------------------------
  */

  const loadFilters = async () => {
    try {
      setFiltersLoading(true);

      const response =
        await getBatchReportFilters();

      const data =
        getResponseData(response);

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
        "Batch report filters error:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          "Unable to load batch report filters."
      );
    } finally {
      setFiltersLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load Report
  |--------------------------------------------------------------------------
  */

  const loadReport = async (
    currentFilters = filters
  ) => {
    try {
      setLoading(true);

      setError("");

      const params = {};

      if (
        currentFilters.search?.trim()
      ) {
        params.search =
          currentFilters.search.trim();
      }

      if (
        currentFilters.course_id
      ) {
        params.course_id =
          currentFilters.course_id;
      }

      if (
        currentFilters.status
      ) {
        params.status =
          currentFilters.status;
      }

      const response =
        await getBatchReport(
          params
        );

      const data =
        getResponseData(response);

      setReport({
        summary:
          data.summary || {},

        batches:
          Array.isArray(
            data.batches
          )
            ? data.batches
            : [],
      });
    } catch (err) {
      console.error(
        "Batch report error:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          "Unable to load batch report."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initial Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadFilters();
    loadReport();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Filter Change
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
      (previous) => ({
        ...previous,
        [name]: value,
      })
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
      search: "",
      course_id: "",
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
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    await Promise.all([
      loadFilters(),
      loadReport(filters),
    ]);
  };

  /*
  |--------------------------------------------------------------------------
  | Excel Export
  |--------------------------------------------------------------------------
  */

  const exportExcel = () => {
    const batches =
      report.batches || [];

    if (!batches.length) {
      return;
    }

    const summary =
      report.summary || {};

    const rows =
      batches.map(
        (
          item,
          index
        ) => {
          const batch =
            item.batch || {};

          const course =
            batch.course_id || {};

          return {
            "S.No":
              index + 1,

            "Batch Name":
              batch.batch_name ||
              "-",

            Course:
              course.courseTitle ||
              "-",

            "Course Type":
              course.courseType ||
              "-",

            Category:
              course.courseCategory ||
              "-",

            "Maximum Seats":
              Number(
                item.maxSeats || 0
              ),

            "Occupied Seats":
              Number(
                item.occupiedSeats ||
                  0
              ),

            "Available Seats":
              Number(
                item.availableSeats ||
                  0
              ),

            "Occupancy %":
              Number(
                item.occupancyPercentage ||
                  0
              ),

            Students:
              Number(
                item.totalStudents ||
                  0
              ),

            Admissions:
              Number(
                item.totalAdmissions ||
                  0
              ),

            Active:
              Number(
                item.activeAdmissions ||
                  0
              ),

            Completed:
              Number(
                item.completedAdmissions ||
                  0
              ),

            Dropped:
              Number(
                item.droppedAdmissions ||
                  0
              ),

            "Course Fees":
              Number(
                item.totalCourseFees ||
                  0
              ),

            Paid:
              Number(
                item.totalPaidAmount ||
                  0
              ),

            Remaining:
              Number(
                item.totalRemainingAmount ||
                  0
              ),

            Status:
              batch.status ||
              "-",

            Created:
              batch.createdAt
                ? new Date(
                    batch.createdAt
                  ).toLocaleString(
                    "en-IN"
                  )
                : "-",

            Updated:
              batch.updatedAt
                ? new Date(
                    batch.updatedAt
                  ).toLocaleString(
                    "en-IN"
                  )
                : "-",
          };
        }
      );

    const summaryRows = [
      {
        "Report Item":
          "Total Batches",
        Value:
          Number(
            summary.totalBatches ||
              0
          ),
      },

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
          "Total Capacity",
        Value:
          Number(
            summary.totalCapacity ||
              0
          ),
      },

      {
        "Report Item":
          "Occupied Seats",
        Value:
          Number(
            summary.totalOccupiedSeats ||
              0
          ),
      },

      {
        "Report Item":
          "Available Seats",
        Value:
          Number(
            summary.totalAvailableSeats ||
              0
          ),
      },

      {
        "Report Item":
          "Active Admissions",
        Value:
          Number(
            summary.activeAdmissions ||
              0
          ),
      },

      {
        "Report Item":
          "Completed Admissions",
        Value:
          Number(
            summary.completedAdmissions ||
              0
          ),
      },

      {
        "Report Item":
          "Dropped Admissions",
        Value:
          Number(
            summary.droppedAdmissions ||
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
          "Total Paid",
        Value:
          Number(
            summary.totalPaidAmount ||
              0
          ),
      },

      {
        "Report Item":
          "Total Remaining",
        Value:
          Number(
            summary.totalRemainingAmount ||
              0
          ),
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    const batchSheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    XLSX.utils.book_append_sheet(
      workbook,
      batchSheet,
      "Batch Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `batch-report-${new Date()
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
    const batches =
      report.batches || [];

    if (!batches.length) {
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
      "Batch Report",
      14,
      16
    );

    doc.setFontSize(9);

    doc.text(
      `Generated: ${new Date().toLocaleString(
        "en-IN"
      )}`,
      14,
      23
    );

    doc.text(
      `Batches: ${Number(
        summary.totalBatches ||
          0
      )}`,
      14,
      30
    );

    doc.text(
      `Students: ${Number(
        summary.totalStudents ||
          0
      )}`,
      55,
      30
    );

    doc.text(
      `Admissions: ${Number(
        summary.totalAdmissions ||
          0
      )}`,
      100,
      30
    );

    doc.text(
      `Capacity: ${Number(
        summary.totalCapacity ||
          0
      )}`,
      150,
      30
    );

    doc.text(
      `Remaining: ${formatPdfCurrency(
        summary.totalRemainingAmount
      )}`,
      200,
      30
    );

    autoTable(
      doc,
      {
        startY: 36,

        head: [
          [
            "S.No",
            "Batch",
            "Course",
            "Type",
            "Max",
            "Occupied",
            "Available",
            "Occupancy",
            "Students",
            "Admissions",
            "Active",
            "Completed",
            "Dropped",
            "Fees",
            "Paid",
            "Remaining",
            "Status",
          ],
        ],

        body:
          batches.map(
            (
              item,
              index
            ) => {
              const batch =
                item.batch ||
                {};

              const course =
                batch.course_id ||
                {};

              return [
                index + 1,

                batch.batch_name ||
                  "-",

                course.courseTitle ||
                  "-",

                course.courseType ||
                  "-",

                Number(
                  item.maxSeats ||
                    0
                ),

                Number(
                  item.occupiedSeats ||
                    0
                ),

                Number(
                  item.availableSeats ||
                    0
                ),

                `${Number(
                  item.occupancyPercentage ||
                    0
                )}%`,

                Number(
                  item.totalStudents ||
                    0
                ),

                Number(
                  item.totalAdmissions ||
                    0
                ),

                Number(
                  item.activeAdmissions ||
                    0
                ),

                Number(
                  item.completedAdmissions ||
                    0
                ),

                Number(
                  item.droppedAdmissions ||
                    0
                ),

                formatPdfCurrency(
                  item.totalCourseFees
                ),

                formatPdfCurrency(
                  item.totalPaidAmount
                ),

                formatPdfCurrency(
                  item.totalRemainingAmount
                ),

                batch.status ||
                  "-",
              ];
            }
          ),

        styles: {
          fontSize: 5.7,
          cellPadding: 1.5,
        },

        headStyles: {
          fontSize: 5.7,
        },

        margin: {
          left: 7,
          right: 7,
        },
      }
    );

    const finalY =
      doc.lastAutoTable
        ?.finalY
        ? doc.lastAutoTable
            .finalY + 8
        : 44;

    doc.setFontSize(8);

    doc.text(
      `Total Fees: ${formatPdfCurrency(
        summary.totalCourseFees
      )}`,
      10,
      finalY
    );

    doc.text(
      `Total Paid: ${formatPdfCurrency(
        summary.totalPaidAmount
      )}`,
      90,
      finalY
    );

    doc.text(
      `Total Remaining: ${formatPdfCurrency(
        summary.totalRemainingAmount
      )}`,
      165,
      finalY
    );

    doc.save(
      `batch-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Data
  |--------------------------------------------------------------------------
  */

  const summary =
    report.summary || {};

  const batches =
    report.batches || [];

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="batch-reports-page">

      {/* HEADER */}

     
       <div class="page-header"><div><h1>Batch Reports</h1></div>
             <div className="student-report-actions">
              
      
      <button
            type="button"
           className="themebtn exceldownload"
            onClick={
              exportExcel
            }
            disabled={
              !batches.length
            }
          >
           <RiFileExcel2Line />
                  Excel
          </button>

          <button
            type="button"
           className="themebtn pdfdownload "
            onClick={
              exportPDF
            }
            disabled={
              !batches.length
            }
          >
             <FaFilePdf />
                  PDF
          </button>

             
      
               
              </div>
            </div>


      {/* ERROR */}

      {error && (
        <div className="batch-report-error">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="batch-report-summary">

 <div className="dashboard-stat-card card-success">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-success">
           <FaClipboardList />
 
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title"> Total Batches </span>
             
               <strong class="stat-card-value">
            {Number(
              summary.totalBatches ||
                0
            )}
          </strong>
            </div>
         
        </div>

         <div className="dashboard-stat-card card-purple">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-purple">
           <FaUserFriends />

           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title"> Total Students</span>
             
               <strong class="stat-card-value">
             {Number(
              summary.totalStudents ||
                0
            )}
          </strong>
            </div>
         
        </div>

         <div className="dashboard-stat-card card-bluewarning">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-bluewarning">
            <GiOfficeChair />

           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">  Total Seats</span>
             
               <strong class="stat-card-value">
             {Number(
              summary.totalCapacity ||
                0
            )}
          </strong>
            </div>
         
        </div>

      
       <div className="dashboard-stat-card card-danger">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-danger">
            <GiOfficeChair />

           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">   Available Seats</span>
             
               <strong class="stat-card-value">
            {Number(
              summary.totalAvailableSeats ||
                0
            )}
          </strong>
            </div>
         
        </div>

      </div>

      {/* FILTERS */}

      <div className="common-card-filters">

        <div className="input-search">

          <label>
            Search Batch
          </label>

          <input
            type="text"
            name="search"
            value={
              filters.search
            }
            onChange={
              handleChange
            }
            placeholder="Search batch..."
          />

             <FiSearch />
        </div>

        <div className="input-search">

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

        <div className="input-search">

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

            <option value="Upcoming">
              Upcoming
            </option>

            <option value="Ongoing">
              Ongoing
            </option>

            <option value="Closed">
              Closed
            </option>
          </select>

        </div>

        <div className="student-filter-actions">

          <button
            type="button"
            className="themebtn"
            onClick={
              handleApply
            }
            disabled={
              loading
            }
          >
            Apply Filter
          </button>

          <button
            type="button"
            className="themebtn themebtnline"
            onClick={
              handleReset
            }
          >
            < FiRefreshCw />
            Reset
          </button>

        </div>

      </div>

      {/* TABLE */}

      <div className="common-card">
            <div className="common-table-wrapper">
              <table className="common-table">

                <thead>
                  <tr>

                    {/* <th>
                      S.No
                    </th> */}

                    <th>
                      Batch
                    </th>

                  

                    <th>
                     Batch Type
                    </th>

                    <th>
                      Max Seats
                    </th>

                   

                    <th>
                      Available
                    </th>

                    

                    <th>
                      Students
                    </th>

                    <th>
                      Course Fees
                    </th>

                    <th>
                      Paid
                    </th>

                    <th>
                      Remaining
                    </th>

                    <th>
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td colSpan="17">
                        Loading batch
                        report...
                      </td>
                    </tr>
                  ) : !batches.length ? (
                    <tr>
                      <td colSpan="17">
                        No batch records
                        found.
                      </td>
                    </tr>
                  ) : (
                    batches.map(
                      (
                        item,
                        index
                      ) => {
                        const batch =
                          item.batch ||
                          {};

                        const course =
                          batch.course_id ||
                          {};

                        return (
                          <tr
                            key={
                              batch._id ||
                              index
                            }
                          >

                            {/* <td>
                              {index + 1}
                            </td> */}

                            <td className="batch-name-cell">

                              <strong>
                                {
                                  batch.batch_name ||
                                  "-"
                                }
                              </strong>
                               {
                                course.courseTitle ||
                                "-"
                              }
         
                               
                              {/* <span>
                                ID:{" "}
                                {
                                  batch._id
                                    ? String(
                                        batch._id
                                      ).slice(
                                        -6
                                      )
                                    : "-"
                                }
                              </span> */}

                            </td>

                           

                            <td>
                                <span className={`course-type ${course.courseType ? course.courseType.toLowerCase().replace(/\s+/g, "-") : "default"}`}> {
                                course.courseType ||
                                "-"
                              }</span>
                            </td>

                            <td>
                              {
                                Number(
                                  item.maxSeats ||
                                    0
                                )
                              }
                            </td>

                         

                            <td>
                              {
                                Number(
                                  item.availableSeats ||
                                    0
                                )
                              }
                            </td>

                         

                            <td>
                              {
                                Number(
                                  item.totalStudents ||
                                    0
                                )
                              }
                            </td>

                            <td>
                            <span className="tag-purple">  {formatCurrency(
                                item.totalCourseFees
                              )}</span>
                            </td>

                            <td>
                              <span className="tag-success">{formatCurrency(
                                item.totalPaidAmount
                              )}</span>
                            </td>

                            <td>
                              <span className="tag-danger">{formatCurrency(
                                item.totalRemainingAmount
                              )}</span>
                            </td>

                            <td>

                              <span
                                className={`batch-status-badge ${String(
                                  batch.status ||
                                    ""
                                )
                                  .toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )}`}
                              >
                                {
                                  batch.status ||
                                  "-"
                                }
                              </span>

                            </td>

                          </tr>
                        );
                      }
                    )
                  )}

                </tbody>

              </table>
            </div>

      </div>

    </div>
  );
};

export default BatchReports;