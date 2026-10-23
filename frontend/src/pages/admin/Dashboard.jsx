
import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiUsers,
} from "react-icons/fi";
import { FaBookOpen, FaUserFriends } from "react-icons/fa";
import { IoWalletSharp } from "react-icons/io5";
import { GiExpense } from "react-icons/gi";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import StatCard from "../../components/dashboard/StatCard";
import FeeCollection from "../../components/dashboard/FeeCollection";
import RecentAdmissions from "../../components/dashboard/RecentAdmissions";
import TodaysClasses from "../../components/dashboard/TodaysClasses";
import PendingActions from "../../components/dashboard/PendingActions";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = () =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

const Dashboard = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        summaryResponse,
        admissionsResponse,
        feeResponse,
        pendingResponse,
      ] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/recent-admissions"),
        api.get("/dashboard/fee-summary"),
        api.get("/dashboard/pending-actions"),
      ]);

      setSummary(summaryResponse.data?.data || {});
      setAdmissions(admissionsResponse.data?.data || []);
      setFeeData(feeResponse.data?.data?.monthly || []);
      setPendingActions(pendingResponse.data?.data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load dashboard data. Please retry."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const statCards = useMemo(
    () => [
      {
        title: "Total Students",
        value: summary?.totalStudents ?? 0,
        icon: FaUserFriends,
        type: "success",
      },
      {
        title: "Active Courses",
        value: summary?.activeCourses ?? 0,
        icon: FaBookOpen,
        type: "purple",
      },
      {
        title: "Fees Collected (This Year)",
        value: formatCurrency(summary?.feesCollected),
        icon: IoWalletSharp,
        type: "success",
      },
      {
        title: "Total Expenses (This Year)",
        value: formatCurrency(summary?.totalExpenses),
        icon: GiExpense,
        type: "danger",
      },
      {
        title: "Admissions This Month",
        value: summary?.newAdmissions ?? 0,
        icon: FiClipboard,
        type: "bluewarning",
      },
      {
        title: "Outstanding Fees",
        value: formatCurrency(summary?.pendingFees),
        icon: FiDollarSign,
        type: "danger",
      },
    ],
    [summary]
  );

  const handleStudentSearch = (event) => {
    event.preventDefault();

    const query = studentSearch.trim();
    if (!query) return;

    // Pass the search term to the existing student list page.
    navigate(`/admin/students?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="dashboard-page">
      {error && (
        <div className="dashboard-error">
          <strong>Dashboard data could not be loaded.</strong>
          <span>{error}</span>
          <button type="button" onClick={loadDashboard}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="dashboard-spinner" />
          <span>Loading dashboard...</span>
        </div>
      ) : (
        <>
          <div className="dashboard-header">
            <div>
              <h3>
                Welcome back, {summary?.instituteName || "Admin"}
              </h3>
            </div>
            <h5>{formatDate()}</h5>
          </div>

          <div className="dashboard-stat-grid">
            {statCards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>

          <section className="dashboard-main-grid-row">
            <div className="two-one-grid">
              <div className="dashboard-panel dashboard-chart-panel">
                <div className="panel-header">
                  <div>
                    <h3>Find Student Details</h3>
                  </div>
                </div>

                <form
                  className="quickaction-main"
                  onSubmit={handleStudentSearch}
                >
                  <input
                    type="search"
                    className="inputview"
                    placeholder="Enter student ID, roll number or name"
                    value={studentSearch}
                    onChange={(event) =>
                      setStudentSearch(event.target.value)
                    }
                    aria-label="Search students"
                  />
                  <button
                    type="submit"
                    className="quickaction-btn card-success"
                    disabled={!studentSearch.trim()}
                  >
                    <FiUsers />
                    <span>Find Student</span>
                  </button>
                </form>
              </div>

              <div className="dashboard-panel dashboard-chart-panel">
                <div className="panel-header">
                  <div>
                    <h3>Quick Actions</h3>
                  </div>
                </div>

                <div className="quickaction-main">
                  <button
                    type="button"
                    className="quickaction-btn card-success"
                    onClick={() => navigate("/admin/students")}
                  >
                    <FiUsers />
                    <span>Manage Students</span>
                  </button>

                  <button
                    type="button"
                    className="quickaction-btn card-bluewarning"
                    onClick={() => navigate("/admin/courses")}
                  >
                    <FiBookOpen />
                    <span>Manage Courses</span>
                  </button>

                  <button
                    type="button"
                    className="quickaction-btn card-purple"
                    onClick={() => navigate("/admin/admissions")}
                  >
                    <FiClipboard />
                    <span>Manage Admissions</span>
                  </button>

                  <button
                    type="button"
                    className="quickaction-btn card-danger"
                    onClick={() => navigate("/admin/fees")}
                  >
                    <FiDollarSign />
                    <span>Manage Fees</span>
                  </button>
                </div>
              </div>
            </div>

            <PendingActions actions={pendingActions} />
            <RecentAdmissions admissions={admissions} />
          </section>

          <section className="dashboard-main-grid">
            <FeeCollection data={feeData} />
            <TodaysClasses />
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
