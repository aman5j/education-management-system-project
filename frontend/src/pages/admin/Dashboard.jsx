
import { useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiUsers,
  FiSearch,
  FiX,
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
import StudentView from "../../components/students/StudentView";

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

const getFullName = (student) =>
  [student?.firstName, student?.surname]
    .filter(Boolean)
    .join(" ") || "Unnamed student";

const Dashboard = () => {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [feeData, setFeeData] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentLoading, setSelectedStudentLoading] =
    useState(false);

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

  // Search the existing students API while the admin types.
  useEffect(() => {
    const query = studentSearch.trim();
    let cancelled = false;

    setSearchError("");

    if (query.length < 2) {
      setStudentResults([]);
      setSearchLoading(false);
      return undefined;
    }

    setSearchLoading(true);

    const timer = setTimeout(async () => {
      try {
        const response = await api.get("/students", {
          params: {
            search: query,
            page: 1,
            limit: 8,
            sortBy: "firstName",
            sortOrder: "asc",
          },
        });

        if (cancelled) return;

        const rows = response.data?.data?.students;

        setStudentResults(Array.isArray(rows) ? rows : []);
      } catch (requestError) {
        if (cancelled) return;

        setStudentResults([]);
        setSearchError(
          requestError.response?.data?.message ||
            "Unable to search students. Please try again."
        );
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [studentSearch]);

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

  const openStudentDetails = async (student) => {
    if (!student?._id) return;

    setSearchOpen(false);
    setSearchError("");
    setSelectedStudentLoading(true);

    try {
      // Fetch the complete current student record before showing it.
      const response = await api.get(`/students/${student._id}`);
      const fullStudent = response.data?.data;

      if (!fullStudent?._id) {
        throw new Error("Student details could not be found.");
      }

      setSelectedStudent(fullStudent);
    } catch (requestError) {
      setSearchError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load student details."
      );
    } finally {
      setSelectedStudentLoading(false);
    }
  };

  const clearStudentSearch = () => {
    setStudentSearch("");
    setStudentResults([]);
    setSearchError("");
    setSearchOpen(false);
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

                <div
                  className="dashboard-student-search"
                  style={{ position: "relative", padding: "16px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      border: "1px solid #d5deeb",
                      borderRadius: "8px",
                      padding: "0 12px",
                      background: "#fff",
                    }}
                  >
                    <FiSearch color="#64748b" />

                    <input
                      type="search"
                      className="inputview"
                      placeholder="Search by name, roll number, mobile or email..."
                      value={studentSearch}
                      autoComplete="off"
                      aria-label="Search students"
                      aria-expanded={searchOpen}
                      onFocus={() => setSearchOpen(true)}
                      onChange={(event) => {
                        setStudentSearch(event.target.value);
                        setSearchOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setSearchOpen(false);
                        }

                        if (
                          event.key === "Enter" &&
                          studentResults.length > 0
                        ) {
                          event.preventDefault();
                          openStudentDetails(studentResults[0]);
                        }
                      }}
                      style={{
                        border: "none",
                        boxShadow: "none",
                        flex: 1,
                        minWidth: 0,
                      }}
                    />

                    {studentSearch && (
                      <button
                        type="button"
                        aria-label="Clear student search"
                        title="Clear search"
                        onClick={clearStudentSearch}
                        style={{
                          border: 0,
                          background: "transparent",
                          cursor: "pointer",
                          padding: "6px",
                        }}
                      >
                        <FiX />
                      </button>
                    )}
                  </div>

                  {searchOpen && studentSearch.trim().length >= 2 && (
                    <div
                      role="listbox"
                      aria-label="Matching students"
                      style={{
                        position: "absolute",
                        top: "calc(100% - 12px)",
                        left: "16px",
                        right: "16px",
                        zIndex: 30,
                        background: "#fff",
                        border: "1px solid #dbe3ef",
                        borderRadius: "8px",
                        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
                        maxHeight: "300px",
                        overflowY: "auto",
                      }}
                    >
                      {searchLoading ? (
                        <div style={{ padding: "14px", color: "#64748b" }}>
                          Searching students...
                        </div>
                      ) : searchError ? (
                        <div
                          role="alert"
                          style={{
                            padding: "14px",
                            color: "#b91c1c",
                            fontSize: "13px",
                          }}
                        >
                          {searchError}
                        </div>
                      ) : studentResults.length === 0 ? (
                        <div style={{ padding: "14px", color: "#64748b" }}>
                          No matching students found.
                        </div>
                      ) : (
                        studentResults.map((student) => (
                          <button
                            key={student._id}
                            type="button"
                            role="option"
                            aria-selected="false"
                            onClick={() => openStudentDetails(student)}
                            disabled={selectedStudentLoading}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              width: "100%",
                              textAlign: "left",
                              padding: "12px",
                              border: 0,
                              borderBottom: "1px solid #edf1f6",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(event) => {
                              event.currentTarget.style.background = "#f4f7ff";
                            }}
                            onMouseLeave={(event) => {
                              event.currentTarget.style.background = "#fff";
                            }}
                          >
                            <span
                              style={{
                                display: "grid",
                                placeItems: "center",
                                width: "38px",
                                height: "38px",
                                flexShrink: 0,
                                borderRadius: "50%",
                                background: "#eaf1ff",
                                color: "#2455d6",
                                fontWeight: 700,
                              }}
                            >
                              {(student.firstName || "S")
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span style={{ minWidth: 0, flex: 1 }}>
                              <strong
                                style={{
                                  display: "block",
                                  color: "#172033",
                                  fontSize: "13px",
                                }}
                              >
                                {getFullName(student)}
                              </strong>

                              <span
                                style={{
                                  display: "block",
                                  marginTop: "3px",
                                  color: "#64748b",
                                  fontSize: "12px",
                                }}
                              >
                                {student.rollNo || "No roll number"}
                                {student.mobile ? ` · ${student.mobile}` : ""}
                              </span>
                            </span>

                            <span
                              style={{
                                color:
                                  student.status === "active"
                                    ? "#15803d"
                                    : "#64748b",
                                fontSize: "11px",
                                textTransform: "capitalize",
                              }}
                            >
                              {student.status || ""}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {selectedStudentLoading && (
                    <p style={{ fontSize: "12px", color: "#64748b" }}>
                      Loading student profile...
                    </p>
                  )}

                  {searchError && !searchOpen && (
                    <p
                      role="alert"
                      style={{ color: "#b91c1c", fontSize: "12px" }}
                    >
                      {searchError}
                    </p>
                  )}

                  {studentSearch.trim().length > 0 &&
                    studentSearch.trim().length < 2 && (
                      <p style={{ fontSize: "12px", color: "#64748b" }}>
                        Enter at least 2 characters to search.
                      </p>
                    )}
                </div>
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
                    onClick={() => navigate("/admin/payments")}
                  >
                    <FiDollarSign />
                    <span>Manage Payments</span>
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

      {selectedStudent && (
        <StudentView
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onEdit={(student) => {
            setSelectedStudent(null);
            navigate(`/admin/students/${student._id}/edit`);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
