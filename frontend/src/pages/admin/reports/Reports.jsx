import {
  FiUsers,
  FiClipboard,
  FiBookOpen,
  FiLayers,
  FiDollarSign,
  FiCreditCard,
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
} from "react-icons/fi";

import { useLocation, useNavigate } from "react-router-dom";

import "../../../styles/Reports.css";

const Reports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const reports = [
    {
      title: "Student Reports",
      description:
        "View student records, status, course and batch information.",
      icon: FiUsers,
      // path: "/admin/reports/students",
      path: `${basePath}/reports/students`,
      status: "Completed",
       className: "studentreport"
    },
    {
      title: "Admission Reports",
      description:
        "Analyze admissions by date, course, batch and status.",
      icon: FiClipboard,
      // path: "/admin/reports/admissions",
      path: `${basePath}/reports/admissions`,
      status: "Completed",
      className: "admision"
    },
    {
      title: "Course Reports",
      description:
        "View course-wise student and admission information.",
      icon: FiBookOpen,
      // path: "/admin/reports/courses",
      path: `${basePath}/reports/courses`,
      status: "Completed",
      className: "batch"
    },
    {
      title: "Batch Reports",
      description:
        "View batch capacity, seats and student allocation.",
      icon: FiLayers,
      // path: "/admin/reports/batches",
      path: `${basePath}/reports/batches`,
      status: "Completed",
      className: "batch"
    },
    {
      title: "Fee Reports",
      description:
        "Analyze total fees, paid fees, pending fees and collections.",
      icon: FiDollarSign,
      // path: "/admin/reports/fees",
      path: `${basePath}/reports/fees`,
      status: "Completed",
      className: "fees"
    },
    {
      title: "Payment Reports",
      description:
        "View payment transactions with filters and PDF/Excel export.",
      icon: FiCreditCard,
      // path: "/admin/reports/payments",
      path: `${basePath}/reports/payments`,
      status: "Completed",
      className: "payment"
    },
    {
      title: "Pending Fee Reports",
      description:
        "Identify students with outstanding fee balances.",
      icon: FiAlertCircle,
      // path: "/admin/reports/pending-fees",
      path: `${basePath}/reports/pending-fees`,
      status: "Completed",
      className: "pendingfess"
    },

    {
      title: "Expense Reports",
      description:
        "Analyze institute expenses, paid and pending amounts, and category-wise spending.",
      icon: FiDollarSign,
      // path: "/admin/reports/expenses",
      path: `${basePath}/reports/expenses`,
      status: "Completed",
      className: "exprences"
    },

    {
      title: "Attendance Reports",
      description:
        "Analyze student attendance, Present, Absent, Leave, Late and attendance percentages.",
      icon: FiCalendar,
      // path: "/admin/reports/attendance",
      path: `${basePath}/reports/attendance`,
      status: "Completed",
      className: "aatendance"
    },

  ];

  const handleReportClick = (report) => {
    if (report.status === "Completed") {
      // window.location.href = report.path;
      navigate(report.path);
    }
  };

  return (
    <div className="reports-page">
     
      <div className="page-header">
        <div>
          <h1>Reports</h1>
        </div>
      </div>

      {/* <div className="reports-summary">
        <div className="reports-summary-card">
          <span>Total Reports</span>
          <strong>{reports.length}</strong>
        </div>

        <div className="reports-summary-card">
          <span>Completed</span>
          <strong>
            {
              reports.filter(
                (report) => report.status === "Completed"
              ).length
            }
          </strong>
        </div>

        <div className="reports-summary-card">
          <span>Remaining</span>
          <strong>
            {
              reports.filter(
                (report) => report.status !== "Completed"
              ).length
            }
          </strong>
        </div>
      </div> */}

      <div className="reports-grid">
        {reports.map((report) => {
          const Icon = report.icon;
          const completed =
            report.status === "Completed";

          return (
            <div
              key={report.title}
              className={`common-card reportcard ${report.className || ""}`}
            >
              <div className="report-card-top">
                {/* <div className="report-card-icon">
                  <Icon />
                </div> */}

                {/* <span
                  className={`report-card-status ${
                    completed
                      ? "completed"
                      : "upcoming"
                  }`}
                >
                  {completed
                    ? "Completed"
                    : "Coming Next"}
                </span> */}
              </div>

              <div className="report-card-content">
                <h2>{report.title}</h2>

                <p>{report.description}</p>
                  <button
                type="button"
                className={`themebtn ${
                  !completed ? "disabled" : ""
                }`}
                onClick={() =>
                  handleReportClick(report)
                }
                disabled={!completed}
              >
                {completed
                  ? "View Report"
                  : "Coming Next"}

              </button>
              </div>

            
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;