
import { useCallback, useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { RiFileExcel2Line } from "react-icons/ri";
import { FaFileImport } from "react-icons/fa";

import api from "../../../services/api";
import { getCourses } from "../../../services/courseService";
import { getBatches } from "../../../services/batchService";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import notification from "../../../utils/notification";

import StudentFilters from "../../../components/students/StudentFilters";
import StudentTable from "../../../components/students/StudentTable";
import StudentView from "../../../components/students/StudentView";
import StudentCredentialsModal from "../../../components/students/StudentCredentialsModal";

import "../../../layout/AdminLayout.css";
import "./StudentManagement.css";

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  course_id: "",
  batch_id: "",
};

const Students = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const studentsPath = location.pathname.startsWith("/staff")
    ? "/staff/students"
    : "/admin/students";

  const canViewStudents = hasPermission(user, "students.view");
  const canCreateStudent = hasPermission(user, "students.create");
  const canUpdateStudent = hasPermission(user, "students.update");
  const canDeleteStudent = hasPermission(user, "students.delete");

  // Preserve the existing Admin-only payment access policy.
  const canViewPayments = user?.role === "admin";

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const [loading, setLoading] = useState(true);
  const [deletingStudent, setDeletingStudent] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [credentialsStudent, setCredentialsStudent] = useState(null);

  // Show the success message sent by Add Student / Edit Student.
  useEffect(() => {
    const message = location.state?.notification;

    if (message) {
      notification.success(message);
      navigate(location.pathname, {
        replace: true,
        state: null,
      });
    }
  }, [location.state, location.pathname, navigate]);

  // Load course and batch filter options.
  useEffect(() => {
    if (authLoading || !user || !canViewStudents) return;

    let cancelled = false;

    const loadOptions = async () => {
      try {
        const [courseResponse, batchResponse] = await Promise.all([
          getCourses({ page: 1, limit: 100 }),
          getBatches({ page: 1, limit: 100 }),
        ]);

        const courseCandidates = [
          courseResponse?.data?.data?.courses,
          courseResponse?.data?.courses,
          courseResponse?.data?.data,
          courseResponse?.data,
        ];

        const batchCandidates = [
          batchResponse?.data?.data?.batches,
          batchResponse?.data?.batches,
          batchResponse?.data?.data,
          batchResponse?.data,
        ];

        if (!cancelled) {
          setCourses(
            courseCandidates.find(Array.isArray) || []
          );
          setBatches(
            batchCandidates.find(Array.isArray) || []
          );
        }
      } catch {
        if (!cancelled) {
          setCourses([]);
          setBatches([]);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, canViewStudents]);

  const fetchStudents = useCallback(
    async (requestedPage = 1) => {
      if (authLoading || !user || !canViewStudents) {
        setStudents([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const params = {
          page: requestedPage,
          limit: pagination.limit,
          sortBy,
          sortOrder,
        };

        Object.entries(filters).forEach(([key, value]) => {
          if (String(value || "").trim()) {
            params[key] = value;
          }
        });

        const response = await api.get("/students", {
          params,
          silent: true,
        });

        const result = response?.data?.data;

        if (!Array.isArray(result?.students)) {
          throw new Error("Invalid student list response from server.");
        }

        setStudents(result.students);
        setPagination({
          page: Number(result.pagination?.page || requestedPage),
          limit: Number(result.pagination?.limit || pagination.limit),
          total: Number(result.pagination?.total || 0),
          totalPages: Number(result.pagination?.totalPages || 0),
        });
      } catch (error) {
        notification.error(
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load students."
        );
      } finally {
        setLoading(false);
      }
    },
    [
      authLoading,
      user,
      canViewStudents,
      filters,
      pagination.limit,
      sortBy,
      sortOrder,
    ]
  );

  useEffect(() => {
    if (!authLoading && user && canViewStudents) {
      fetchStudents(1);
    }
  }, [
    authLoading,
    user,
    canViewStudents,
    filters,
    sortBy,
    sortOrder,
    pagination.limit,
    fetchStudents,
  ]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "course_id" ? { batch_id: "" } : {}),
    }));
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleDelete = async (student) => {
    if (!canDeleteStudent) {
      notification.error("You do not have permission to delete students.");
      return;
    }

    const name = [student.firstName, student.surname]
      .filter(Boolean)
      .join(" ");

    const confirmed = await notification.confirmDelete(
      name ? `"${name}"` : "this student"
    );

    if (!confirmed) return;

    setDeletingStudent(true);

    try {
      await api.delete(`/students/${student._id}`, {
        silent: true,
      });

      notification.success("Student deleted successfully.");

      const nextPage =
        students.length === 1 && pagination.page > 1
          ? pagination.page - 1
          : pagination.page;

      await fetchStudents(nextPage);
    } catch (error) {
      notification.error(
        error?.response?.data?.message ||
        "Unable to delete student."
      );
    } finally {
      setDeletingStudent(false);
    }
  };

  const handleStatusChange = async (student, status) => {
    if (!canUpdateStudent || student.status === status) return;

    const name = [student.firstName, student.surname]
      .filter(Boolean)
      .join(" ");

    const confirmed = await notification.confirmStatusChange({
      itemName: name || "this student",
      action: status === "inactive" ? "suspend" : "reactivate",
    });

    if (!confirmed) return;

    try {
      await api.patch(
        `/students/${student._id}/status`,
        { status },
        { silent: true }
      );

      notification.success("Student status updated successfully.");
      await fetchStudents(pagination.page);
    } catch (error) {
      notification.error(
        error?.response?.data?.message ||
        "Unable to update student status."
      );
    }
  };

  const exportCsv = () => {
    if (!students.length) {
      notification.info("There are no students to export.");
      return;
    }

    const headers = [
      "Roll No",
      "First Name",
      "Surname",
      "Father Name",
      "Mother Name",
      "Gender",
      "Mobile",
      "Alternate Mobile",
      "Email",
      "Address",
      "Pincode",
      "Course",
      "Batch",
      "Status",
    ];

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = students.map((student) =>
      [
        student.rollNo,
        student.firstName,
        student.surname,
        student.fatherName,
        student.motherName,
        student.gender,
        student.mobile,
        student.alternateMobile,
        student.email,
        student.address,
        student.pincode,
        student.course_id?.courseTitle || "",
        student.batch_id?.batch_name || "",
        student.status,
      ]
        .map(escapeCsv)
        .join(",")
    );

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows,
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "students.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    notification.success("Student list exported successfully.");
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchStudents(page);
  };

  if (authLoading) {
    return (
      <div className="student-loading-page">
        Checking permissions...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!canViewStudents) return <Navigate to="/unauthorized" replace />;

  return (
    <div className="student-management-page">
      <div className="page-header">
        <div>
          <h1>Manage Students</h1>
        </div>

        <div className="student-page-actions">
          <button
            type="button"
            className="themebtn excelimport"
            onClick={() =>
              notification.info("Student import is not connected yet.")
            }
          >
            <FaFileImport />
            Import
          </button>

          <button
            type="button"
            className="themebtn exceldownload"
            onClick={exportCsv}
            disabled={!students.length}
          >
            <RiFileExcel2Line />
            Export
          </button>

          {canCreateStudent && (
            <button
              type="button"
              className="themebtn"
              onClick={() => navigate(`${studentsPath}/add`)}
            >
              <FiPlus />
              Add Student
            </button>
          )}
        </div>
      </div>

      <StudentFilters
        filters={filters}
        courses={courses}
        batches={batches}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      <section className="common-card">
        {loading ? (
          <div className="student-loading">
            <div className="student-spinner" />
            <span>Loading students...</span>
          </div>
        ) : (
          <>
            <StudentTable
              canUpdateStudent={canUpdateStudent}
              canDeleteStudent={canDeleteStudent}
              canViewPayments={canViewPayments}
              canManageCredentials={user?.role === "admin"}
              onCredentials={setCredentialsStudent}
              students={students}
              onView={setSelectedStudent}
              onEdit={(student) =>
                navigate(`${studentsPath}/${student._id}/edit`)
              }
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />

            <div className="student-table-footer">
              <div>
                Showing {students.length} of {pagination.total} students
              </div>

              <div className="student-pagination">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  Previous
                </button>

                {Array.from(
                  { length: pagination.totalPages },
                  (_, index) => index + 1
                )
                  .slice(
                    Math.max(pagination.page - 3, 0),
                    Math.min(pagination.page + 2, pagination.totalPages)
                  )
                  .map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={
                        page === pagination.page
                          ? "student-pagination-active"
                          : ""
                      }
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next
                </button>
              </div>

              <select
                value={pagination.limit}
                onChange={(event) =>
                  setPagination((previous) => ({
                    ...previous,
                    limit: Number(event.target.value),
                    page: 1,
                  }))
                }
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
          </>
        )}
      </section>

      {selectedStudent && (
        <StudentView
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onEdit={(student) => {
            setSelectedStudent(null);
            navigate(`${studentsPath}/${student._id}/edit`);
          }}
        />
      )}

      {credentialsStudent && user?.role === "admin" && (
        <StudentCredentialsModal
          student={credentialsStudent}
          onClose={() => setCredentialsStudent(null)}
        />
      )}

      {deletingStudent && (
        <div className="student-action-overlay">
          Deleting student...
        </div>
      )}
    </div>
  );
};

export default Students;
