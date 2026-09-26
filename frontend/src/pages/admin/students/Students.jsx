import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiDownload,
  FiPlus,
} from "react-icons/fi";

import {
  useNavigate,
} from "react-router-dom";

import { getAssetUrl } from "../../../utils/assetUrl";

import api from "../../../services/api";

import Breadcrumb from "../../../common/Breadcrumb";

import StudentFilters from "../../../components/students/StudentFilters";
import StudentTable from "../../../components/students/StudentTable";
import StudentView from "../../../components/students/StudentView";

import "../../../layout/AdminLayout.css";
import "./StudentManagement.css";

const defaultFilters = {
  search: "",
  status: "",
  course: "",
  batch: "",
};

const Students = () => {
  const navigate =
    useNavigate();

  const [
    students,
    setStudents,
  ] = useState([]);

  const [
    filters,
    setFilters,
  ] = useState(
    defaultFilters
  );

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  const [sortBy, setSortBy] =
    useState("createdAt");

  const [
    sortOrder,
    setSortOrder,
  ] = useState("desc");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    selectedStudent,
    setSelectedStudent,
  ] = useState(null);

  const [
    deletingStudent,
    setDeletingStudent,
  ] = useState(false);

  const fetchStudents =
    useCallback(
      async (
        requestedPage =
          pagination.page
      ) => {
        setLoading(true);
        setError("");

        try {
          const params =
            new URLSearchParams();

          if (filters.search) {
            params.set(
              "search",
              filters.search
            );
          }

          if (filters.status) {
            params.set(
              "status",
              filters.status
            );
          }

          if (filters.course) {
            params.set(
              "course",
              filters.course
            );
          }

          if (filters.batch) {
            params.set(
              "batch",
              filters.batch
            );
          }

          params.set(
            "page",
            String(
              requestedPage
            )
          );

          params.set(
            "limit",
            String(
              pagination.limit
            )
          );

          params.set(
            "sortBy",
            sortBy
          );

          params.set(
            "sortOrder",
            sortOrder
          );

          const response =
            await api.get(
              `/students?${params.toString()}`
            );

          setStudents(
            response.data.data
              .students
          );

          setPagination(
            response.data.data
              .pagination
          );
        } catch (requestError) {
          setError(
            requestError.response
              ?.data?.message ||
              "Unable to load students."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        filters,
        pagination.page,
        pagination.limit,
        sortBy,
        sortOrder,
      ]
    );

  useEffect(() => {
    fetchStudents(1);
  }, [
    filters,
    sortBy,
    sortOrder,
    pagination.limit,
  ]);

  const handleFilterChange =
    (event) => {
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

  const handleReset =
    () => {
      setFilters(
        defaultFilters
      );

      setSortBy(
        "createdAt"
      );

      setSortOrder(
        "desc"
      );
    };

  const handleSort =
    (field) => {
      if (sortBy === field) {
        setSortOrder(
          (previous) =>
            previous === "asc"
              ? "desc"
              : "asc"
        );
      } else {
        setSortBy(field);
        setSortOrder("asc");
      }
    };

  const handleDelete =
    async (student) => {
      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${student.firstName} ${student.surname || ""}?`
        );

      if (!confirmed) {
        return;
      }

      setDeletingStudent(true);

      try {
        await api.delete(
          `/students/${student._id}`
        );

        await fetchStudents(
          pagination.page
        );
      } catch (requestError) {
        setError(
          requestError.response
            ?.data?.message ||
            "Unable to delete student."
        );
      } finally {
        setDeletingStudent(false);
      }
    };

  const handleStatusChange =
    async (
      student,
      status
    ) => {
      try {
        await api.patch(
          `/students/${student._id}/status`,
          {
            status,
          }
        );

        await fetchStudents(
          pagination.page
        );
      } catch (requestError) {
        setError(
          requestError.response
            ?.data?.message ||
            "Unable to update student status."
        );
      }
    };

  const exportCsv = () => {
    if (!students.length) {
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

    const escapeCsv =
      (value) => {
        const stringValue =
          String(
            value ?? ""
          );

        return `"${stringValue.replace(
          /"/g,
          '""'
        )}"`;
      };

    const rows =
      students.map(
        (student) => [
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
          student.course,
          student.batch,
          student.status,
        ]
          .map(escapeCsv)
          .join(",")
      );

    const csv = [
      headers
        .map(escapeCsv)
        .join(","),
      ...rows,
    ].join("\n");

    const blob =
      new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;
    link.download =
      "students.csv";

    link.click();

    URL.revokeObjectURL(
      url
    );
  };

  const goToPage =
    (page) => {
      if (
        page < 1 ||
        page >
          pagination.totalPages
      ) {
        return;
      }

      fetchStudents(page);
    };

  return (
    <div className="student-management-page">
      <Breadcrumb
        currentPage="Students"
      />

      <div className="student-page-header">
        <div>
          <span className="student-page-eyebrow">
            STUDENT MANAGEMENT
          </span>

          <h1>
            Manage Students
          </h1>

          <p>
            View, create and manage
            student records.
          </p>
        </div>

        <div className="student-page-actions">
          <button
            type="button"
            className="student-secondary-button"
            onClick={exportCsv}
            disabled={
              !students.length
            }
          >
            <FiDownload />
            Export
          </button>

          <button
            type="button"
            className="student-primary-button"
            onClick={() =>
              navigate(
                "/admin/students/add"
              )
            }
          >
            <FiPlus />
            Add Student
          </button>
        </div>
      </div>

      <section className="student-list-card">
        <StudentFilters
          filters={filters}
          onChange={
            handleFilterChange
          }
          onReset={handleReset}
        />

        {error && (
          <div className="student-page-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="student-loading">
            <div className="student-spinner" />

            <span>
              Loading students...
            </span>
          </div>
        ) : (
          <>
            <StudentTable
              students={students}
              onView={
                setSelectedStudent
              }
              onEdit={(student) =>
                navigate(
                  `/admin/students/${student._id}/edit`
                )
              }
              onDelete={
                handleDelete
              }
              onStatusChange={
                handleStatusChange
              }
              sortBy={sortBy}
              sortOrder={
                sortOrder
              }
              onSort={
                handleSort
              }
            />

            <div className="student-table-footer">
              <div>
                Showing{" "}
                {students.length} of{" "}
                {pagination.total}{" "}
                students
              </div>

              <div className="student-pagination">
                <button
                  type="button"
                  disabled={
                    pagination.page <=
                    1
                  }
                  onClick={() =>
                    goToPage(
                      pagination.page -
                        1
                    )
                  }
                >
                  Previous
                </button>

                {Array.from(
                  {
                    length:
                      pagination.totalPages,
                  },
                  (_, index) =>
                    index + 1
                )
                  .slice(
                    Math.max(
                      pagination.page -
                        3,
                      0
                    ),
                    Math.min(
                      pagination.page +
                        2,
                      pagination.totalPages
                    )
                  )
                  .map(
                    (page) => (
                      <button
                        type="button"
                        key={page}
                        className={
                          page ===
                          pagination.page
                            ? "student-pagination-active"
                            : ""
                        }
                        onClick={() =>
                          goToPage(
                            page
                          )
                        }
                      >
                        {page}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  disabled={
                    pagination.page >=
                    pagination.totalPages
                  }
                  onClick={() =>
                    goToPage(
                      pagination.page +
                        1
                    )
                  }
                >
                  Next
                </button>
              </div>

              <select
                value={
                  pagination.limit
                }
                onChange={(
                  event
                ) =>
                  setPagination(
                    (previous) => ({
                      ...previous,
                      limit: Number(
                        event
                          .target
                          .value
                      ),
                      page: 1,
                    })
                  )
                }
              >
                <option value="10">
                  10 / page
                </option>

                <option value="25">
                  25 / page
                </option>

                <option value="50">
                  50 / page
                </option>
              </select>
            </div>
          </>
        )}
      </section>

      {selectedStudent && (
        <StudentView
          student={
            selectedStudent
          }
          onClose={() =>
            setSelectedStudent(
              null
            )
          }
          onEdit={(student) => {
            setSelectedStudent(
              null
            );

            navigate(
              `/admin/students/${student._id}/edit`
            );
          }}
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