
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import {
  getSubjects,
  deleteSubject,
} from "../../../services/subjectService";

import { getCourses } from "../../../services/courseService";

import SubjectFilters from "../../../components/subjects/SubjectFilters";
import SubjectTable from "../../../components/subjects/SubjectTable";

import "../../../styles/SubjectManagement.css";

const INITIAL_FILTERS = {
  search: "",
  course_id: "",
  status: "",
};

const PAGE_SIZE = 10;

export default function SubjectManagement() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);

  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // Load courses once for the course filter.
  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setCoursesLoading(true);

        const response = await getCourses({ limit: 100 });
        const payload = response.data;

        const courseList = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        if (!cancelled) {
          setCourses(courseList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load courses. Please refresh the page."
          );
        }
      } finally {
        if (!cancelled) {
          setCoursesLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load subjects whenever the page or filters change.
  useEffect(() => {
    const controller = new AbortController();

    const loadSubjects = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getSubjects(
          {
            page,
            limit: PAGE_SIZE,
            search: filters.search.trim(),
            course_id: filters.course_id,
            status: filters.status,
          },
          {
            signal: controller.signal,
          }
        );

        const payload = response.data;

        setSubjects(
          Array.isArray(payload.data) ? payload.data : []
        );

        setPagination(
          payload.pagination || {
            total: 0,
            totalPages: 0,
          }
        );
      } catch (err) {
        if (
          err.code === "ERR_CANCELED" ||
          err.name === "CanceledError"
        ) {
          return;
        }

        setError(
          err.response?.data?.message ||
            "Unable to load subjects. Please try again."
        );

        setSubjects([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadSubjects();

    return () => {
      controller.abort();
    };
  }, [filters, page, refreshKey]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
    setNotice("");
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setPage(1);
    setNotice("");
    setError("");
  }, []);

  const handleDelete = useCallback(
    async (subject) => {
      const subjectId = subject?._id || subject?.id;

      if (!subjectId) {
        setError("Subject ID is missing.");
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to delete "${subject.subjectName}"?`
      );

      if (!confirmed) {
        return;
      }

      try {
        setError("");
        setNotice("");

        await deleteSubject(subjectId);

        setNotice("Subject deleted successfully.");

        // If the last row on a page was deleted,
        // move to the previous page when possible.
        if (subjects.length === 1 && page > 1) {
          setPage((previous) => previous - 1);
        } else {
          setRefreshKey((previous) => previous + 1);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to delete the subject."
        );
      }
    },
    [subjects.length, page]
  );

  const totalPages = pagination.totalPages || 0;

  return (
    <div className="subject-page">
      <div className="subject-page-header">
        <div>
          <h1>Subject Management</h1>
          <p>
            Manage subjects and associate them with courses.
          </p>
        </div>

        <button
          type="button"
          className="subject-primary-btn"
          onClick={() => navigate("/admin/subjects/add")}
        >
          <FiPlus aria-hidden="true" />
          Add Subject
        </button>
      </div>

      {error && (
        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="subject-alert subject-alert-success" role="status">
          {notice}
        </div>
      )}

      <div className="subject-card">
        <SubjectFilters
          filters={filters}
          courses={courses}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {coursesLoading && (
          <p className="subject-helper-text">
            Loading course options...
          </p>
        )}
      </div>

      <div className="subject-card">
        <div className="subject-table-heading">
          <h2>Subjects</h2>
          <span>
            Total: {pagination.total || 0}
          </span>
        </div>

        <SubjectTable
          subjects={subjects}
          loading={loading}
          onView={(id) =>
            navigate(`/admin/subjects/view/${id}`)
          }
          onEdit={(id) =>
            navigate(`/admin/subjects/edit/${id}`)
          }
          onDelete={handleDelete}
        />

        {!loading && totalPages > 0 && (
          <div className="subject-table-footer">
            <span>
              Page {page} of {totalPages}
            </span>

            <div className="subject-pagination">
              <button
                type="button"
                className="subject-secondary-btn"
                disabled={page <= 1}
                onClick={() =>
                  setPage((previous) => previous - 1)
                }
              >
                Previous
              </button>

              <button
                type="button"
                className="subject-secondary-btn"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((previous) => previous + 1)
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
