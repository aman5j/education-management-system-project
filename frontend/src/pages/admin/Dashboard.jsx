import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiHelpCircle,
  FiUsers,
} from "react-icons/fi";

import api from "../../services/api";

import Breadcrumb from "../../common/Breadcrumb";

import StatCard from "../../components/dashboard/StatCard";
import FeeCollection from "../../components/dashboard/FeeCollection";
import RecentAdmissions from "../../components/dashboard/RecentAdmissions";
import TodaysClasses from "../../components/dashboard/TodaysClasses";
import PendingActions from "../../components/dashboard/PendingActions";

const getGreeting = () => {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
};

const formatDate = () => {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  ).format(new Date());
};

const Dashboard = () => {
  const [summary, setSummary] =
    useState(null);

  const [admissions, setAdmissions] =
    useState([]);

  const [feeData, setFeeData] =
    useState([]);

  const [pendingActions, setPendingActions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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
        api.get(
          "/dashboard/recent-admissions"
        ),
        api.get(
          "/dashboard/fee-summary"
        ),
        api.get(
          "/dashboard/pending-actions"
        ),
      ]);

      setSummary(
        summaryResponse.data.data
      );

      setAdmissions(
        admissionsResponse.data.data
      );

      setFeeData(
        feeResponse.data.data.monthly
      );

      setPendingActions(
        pendingResponse.data.data
      );
    } catch (requestError) {
      setError(
        requestError.response?.data
          ?.message ||
          "Unable to load dashboard data."
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
        value:
          summary?.totalStudents ?? 0,
        icon: FiUsers,
        change: 0,
        comparison:
          "Current registered students",
        type: "primary",
      },

      {
        title: "New Admissions",
        value:
          summary?.newAdmissions ?? 0,
        icon: FiClipboard,
        change: 0,
        comparison:
          "Current admissions",
        type: "success",
      },

      {
        title: "Enquiries",
        value:
          summary?.enquiries ?? 0,
        icon: FiHelpCircle,
        change: 0,
        comparison:
          "Current enquiries",
        type: "warning",
      },

      {
        title: "Active Courses",
        value:
          summary?.activeCourses ?? 0,
        icon: FiBookOpen,
        change: 0,
        comparison:
          "Currently active courses",
        type: "purple",
      },

      {
        title: "Fees Collected",
        value:
          `₹${(
            summary?.feesCollected ?? 0
          ).toLocaleString("en-IN")}`,
        icon: FiDollarSign,
        change: 0,
        comparison:
          "Current fee records",
        type: "success",
      },

      {
        title: "Pending Fees",
        value:
          `₹${(
            summary?.pendingFees ?? 0
          ).toLocaleString("en-IN")}`,
        icon: FiDollarSign,
        change: 0,
        comparison:
          "Outstanding fee records",
        type: "danger",
      },
    ],
    [summary]
  );

  return (
    <div className="dashboard-page">
      <Breadcrumb
        currentPage="Dashboard"
      />

      <section className="dashboard-hero">
        <div>
          <span className="dashboard-eyebrow">
            ADMIN DASHBOARD
          </span>

          <h1>
            {getGreeting()}, Admin 👋
          </h1>

          <p>
            Here's what's happening with your
            institution today.
          </p>
        </div>

        <div className="dashboard-date">
          {formatDate()}
        </div>
      </section>

      {error && (
        <div className="dashboard-error">
          <strong>
            Dashboard data could not be loaded.
          </strong>

          <span>{error}</span>

          <button
            onClick={loadDashboard}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="dashboard-spinner" />

          <span>
            Loading dashboard...
          </span>
        </div>
      ) : (
        <>
          <section className="dashboard-stat-grid">
            {statCards.map(
              (card) => (
                <StatCard
                  key={card.title}
                  {...card}
                />
              )
            )}
          </section>

          <section className="dashboard-main-grid">
            <FeeCollection
              data={feeData}
            />

            <RecentAdmissions
              admissions={admissions}
            />
          </section>

          <section className="dashboard-main-grid">
            <TodaysClasses />

            <PendingActions
              actions={pendingActions}
            />
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;