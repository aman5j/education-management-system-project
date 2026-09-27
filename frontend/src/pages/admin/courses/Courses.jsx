import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CourseFilters from "../../../components/courses/CourseFilters";
import CourseTable from "../../../components/courses/CourseTable";

import {
  deleteCourse,
  getCourses,
  updateCourseStatus,
} from "../../../services/courseService";

import "./CourseManagement.css";


const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

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
    try {
      setLoading(true);

      const response = await getCourses({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });

      const result = response.data;

      setCourses(result.data || []);

      setPagination((previous) => ({
        ...previous,
        ...(result.pagination || {}),
      }));
    } catch (error) {
      console.error(
        "Failed to load courses:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [
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
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) return;

    try {
      await deleteCourse(id);
      await loadCourses();
    } catch (error) {
      console.error(
        "Failed to delete course:",
        error
      );
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateCourseStatus(id, status);
      await loadCourses();
    } catch (error) {
      console.error(
        "Failed to update course status:",
        error
      );
    }
  };

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>Courses</h1>

          <p>
            Manage courses, pricing, duration and
            publishing status.
          </p>
        </div>

        <Link
          to="/admin/courses/add"
          className="course-primary-btn"
        >
          + Add Course
        </Link>
      </div>

      <div className="course-card">
        <CourseFilters
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleReset}
        />
      </div>

      <div className="course-card">
        {loading ? (
          <div className="course-loading">
            Loading courses...
          </div>
        ) : (
          <>
            <CourseTable
              courses={courses}
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
                Page {pagination.page} of{" "}
                {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                disabled={
                  pagination.page >=
                  pagination.totalPages
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