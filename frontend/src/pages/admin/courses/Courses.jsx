
import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import CourseFilters from "../../../components/courses/CourseFilters";
import CourseTable from "../../../components/courses/CourseTable";

import {
  deleteCourse,
  getCourses,
  updateCourseStatus,
} from "../../../services/courseService";

import "./CourseManagement.css";

const Courses = () => {
  const location = useLocation();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const isAdmin = user?.role === "admin";

  const permissions = Array.isArray(user?.assignedRole?.permissions)
    ? user.assignedRole.permissions
    : [];

  const canView = isAdmin || permissions.includes("courses.view");
  const canCreate = isAdmin || permissions.includes("courses.create");
  const canUpdate = isAdmin || permissions.includes("courses.update");
  const canDelete = isAdmin || permissions.includes("courses.delete");

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    courseType: "",
    courseCategory: "",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const loadCourses = useCallback(async () => {
    if (!canView) {
      setCourses([]);
      setLoading(false);
      setError("You are not authorized to view courses.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getCourses({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      const result = response.data?.data;

      setCourses(Array.isArray(result?.courses)
        ? result.courses
        : Array.isArray(result)
          ? result
          : []);

      if (result?.pagination) {
        setPagination((previous) => ({
          ...previous,
          ...result.pagination,
        }));
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load courses."
      );
    } finally {
      setLoading(false);
    }
  }, [
    canView,
    filters,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const handleReset = () => {
    setFilters({
      search: "",
      status: "",
      courseType: "",
      courseCategory: "",
    });

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setError("You do not have permission to delete courses.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    try {
      setError("");
      await deleteCourse(id);
      await loadCourses();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to delete course."
      );
    }
  };

  const handleStatusChange = async (id, status) => {
    if (!canUpdate) {
      setError("You do not have permission to update courses.");
      return;
    }

    try {
      setError("");
      await updateCourseStatus(id, status);
      await loadCourses();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update course status."
      );
    }
  };

  if (!canView) {
    return (
      <div className="course-page">
        <div className="course-list-error" role="alert">
          You are not authorized to view courses.
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>Courses</h1>
          <p>Manage courses, pricing, duration and publishing status.</p>
        </div>

        {canCreate && (
          <Link
            to={`${basePath}/add`}
            className="course-primary-btn"
          >
            + Add Course
          </Link>
        )}
      </div>

      {error && (
        <div className="course-list-error" role="alert">
          {error}
        </div>
      )}

      <div className="course-card">
        <CourseFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      </div>

      <div className="course-card">
        {loading ? (
          <div className="course-loading">Loading courses...</div>
        ) : (
          <>
            <CourseTable
              courses={courses}
              basePath={basePath}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />

            <div className="course-pagination">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((previous) => ({
                    ...previous,
                    page: previous.page - 1,
                  }))
                }
              >
                Previous
              </button>

              <span>
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                disabled={
                  pagination.page >= (pagination.totalPages || 1)
                }
                onClick={() =>
                  setPagination((previous) => ({
                    ...previous,
                    page: previous.page + 1,
                  }))
                }
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Courses;
