import {
  FiUsers,
  FiClipboard,
  FiBookOpen,
  FiLayers,
  FiDollarSign,
  FiCreditCard,
  FiAlertCircle,
  FiArrowRight,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import "../../../styles/Reports.css";

const Reports = () => {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Student Reports",
      description:
        "View student records, status, course and batch information.",
      icon: FiUsers,
      path: "/admin/reports/students",
      status: "Completed",
    },
    {
      title: "Admission Reports",
      description:
        "Analyze admissions by date, course, batch and status.",
      icon: FiClipboard,
      path: "/admin/reports/admissions",
      status: "Completed",
    },
    {
      title: "Course Reports",
      description:
        "View course-wise student and admission information.",
      icon: FiBookOpen,
      path: "/admin/reports/courses",
      status: "Completed",
    },
    {
      title: "Batch Reports",
      description:
        "View batch capacity, seats and student allocation.",
      icon: FiLayers,
      path: "/admin/reports/batches",
      status: "Next",
    },
    {
      title: "Fee Reports",
      description:
        "Analyze total fees, paid fees, pending fees and collections.",
      icon: FiDollarSign,
      path: "/admin/reports/fees",
      status: "Next",
    },
    {
      title: "Payment Reports",
      description:
        "View payment transactions with filters and PDF/Excel export.",
      icon: FiCreditCard,
      path: "/admin/reports/payments",
      status: "Completed",
    },
    {
      title: "Pending Fee Reports",
      description:
        "Identify students with outstanding fee balances.",
      icon: FiAlertCircle,
      path: "/admin/reports/pending-fees",
      status: "Next",
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
      <div className="reports-page-header">
        <div>
          <h1>Reports</h1>

          <p>
            View and analyze academic, admission and financial
            reports.
          </p>
        </div>
      </div>

      <div className="reports-summary">
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
      </div>

      <div className="reports-grid">
        {reports.map((report) => {
          const Icon = report.icon;
          const completed =
            report.status === "Completed";

          return (
            <div
              key={report.title}
              className={`report-module-card ${
                completed ? "completed" : "upcoming"
              }`}
            >
              <div className="report-card-top">
                <div className="report-card-icon">
                  <Icon />
                </div>

                <span
                  className={`report-card-status ${
                    completed
                      ? "completed"
                      : "upcoming"
                  }`}
                >
                  {completed
                    ? "Completed"
                    : "Coming Next"}
                </span>
              </div>

              <div className="report-card-content">
                <h2>{report.title}</h2>

                <p>{report.description}</p>
              </div>

              <button
                type="button"
                className={`report-card-button ${
                  !completed ? "disabled" : ""
                }`}
                onClick={() =>
                  handleReportClick(report)
                }
                disabled={!completed}
              >
                {completed
                  ? "Open Report"
                  : "Coming Next"}

                <FiArrowRight />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reports;