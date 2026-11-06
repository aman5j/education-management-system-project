
import React, { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import CourseFilters from "../../../components/courses/CourseFilters";
import CourseTable from "../../../components/courses/CourseTable";
import Pagination from "../../../components/common/Pagination";

import { hasPermission } from "../../../utils/permissions";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

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
  const [searchInput, setSearchInput] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce search input to avoid an API request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((previous) => {
        if (previous.search === searchInput.trim()) {
          return previous;
        }

        return {
          ...previous,
          search: searchInput.trim(),
        };
      });

      setPagination((previous) => ({
        ...previous,
        page: 1,
      }));
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

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
        const courseList = Array.isArray(responseBody?.data)
          ? responseBody.data
          : [];

        const paginationData = responseBody?.pagination;

        setCourses(courseList);

        if (paginationData) {
          const total = Number(paginationData.total) || 0;
          const limit = Number(paginationData.limit) || pagination.limit;
          const totalPages = Math.max(
            Number(paginationData.totalPages) || 0,
            1
          );

          // If a filter reduces the result count, keep the page valid.
          const currentPage = Math.min(
            Number(paginationData.page) || pagination.page,
            totalPages
          );

          setPagination((previous) => ({
            ...previous,
            page: currentPage,
            limit,
            total,
            totalPages,
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
          setCourses([]);
          setError(getApiErrorMessage(requestError));
          notification.error(getApiErrorMessage(requestError));
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

    if (name === "search") {
      setSearchInput(value);
      return;
    }

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
    setSearchInput("");
    setFilters({ ...DEFAULT_FILTERS });

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const handlePageChange = (nextPage) => {
    setPagination((previous) => ({
      ...previous,
      page: nextPage,
    }));
  };

  const handleLimitChange = (nextLimit) => {
    setPagination((previous) => ({
      ...previous,
      page: 1,
      limit: nextLimit,
    }));
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      notification.error("You do not have permission to delete courses.");
      return;
    }

    const confirmed = await notification.confirmDelete("this course");

    if (!confirmed) return;

    try {
      await deleteCourse(id);

      notification.success("Course deleted successfully.");

      if (courses.length === 1 && pagination.page > 1) {
        setPagination((previous) => ({
          ...previous,
          page: previous.page - 1,
        }));
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (requestError) {
      notification.error(getApiErrorMessage(requestError));
    }
  };

  const handleStatusChange = async (id, nextStatus) => {
    if (!canUpdate) {
      notification.error("You do not have permission to update courses.");
      return;
    }

    const course = courses.find((item) => item._id === id);
    const previousStatus = course?.status || "Draft";

    if (previousStatus === nextStatus) return;

    let confirmed = false;

    if (nextStatus === "Published") {
      confirmed = await notification.confirmPublish("This course");
    } else if (nextStatus === "Archived") {
      confirmed = await notification.confirmArchive("This course");
    } else {
      confirmed = await notification.confirm({
        title: "Move course to Draft?",
        text: "This course will no longer be published.",
        confirmText: "Yes, move to Draft",
        icon: "question",
      });
    }

    if (!confirmed) return;

    try {
      await updateCourseStatus(id, nextStatus);
      notification.success(`Course status changed to ${nextStatus}.`);
      setRefreshKey((previous) => previous + 1);
    } catch (requestError) {
      notification.error(getApiErrorMessage(requestError));
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
      <div className="page-header">
        <div>
          <h1>Courses</h1>
        </div>

        {canCreate && (
          <Link to={`${basePath}/add`} className="themebtn">
            + Add Course
          </Link>
        )}
      </div>

      {error && (
        <div className="course-list-error" role="alert">
          {error}
        </div>
      )}

      <div className="common-card-filters">
        <CourseFilters
          filters={{
            ...filters,
            search: searchInput,
          }}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      </div>

      <div className="common-card">
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

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              itemCount={courses.length}
              itemLabel="courses"
              limit={pagination.limit}
              loading={loading}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Courses;
