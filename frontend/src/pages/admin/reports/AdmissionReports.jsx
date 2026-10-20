import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { IoIosCall } from "react-icons/io";

import { MdOutgoingMail } from "react-icons/md";
import { MdDateRange } from "react-icons/md";
import { FaFilePdf, FaUserFriends } from "react-icons/fa";
import { RiFileExcel2Line } from "react-icons/ri";
import { MdCurrencyRupee } from "react-icons/md";

import * as XLSX from "xlsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getAdmissionReport,
  getAdmissionReportFilters,
} from "../../../services/admissionReportService";

import "../../../styles/AdmissionReports.css";

const getResponseData = (response) => {
  return (
    response?.data?.data ??
    response?.data ??
    {}
  );
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN");
};

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatPdfCurrency = (value) => {
  return `Rs. ${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const AdmissionReports = () => {
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
      admissions: [],
    });

  const [loading, setLoading] =
    useState(false);

  const [filtersLoading, setFiltersLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadFilters = async () => {
    try {
      setFiltersLoading(true);

      const response =
        await getAdmissionReportFilters();

      const data =
        getResponseData(response);

      setFilterData({
        courses:
          Array.isArray(data.courses)
            ? data.courses
            : [],

        batches:
          Array.isArray(data.batches)
            ? data.batches
            : [],
      });
    } catch (error) {
      console.error(
        "Admission report filters error:",
        error
      );
    } finally {
      setFiltersLoading(false);
    }
  };

  const loadReport = async (
    customFilters = filters
  ) => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      Object.entries(
        customFilters
      ).forEach(
        ([key, value]) => {
          if (value) {
            params[key] = value;
          }
        }
      );

      const response =
        await getAdmissionReport(
          params
        );

      const data =
        getResponseData(response);

      setReport({
        summary:
          data.summary || {},

        admissions:
          Array.isArray(
            data.admissions
          )
            ? data.admissions
            : [],
      });
    } catch (error) {
      console.error(
        "Admission report error:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Unable to load admission report."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
    loadReport();
  }, []);

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

  const handleApply = () => {
    loadReport(filters);
  };

  const handleReset = () => {
    const resetFilters = {
      date_from: "",
      date_to: "",
      course_id: "",
      batch_id: "",
      status: "",
    };

    setFilters(resetFilters);

    loadReport(resetFilters);
  };

  const availableBatches =
    useMemo(() => {
      if (!filters.course_id) {
        return filterData.batches;
      }

      return filterData.batches.filter(
        (batch) =>
          String(
            batch.course_id?._id ||
              batch.course_id
          ) ===
          String(filters.course_id)
      );
    }, [
      filters.course_id,
      filterData.batches,
    ]);

  const summary =
    report.summary || {};

  const admissions =
    report.admissions || [];

  const exportExcel = () => {
    if (!admissions.length) {
      alert(
        "No admission records available to export."
      );
      return;
    }

    const rows =
      admissions.map(
        (admission, index) => ({
          "S.No": index + 1,

          "Student Name":
            admission.student?.name ||
            "-",

          "Roll No":
            admission.student?.rollNo ||
            "-",

          Mobile:
            admission.student?.mobile ||
            "-",

          Course:
            admission.course
              ?.courseTitle || "-",

          Batch:
            admission.batch
              ?.batch_name || "-",

          "Course Fee":
            Number(
              admission.courseFee || 0
            ),

          "Discount Type":
            admission.discountType ||
            "-",

          "Discount Value":
            Number(
              admission.discountValue ||
                0
            ),

          "GST Amount":
            Number(
              admission.gstAmount || 0
            ),

          "Final Amount":
            Number(
              admission.finalAmount || 0
            ),

          "Admission Fee":
            Number(
              admission.admissionFee || 0
            ),

          Paid:
            Number(
              admission.paidAmount || 0
            ),

          Remaining:
            Number(
              admission.remainingAmount ||
                0
            ),

          "Admission Date":
            formatDate(
              admission.admissionDate
            ),

          "Referral Source":
            admission.referralSource ||
            "-",

          Status:
            admission.status || "-",
        })
      );

    const summaryRows = [
      {
        Metric:
          "Total Admissions",
        Value:
          Number(
            summary.totalAdmissions ||
              0
          ),
      },
      {
        Metric:
          "Active Admissions",
        Value:
          Number(
            summary.activeAdmissions ||
              0
          ),
      },
      {
        Metric:
          "Completed Admissions",
        Value:
          Number(
            summary.completedAdmissions ||
              0
          ),
      },
      {
        Metric:
          "Dropped Admissions",
        Value:
          Number(
            summary.droppedAdmissions ||
              0
          ),
      },
      {
        Metric:
          "Total Course Fees",
        Value:
          Number(
            summary.totalCourseFees ||
              0
          ),
      },
      {
        Metric:
          "Total Final Amount",
        Value:
          Number(
            summary.totalFinalAmount ||
              0
          ),
      },
      {
        Metric:
          "Total Admission Fees",
        Value:
          Number(
            summary.totalAdmissionFees ||
              0
          ),
      },
      {
        Metric:
          "Total Paid Amount",
        Value:
          Number(
            summary.totalPaidAmount ||
              0
          ),
      },
      {
        Metric:
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

    const reportSheet =
      XLSX.utils.json_to_sheet(
        rows
      );

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryRows
      );

    reportSheet["!freeze"] = {
      xSplit: 0,
      ySplit: 1,
    };

    reportSheet["!autofilter"] = {
      ref: reportSheet["!ref"],
    };

    reportSheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 30 },
      { wch: 25 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
    ];

    summarySheet["!cols"] = [
      { wch: 32 },
      { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      reportSheet,
      "Admission Report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "Summary"
    );

    XLSX.writeFile(
      workbook,
      `admission-report-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  const exportPDF = () => {
    if (!admissions.length) {
      alert(
        "No admission records available to export."
      );
      return;
    }

    const doc = new jsPDF({
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
      "Admission Report",
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
            String(item._id) ===
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
            String(item._id) ===
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
        `Status: ${filters.status}`
      );
    }

    if (appliedFilters.length) {
      doc.text(
        `Filters: ${appliedFilters.join(
          " | "
        )}`,
        14,
        currentY
      );

      currentY += 7;
    }

    doc.text(
      `Total Admissions: ${Number(
        summary.totalAdmissions || 0
      )}`,
      14,
      currentY
    );

    doc.text(
      `Active: ${Number(
        summary.activeAdmissions || 0
      )}`,
      75,
      currentY
    );

    doc.text(
      `Completed: ${Number(
        summary.completedAdmissions || 0
      )}`,
      125,
      currentY
    );

    doc.text(
      `Dropped: ${Number(
        summary.droppedAdmissions || 0
      )}`,
      195,
      currentY
    );

    currentY += 8;

    autoTable(doc, {
      startY: currentY,

      head: [
        [
          "S.No",
          "Student",
          "Roll No",
          "Course",
          "Batch",
          "Admission Date",
          "Course Fee",
          "Final",
          "Paid",
          "Remaining",
          "Status",
        ],
      ],

      body: admissions.map(
        (admission, index) => [
          index + 1,

          admission.student?.name ||
            "-",

          admission.student?.rollNo ||
            "-",

          admission.course
            ?.courseTitle || "-",

          admission.batch
            ?.batch_name || "-",

          formatDate(
            admission.admissionDate
          ),

          formatPdfCurrency(
            admission.courseFee
          ),

          formatPdfCurrency(
            admission.finalAmount
          ),

          formatPdfCurrency(
            admission.paidAmount
          ),

          formatPdfCurrency(
            admission.remainingAmount
          ),

          admission.status ||
            "-",
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

    const finalY =
      doc.lastAutoTable?.finalY ||
      currentY + 10;

    doc.setFontSize(8);

    doc.text(
      `Total Final Amount: ${formatPdfCurrency(
        summary.totalFinalAmount
      )}`,
      14,
      finalY + 8
    );

    doc.text(
      `Total Paid: ${formatPdfCurrency(
        summary.totalPaidAmount
      )}`,
      90,
      finalY + 8
    );

    doc.text(
      `Total Remaining: ${formatPdfCurrency(
        summary.totalRemainingAmount
      )}`,
      165,
      finalY + 8
    );

    doc.save(
      `admission-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="admission-reports-page">
      
  <div class="page-header"><div><h1> Admission Reports</h1></div>

   <div className="admission-report-actions">
        

          <button
            type="button"
            className="themebtn exceldownload"
            onClick={exportExcel}
            disabled={
              !admissions.length
            }
          >
            <RiFileExcel2Line />
            Excel
          </button>

          <button
            type="button"
            className="themebtn pdfdownload"
            onClick={exportPDF}
            disabled={
              !admissions.length
            }
          >
           <FaFilePdf />
            PDF
          </button>
        </div>

      
      </div>


      {error && (
        <div className="admission-report-error">
          {error}
        </div>
      )}

      <div className="admission-report-summary">
       
        <div className="dashboard-stat-card card-success">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-success">
           <FaUserFriends /> 
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">Total Admissions</span>
             
               <strong class="stat-card-value">
            {Number(
              summary.totalAdmissions ||
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
              <span class="stat-card-title">Active Admissions</span>
             
               <strong class="stat-card-value">
            {Number(
              summary.totalAdmissions ||
                0
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
              <span class="stat-card-title"> Remaining Fees</span>
             
               <strong class="stat-card-value">
            {formatCurrency(
              summary.totalRemainingAmount
            )}
          </strong>
            </div>
         
        </div>

 <div className="dashboard-stat-card card-success">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-success">
           <FaUserFriends /> 
           </div> 
           </div>

            <div className="stat-card-body">
              <span class="stat-card-title">Completed</span>
               <strong class="stat-card-value">
            {Number(
              summary.completedAdmissions ||
                0
            )}
          </strong>
            </div>
         
        </div>
       
      </div>

      <div className="common-card-filters">
        <div className="input-search noicon">
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

        <div className="input-search noicon">
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

       
         <div className="student-filter-actions" >
          <button className="themebtn"
            type="button"
            onClick={
              handleApply
            }
          >
          
            Apply Filter
          </button>

          <button className="themebtn themebtnline"
            type="button"
            onClick={
              handleReset
            }
          >
             <FiRefreshCw />
            Reset
          </button>
        </div>
      </div>

      <div className="common-card">
        {loading ? (
          <div className="admission-report-state">
            Loading admission report...
          </div>
        ) : admissions.length === 0 ? (
          <div className="admission-report-state">
            No admission records found.
          </div>
        ) : (
          <div className="common-table-wrapper">
          <table className="common-table">
            <thead>
              <tr>
                <th>
                  S.No
                </th>

                <th>
                  Student
                </th>

                <th>
                  Roll No
                </th>

                <th>
                  Course / Batch
                </th>

                <th>
                  Contact
                </th>

                <th>
                  Admission Date
                </th>

                <th>
                  Final Amount
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
              {admissions.map(
                (
                  admission,
                  index
                ) => (
                  <tr
                    key={
                      admission._id
                    }
                  >
                    <td>
                      {index + 1}
                    </td>

                    <td>
                      <div className="admission-report-student">

                        <div class="student-name-cell">
  <div class="student-avatar-wrapper">
    <img alt="Rahul Lodhi" class="student-avatar" src="http://localhost:5000/uploads/students/1791094170853-711uU2sdLaL-_SY741_.jpg" /></div><div><strong>{
                            admission
                              .student
                              ?.name ||
                            "-"
                          }</strong>father name<img alt="Student Signature" height="20px" class="student-signature" src="http://localhost:5000/uploads/students/1792320152276-images.png" /></div></div>

                       
                      </div>
                    </td>

                    <td>
                      <span className="student-roll">{
                        admission
                          .student
                          ?.rollNo ||
                        "-"
                      }</span>
                    </td>

                    <td>
                      {
                        admission
                          .course
                          ?.courseTitle ||
                        "-"
                      }

                      <br></br>

                          <span className="batchtag">
                           {
                        admission
                          .batch
                          ?.batch_name ||
                        "-"
                      }
                          </span>

                    </td>

                    <td>
                     
                        <div className="contact-details">
                     <div className="contact-li"> <IoIosCall />  <span> {
                            admission
                              .student
                              ?.mobile ||
                            "-"
                          }</span></div>
                    <div className="contact-li"> <MdOutgoingMail /> <span> {
                            admission
                              .student
                              ?.email ||
                            "-"
                          }</span></div>
                    </div>
                    </td>

                    <td>
                     

                            <div className="contact-details">
                                           <div className="contact-li"> <MdDateRange />  <span>  {formatDate(
                        admission.admissionDate
                      )}</span></div>
                                          </div>

                    </td>

                    <td>

<strong className="tag-purple"> {formatCurrency(
                        admission.finalAmount
                      )}</strong>

                     
                    </td>

                    <td>
                      <strong className="tag-success">
                      {formatCurrency(
                        admission.paidAmount
                      )}
                      </strong>
                      
                    </td>

                    <td>
                      <strong className="tag-danger">
                        {formatCurrency(
                          admission.remainingAmount
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`admission-report-status admission-report-status-${String(
                          admission.status
                        ).toLowerCase()}`}
                      >
                        {
                          admission.status
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

export default AdmissionReports;