import {
  useEffect,
  useState,
} from "react";

import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiExternalLink,
} from "react-icons/fi";
import { FaBookOpen } from "react-icons/fa6";


import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getCourseReport,
} from "../../../services/courseReportService";

import {
  getAssetUrl,
} from "../../../utils/assetUrl";

import "../../../styles/CourseReports.css";
import { RiFileExcel2Line } from "react-icons/ri";
import { FaFilePdf, FaUserFriends } from "react-icons/fa";
import { MdCurrencyRupee, MdDateRange } from "react-icons/md";
import { IoIosCall } from "react-icons/io";

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
  const amount =
    Number(value || 0);

  return `Rs. ${amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatDuration = (
  duration,
  durationUnit
) => {
  if (
    duration === null ||
    duration === undefined ||
    duration === ""
  ) {
    return "-";
  }

  return `${duration} ${
    durationUnit || ""
  }`.trim();
};

const yesNo = (value) =>
  value ? "Yes" : "No";

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

const CourseReports = () => {
  const [filters, setFilters] =
    useState({
      course_search: "",
      course_status: "",
      course_type: "",
      course_category: "",
    });

  const [report, setReport] =
    useState({
      summary: {},
      courses: [],
    });

  const [filterOptions, setFilterOptions] = useState({
    courseTypes: [],
    categories: [],
  });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Report
  |--------------------------------------------------------------------------
  */

  const loadReport = async (
    customFilters = filters
  ) => {
    try {
      setLoading(true);

      setError("");

      const params = {};

      if (
        customFilters.course_search?.trim()
      ) {
        params.course_search =
          customFilters.course_search.trim();
      }

      if (
        customFilters.course_status
      ) {
        params.course_status =
          customFilters.course_status;
      }

      if (
        customFilters.course_type?.trim()
      ) {
        params.course_type =
          customFilters.course_type.trim();
      }

      if (
        customFilters.course_category?.trim()
      ) {
        params.course_category =
          customFilters.course_category.trim();
      }

      const response =
        await getCourseReport(
          params
        );

      const data =
        getResponseData(response);

      if (data.filterOptions) {
        setFilterOptions({
          courseTypes: Array.isArray(data.filterOptions.courseTypes)
            ? data.filterOptions.courseTypes
            : [],
          categories: Array.isArray(data.filterOptions.categories)
            ? data.filterOptions.categories
            : [],
        });
      }

      setReport({
        summary:
          data.summary || {},

        courses:
          Array.isArray(
            data.courses
          )
            ? data.courses
            : [],
      });
    } catch (err) {
      console.error(
        "Course report error:",
        err
      );

      setError(
        err?.response?.data
          ?.message ||
          "Unable to load course report."
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
      course_search: "",
      course_status: "",
      course_type: "",
      course_category: "",
    };

    setFilters(resetFilters);

    loadReport(resetFilters);
  };

  /*
  |--------------------------------------------------------------------------
  | Excel
  |--------------------------------------------------------------------------
  */

  const exportExcel = () => {
    const courses =
      report.courses || [];

    if (!courses.length) {
      return;
    }

    const summary =
      report.summary || {};

    const rows =
      courses.map(
        (
          item,
          index
        ) => {
          const course =
            item.course || {};

          return {
            "S.No":
              index + 1,

            Course:
              course.courseTitle ||
              "-",

            "Course Type":
              course.courseType ||
              "-",

            "Certificate / Diploma":
              course.certificateDiploma ||
              "-",

            Category:
              course.courseCategory ||
              "-",

            "MRP":
              Number(
                course.mrp || 0
              ),

            Price:
              Number(
                course.price || 0
              ),

            "Display Order":
              Number(
                course.displayOrder ||
                  0
              ),

            Duration:
              formatDuration(
                course.duration,
                course.durationUnit
              ),

            "Duration Unit":
              course.durationUnit ||
              "-",

            "Course Image":
              course.courseImage ||
              "-",

            "Preview Video":
              course.previewVideo ||
              "-",

            "Total Lectures":
              Number(
                course.totalLectures ||
                  0
              ),

            "Practical Marks":
              Number(
                course.practicalMarks ||
                  0
              ),

            "Objective Marks":
              Number(
                course.objectiveMarks ||
                  0
              ),

            "Certificate Subject":
              course.certificateSubject ||
              "-",

            Popular:
              yesNo(
                course.popular
              ),

            Recommended:
              yesNo(
                course.recommended
              ),

            "MRP Visible":
              yesNo(
                course.mrpVisible
              ),

            "Hide Exam Result":
              yesNo(
                course.hideExamResult
              ),

            Status:
              course.status ||
              "-",

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

            Description:
              course.description ||
              "",

            Syllabus:
              course.syllabus ||
              "",

            Eligibility:
              course.eligibility ||
              "",
          };
        }
      );

    const summaryRows = [
      {
        "Report Item":
          "Total Courses",

        Value:
          Number(
            summary.totalCourses ||
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
          "Total Paid Amount",

        Value:
          Number(
            summary.totalPaidAmount ||
              0
          ),
      },

      {
        "Report Item":
          "Total Remaining Amount",

        Value:
          Number(
            summary.totalRemainingAmount ||
              0
          ),
      },
    ];

    const workbook =
      XLSX.utils.book_new();

    const courseSheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    XLSX.utils.book_append_sheet(
      workbook,
      courseSheet,
      "Course Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    const filename =
      `course-report-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

    XLSX.writeFile(
      workbook,
      filename
    );
  };

  /*
  |--------------------------------------------------------------------------
  | PDF
  |--------------------------------------------------------------------------
  */

  const exportPDF = () => {
    const courses =
      report.courses || [];

    if (!courses.length) {
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
      "Course Report",
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

    let currentY = 30;

    doc.setFontSize(9);

    doc.text(
      `Courses: ${Number(
        summary.totalCourses || 0
      )}`,
      14,
      currentY
    );

    doc.text(
      `Students: ${Number(
        summary.totalStudents || 0
      )}`,
      55,
      currentY
    );

    doc.text(
      `Admissions: ${Number(
        summary.totalAdmissions || 0
      )}`,
      100,
      currentY
    );

    doc.text(
      `Active: ${Number(
        summary.activeAdmissions || 0
      )}`,
      155,
      currentY
    );

    doc.text(
      `Remaining: ${formatPdfCurrency(
        summary.totalRemainingAmount
      )}`,
      200,
      currentY
    );

    currentY += 7;

    autoTable(
      doc,
      {
        startY:
          currentY,

        head: [
          [
            "S.No",
            "Course",
            "Type",
            "Certificate",
            "Category",
            "MRP",
            "Price",
            "Duration",
            "Lectures",
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
          courses.map(
            (
              item,
              index
            ) => {
              const course =
                item.course ||
                {};

              return [
                index + 1,

                course.courseTitle ||
                  "-",

                course.courseType ||
                  "-",

                course.certificateDiploma ||
                  "-",

                course.courseCategory ||
                  "-",

                formatPdfCurrency(
                  course.mrp
                ),

                formatPdfCurrency(
                  course.price
                ),

                formatDuration(
                  course.duration,
                  course.durationUnit
                ),

                Number(
                  course.totalLectures ||
                    0
                ),

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

                course.status ||
                  "-",
              ];
            }
          ),

        styles: {
          fontSize: 5.5,
          cellPadding: 1.5,
        },

        headStyles: {
          fontSize: 5.5,
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
        : currentY + 8;

    doc.setFontSize(8);

    doc.text(
      `Total Course Fees: ${formatPdfCurrency(
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
      160,
      finalY
    );

    const filename =
      `course-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

    doc.save(filename);
  };

  const summary =
    report.summary || {};

  const courses =
    report.courses || [];

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="course-reports-page">

      {/* HEADER */}

      <div className="page-header">

        <div>
          <h1>
            Course Reports
          </h1>

         
        </div>

        <div className="admission-report-actions">

       

          <button
            type="button"
            className="themebtn exceldownload"
            onClick={
              exportExcel
            }
            disabled={
              !courses.length
            }
          >
             <RiFileExcel2Line />

            Excel
          </button>

          <button
            type="button"
            className="themebtn pdfdownload"
            onClick={
              exportPDF
            }
            disabled={
              !courses.length
            }
          >
            <FaFilePdf />

            PDF
          </button>

        </div>

      </div>


      {/* ERROR */}

      {error && (
        <div className="course-report-error">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="course-report-summary">

        <div className="dashboard-stat-card card-purple">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-purple">
           <FaBookOpen /> 
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">Total Courses</span>
             
               <strong class="stat-card-value">
            {Number(
              summary.totalCourses ||
                0
            )}
          </strong>
            </div>
         
        </div>


  <div className="dashboard-stat-card card-success">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-success">
           <FaBookOpen /> 
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">Completed Course </span>
             
               <strong class="stat-card-value">
            {Number(
              summary.completedAdmissions ||
                0
            )}
          </strong>
            </div>
         
        </div>
       

      

       
 <div className="dashboard-stat-card card-bluewarning">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-bluewarning">
          <MdCurrencyRupee />
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">Total Course Fees </span>
             
               <strong class="stat-card-value">
           {formatCurrency(
              summary.totalCourseFees
            )}
          </strong>
            </div>
         
        </div>

         <div className="dashboard-stat-card card-danger">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-danger">
          <MdCurrencyRupee />
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title"> Remaining Fees </span>
             
               <strong class="stat-card-value">
           {formatCurrency(
              summary.totalRemainingAmount
            )}
          </strong>
            </div>
         
        </div>

       

     

      

      </div>

      {/* FILTERS */}

      <div className="common-card-filters">

        <div className="input-search noicon">

          <label>
            Search Course
          </label>

          <input
            type="text"
            name="course_search"
            value={
              filters.course_search
            }
            onChange={
              handleChange
            }
            placeholder="Search course..."
          />

        </div>

        <div className="input-search">

          <label>
            Status
          </label>

          <select
            name="course_status"
            value={
              filters.course_status
            }
            onChange={
              handleChange
            }
          >
            <option value="">
              All Status
            </option>

            <option value="Published">
              Published
            </option>

            <option value="Draft">
              Draft
            </option>

            <option value="Archived">
              Archived
            </option>
          </select>

        </div>

        {/* <div className="input-search noicon">

          <label>
            Course Type
          </label>

          <input
            type="text"
            name="course_type"
            value={
              filters.course_type
            }
            onChange={
              handleChange
            }
            placeholder="Course type..."
          />

        </div> */}

        <div className="input-search">
          <label htmlFor="course-report-type">
            Course Type
          </label>

          <select
            id="course-report-type"
            name="course_type"
            value={filters.course_type}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">All Course Types</option>

            {filterOptions.courseTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* <div className="input-search noicon">

          <label>
            Category
          </label>

          <input
            type="text"
            name="course_category"
            value={
              filters.course_category
            }
            onChange={
              handleChange
            }
            placeholder="Category..."
          />

        </div> */}

        <div className="input-search">
          <label htmlFor="course-report-category">
            Category
          </label>

          <select
            id="course-report-category"
            name="course_category"
            value={filters.course_category}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="">All Categories</option>

            {filterOptions.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="student-filter-actions">

          <button
            type="button"
            className="themebtn"
            onClick={
              handleApply
            }
            disabled={loading}
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
            <FiRefreshCw />  Reset
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
                      #
                    </th> */}

                    <th>
                      Image
                    </th>

                    <th>
                      Course
                    </th>

                  

                  

                    <th>
                      Category
                    </th>

                    <th>
                      MRP
                    </th>

                    <th>
                      Price
                    </th>

                    <th>
                      Duration
                    </th>

                    <th>
                      Lectures
                    </th>

                    {/* <th>
                      Practical
                    </th> */}

                    {/* <th>
                      Objective
                    </th> */}

                    {/* <th>
                      Students
                    </th> */}

                    {/* <th>
                      Admissions
                    </th> */}

                    {/* <th>
                      Active
                    </th> */}

                    {/* <th>
                      Completed
                    </th> */}

                    {/* <th>
                      Dropped
                    </th> */}

                    {/* <th>
                      Course Fees
                    </th>

                    <th>
                      Paid
                    </th>

                    <th>
                      Remaining
                    </th> */}

                    <th>
                      Popular
                    </th>

                    <th>
                      Recommended
                    </th>

                    {/* <th>
                      MRP Visible
                    </th>

                    <th>
                      Exam Result
                    </th> */}

                    <th>
                      Status
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {loading ? (
                    <tr>
                      <td colSpan="25">
                        Loading course
                        report...
                      </td>
                    </tr>
                  ) : !courses.length ? (
                    <tr>
                      <td colSpan="25">
                        No course records
                        found.
                      </td>
                    </tr>
                  ) : (
                    courses.map(
                      (
                        item,
                        index
                      ) => {
                        const course =
                          item.course ||
                          {};

                        return (
                          <tr
                            key={
                              course._id ||
                              index
                            }
                          >

                            {/* # */}

                            {/* <td>
                              {index + 1}
                            </td> */}

                            {/* IMAGE */}

                            <td>

                              {course.courseImage ? (
                                <img
                                  className="student-avatar"
                                  src={getAssetUrl(
                                    course.courseImage
                                  )}
                                  alt={
                                    course.courseTitle ||
                                    "Course"
                                  }
                                  onError={(
                                    event
                                  ) => {
                                    event.currentTarget.style.display =
                                      "none";
                                  }}
                                />
                              ) : (
                                <div className=".student-avatar-placeholder">
                                  —
                                </div>
                              )}

                            </td>

                            {/* COURSE */}

                            <td className="course-name-cell">

                              <strong>
                                {course.courseTitle ||
                                  "-"}
                              </strong>
                                  <div>

                             <span className={` ${course.courseType || ""}`}>
  {course.courseType || "-"}
</span>
                                </div>
                               

                              {/* <span>
                                Order:{" "}
                                {Number(
                                  course.displayOrder ||
                                    0
                                )}
                              </span> */}

                            </td>

                            {/* TYPE */}

                         

                            {/* CERTIFICATE */}

                          

                            {/* CATEGORY */}

                            <td>
                              {course.courseCategory ||
                                "-"}
                            </td>

                            {/* MRP */}

                            <td>
                             

                              <span className="tag-purple">
                                {formatCurrency(
                                course.mrp
                              )}
                              </span>
                            </td>

                            {/* PRICE */}

                            <td>
                              <span className="tag-success">
 {formatCurrency(
                                course.price
                              )}
                              </span>
                             
                            </td>

                            {/* DURATION */}

                            <td>
                              <div className="contact-details">
                                <div className="contact-li">
                                 <MdDateRange />
                                  <span>{formatDuration(
                                course.duration,
                                course.durationUnit
                              )}</span>
                                </div>
                              </div>
                              
                            </td>

                            {/* LECTURES */}

                            <td>
                              {Number(
                                course.totalLectures ||
                                  0
                              )}
                            </td>

                            {/* PRACTICAL */}

                            {/* <td>
                              {Number(
                                course.practicalMarks ||
                                  0
                              )}
                            </td> */}

                            {/* OBJECTIVE */}

                            {/* <td>
                              {Number(
                                course.objectiveMarks ||
                                  0
                              )}
                            </td> */}

                            {/* STUDENTS */}

                            {/* <td>
                              {Number(
                                item.totalStudents ||
                                  0
                              )}
                            </td> */}

                            {/* ADMISSIONS */}

                            {/* <td>
                              {Number(
                                item.totalAdmissions ||
                                  0
                              )}
                            </td> */}

                            {/* ACTIVE */}

                            {/* <td>
                              {Number(
                                item.activeAdmissions ||
                                  0
                              )}
                            </td> */}

                            {/* COMPLETED */}

                            {/* <td>
                              {Number(
                                item.completedAdmissions ||
                                  0
                              )}
                            </td> */}

                            {/* DROPPED */}

                            {/* <td>
                              {Number(
                                item.droppedAdmissions ||
                                  0
                              )}
                            </td> */}

                            {/* COURSE FEES */}

                            {/* <td>
                             
                              <span className=" tag-purple"> {formatCurrency(
                                item.totalCourseFees
                              )}</span>
                             
                            </td> */}

                            {/* PAID */}

                            {/* <td>
                             
                               <span className="tag-success">
                               {formatCurrency(
                                item.totalPaidAmount
                              )}
                             </span>

                            </td> */}

                            {/* REMAINING */}

                            {/* <td>
                             <span className="tag-danger">
                               {formatCurrency(
                                item.totalRemainingAmount
                              )}
                             </span>
                            </td> */}

                            {/* POPULAR */}

                            <td>
                              <span
                                className={
                                  course.popular
                                    ? "report-badge yes"
                                    : "report-badge no"
                                }
                              >
                                {course.popular
                                  ? "Yes"
                                  : "No"}
                              </span>
                            </td>

                            {/* RECOMMENDED */}

                            <td>
                              <span
                                className={
                                  course.recommended
                                    ? "report-badge yes"
                                    : "report-badge no"
                                }
                              >
                                {course.recommended
                                  ? "Yes"
                                  : "No"}
                              </span>
                            </td>

                            {/* MRP VISIBLE */}

                            {/* <td>
                              <span
                                className={
                                  course.mrpVisible
                                    ? "report-badge yes"
                                    : "report-badge no"
                                }
                              >
                                {course.mrpVisible
                                  ? "Yes"
                                  : "No"}
                              </span>
                            </td> */}

                            {/* EXAM RESULT */}

                            {/* <td>
                              <span
                                className={
                                  course.hideExamResult
                                    ? "report-badge no"
                                    : "report-badge yes"
                                }
                              >
                                {course.hideExamResult
                                  ? "Hidden"
                                  : "Visible"}
                              </span>
                            </td> */}

                            {/* STATUS */}

                            <td>
                              <span
                                className={`course-status-badge ${String(
                                  course.status ||
                                    ""
                                )
                                  .toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )}`}
                              >
                                {course.status ||
                                  "-"}
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

export default CourseReports;