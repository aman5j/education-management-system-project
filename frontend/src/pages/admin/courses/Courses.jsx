
import React, { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import CourseFilters from "../../../components/courses/CourseFilters";
import CourseTable from "../../../components/courses/CourseTable";
import { hasPermission } from "../../../utils/permissions";

import {
  deleteCourse,
  getCourses,
  updateCourseStatus,
} from "../../../services/courseService";

import "./CourseManagement.css";

const DEFAULT_FILTERS = {
  search: "",
  status: "",
  courseType: "",
  courseCategory: "",
};

const Courses = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const canView = hasPermission(user, "courses.view");
  const canCreate = hasPermission(user, "courses.create");
  const canUpdate = hasPermission(user, "courses.update");
  const canDelete = hasPermission(user, "courses.delete");

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  // Load the list in one place so older requests cannot overwrite
  // results belonging to newer filters or pages.
  useEffect(() => {
    if (authLoading) return undefined;

    if (!user || !canView) {
      setCourses([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadCourses = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getCourses({
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
        });

        if (cancelled) return;

        const responseBody = response?.data;
        const payload = responseBody?.data;

        // The backend currently returns data as an array and
        // pagination as a separate top-level property.
        const courseList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.courses)
            ? payload.courses
            : [];

        const paginationData =
          responseBody?.pagination ?? payload?.pagination;

        setCourses(courseList);

        if (paginationData) {
          setPagination((previous) => ({
            ...previous,
            ...paginationData,
            totalPages: Math.max(
              Number(paginationData.totalPages) || 0,
              1
            ),
          }));
        } else {
          setPagination((previous) => ({
            ...previous,
            total: courseList.length,
            totalPages: 1,
          }));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError?.response?.data?.message ||
              "Unable to load courses."
          );
          setCourses([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    canView,
    filters,
    pagination.page,
    pagination.limit,
    refreshKey,
  ]);

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
    setFilters({ ...DEFAULT_FILTERS });

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

      // If this was the only row on a later page, go back one page.
      if (courses.length === 1 && pagination.page > 1) {
        setPagination((previous) => ({
          ...previous,
          page: previous.page - 1,
        }));
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
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
      setRefreshKey((previous) => previous + 1);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Unable to update course status."
      );
    }
  };

  if (authLoading) {
    return <div className="course-page">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
          <Link to={`${basePath}/add`} className="course-primary-btn">
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
                {" · "}
                {pagination.total} courses
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
