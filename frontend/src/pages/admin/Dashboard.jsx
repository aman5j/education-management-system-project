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


} 
from "react-icons/fi";
import {FaGraduationCap} from "react-icons/fa";
import { GiExpense } from "react-icons/gi";
import { PiMoneyBold } from "react-icons/pi";
import { IoWalletSharp } from "react-icons/io5";
import { FaUserFriends } from "react-icons/fa";
import { FaBookOpen } from "react-icons/fa6";



import api from "../../services/api";

import Breadcrumb from "../../common/Breadcrumb";

import StatCard from "../../components/dashboard/StatCard";
import FeeCollection from "../../components/dashboard/FeeCollection";
import RecentAdmissions from "../../components/dashboard/RecentAdmissions";
import TodaysClasses from "../../components/dashboard/TodaysClasses";
import PendingActions from "../../components/dashboard/PendingActions";
import { MdAccessTimeFilled } from "react-icons/md";


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
        icon: FaUserFriends,
        type: "success"
      },

     

      {
        title: "Enquiries",
        value:
          summary?.enquiries ?? 0,
        icon: FaGraduationCap,
        type: "bluewarning",
      },

      {
        title: "Active Courses",
        value:
          summary?.activeCourses ?? 0,
        icon: FaBookOpen,
        type: "purple",
      },

     

      {
        title: "Total Expenses",
        value:
          `₹${(
            summary?.pendingFees ?? 0
          ).toLocaleString("en-IN")}`,
        icon: GiExpense,
        type: "danger",
      },

       {
        title: "Total Fees",
        value:
          `₹${(
            summary?.totalFeeReceived ?? 0
          ).toLocaleString("en-IN")}`,
        icon: PiMoneyBold,
        type: "warning",
      },

        {
        title: "Fees Collected",
        value:
          `₹${(
            summary?.totalFeeReceived ?? 0
          ).toLocaleString("en-IN")}`,
        icon: IoWalletSharp,
        type: "success",
      },

       {
        title: "Pending Fees",
        value:
          `₹${(
            summary?.totalPending ?? 0
          ).toLocaleString("en-IN")}`,
        icon: MdAccessTimeFilled,
        type: "danger",
      },

       
    ],
    [summary]
  );

  return (
    <div className="dashboard-page">
      {/* <Breadcrumb
        currentPage="Dashboard"
      /> */}

      {/* <section className="dashboard-hero">
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
      </section> */}

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
          <section className="dashboard-panel dashboard-chart-panel ">
            <div class="panel-header"><div><h3>Your Institution Overview</h3></div></div>
              <div className="dashboard-stat-grid">
      

            {statCards.map(
              (card) => (
                <StatCard
                  key={card.title}
                  {...card}
                />
              )
            )}
            </div>
          </section>

  <section className="dashboard-panel dashboard-chart-panel ">
            <div class="panel-header"><div><h3>Student Details Lookup</h3> </div></div>
            <div className="quickaction-main">
              <input type="text" className="inputview" placeholder="Enter Student ID or Name" />
            </div>
          </section>
          

          <section className="dashboard-main-grid">
            <FeeCollection
              data={feeData}
            />

            <RecentAdmissions
              admissions={admissions}
            />
          </section>
           <section className="dashboard-panel dashboard-chart-panel ">
            <div class="panel-header"><div><h3>Quick Actions</h3> </div></div>
            <div className="quickaction-main">
              <button className="quickaction-btn card-success"><FiUsers /> <span>Manage Students</span></button>
              <button className="quickaction-btn card-bluewarning"><FiBookOpen /> <span>Manage Courses</span></button>
              <button className="quickaction-btn card-purple"><FiClipboard /> <span>Manage Enquiries</span></button>
              <button className="quickaction-btn card-danger"><FiDollarSign /> <span>Manage Fees</span></button>
              <button className="quickaction-btn card-bluewarning"><FiHelpCircle /> <span>Support</span></button>
            </div>
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