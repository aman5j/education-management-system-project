
import React, { useCallback, useEffect, useState } from "react";
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

  const [refreshKey, setRefreshKey] = useState(0);

  const loadCourses = useCallback(async () => {
    if (authLoading || !user || !canView) {
      setCourses([]);
      setLoading(false);
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

    authLoading,
    user,
  ]);

  // useEffect(() => {
  //   if (!authLoading) {
  //     loadCourses();
  //   }
  // }, [loadCourses, authLoading]);

  useEffect(() => {
    if (authLoading) return undefined;

    let cancelled = false;

    const run = async () => {
      // Keep this request isolated from any earlier effect.
      try {
        if (!user || !canView) return;

        setLoading(true);
        setError("");

        const response = await getCourses({
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
        });

        if (cancelled) return;

        const result = response.data?.data;

        setCourses(
          Array.isArray(result?.courses)
            ? result.courses
            : Array.isArray(result)
              ? result
              : []
        );

        if (result?.pagination) {
          setPagination((previous) => ({
            ...previous,
            ...result.pagination,
          }));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load courses."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

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
