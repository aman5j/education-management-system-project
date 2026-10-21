
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import BatchFilters from "../../../components/batches/BatchFilters";
import BatchTable from "../../../components/batches/BatchTable";

import {
  getBatches,
  deleteBatch,
} from "../../../services/batchService";

import {
  getCourses,
} from "../../../services/courseService";

import "../../../styles/BatchManagement.css";

const PAGE_SIZE = 10;

const Batches = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  const canView = hasPermission(user, "batches.view");
  const canCreate = hasPermission(user, "batches.create");
  const canDelete = hasPermission(user, "batches.delete");

  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    search: "",
    course_id: "",
    status: "",
  });

  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  // Load courses for the batch filter.
  // Ignore results if this request becomes outdated or the page unmounts.
  useEffect(() => {
    if (authLoading || !user || !canView) {
      setCourses([]);
      return undefined;
    }

    let cancelled = false;

    const loadCourses = async () => {
      try {
        const response = await getCourses({
          page: 1,
          limit: 100,
        });

        if (cancelled) return;

        const payload = response?.data?.data;

        const courseList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.courses)
            ? payload.courses
            : [];

        setCourses(courseList);
      } catch (courseError) {
        if (!cancelled) {
          console.error("Failed to load courses:", courseError);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, canView]);

  // Keep batch loading in one effect so older requests cannot
  // overwrite results for newer filters, pages, or refreshes.
  useEffect(() => {
    if (authLoading) return undefined;

    if (!user || !canView) {
      setBatches([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadBatches = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getBatches({
          ...filters,
          page,
          limit: PAGE_SIZE,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (cancelled) return;

        const data = response?.data?.data;
        const batchList = Array.isArray(data?.batches)
          ? data.batches
          : [];

        const paginationData = data?.pagination;

        setBatches(batchList);

        setPagination(
          paginationData
            ? {
                page: Number(paginationData.page) || page,
                limit: Number(paginationData.limit) || PAGE_SIZE,
                total: Number(paginationData.total) || 0,
                totalPages: Math.max(
                  Number(paginationData.totalPages) || 0,
                  0
                ),
              }
            : {
                page,
                limit: PAGE_SIZE,
                total: batchList.length,
                totalPages: batchList.length ? 1 : 0,
              }
        );
      } catch (requestError) {
        if (!cancelled) {
          setBatches([]);
          setError(
            requestError?.response?.data?.message ||
              "Failed to load batches."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBatches();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    canView,
    filters,
    page,
    refreshKey,
  ]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
  };

  const handleReset = () => {
    setFilters({
      search: "",
      course_id: "",
      status: "",
    });

    setPage(1);
  };

  const handleDelete = useCallback(
    async (id) => {
      if (!canDelete) {
        setError("You do not have permission to delete batches.");
        return;
      }

      const confirmed = window.confirm(
        "Are you sure you want to delete this batch?"
      );

      if (!confirmed) return;

      try {
        setError("");
        await deleteBatch(id);

        // If the deleted batch was the only row on this page,
        // move back one page. Otherwise, reload the current page.
        if (batches.length === 1 && page > 1) {
          setPage((previous) => previous - 1);
        } else {
          setRefreshKey((previous) => previous + 1);
        }
      } catch (deleteError) {
        setError(
          deleteError?.response?.data?.message ||
            "Failed to delete batch."
        );
      }
    },
    [canDelete, batches.length, page]
  );

  if (authLoading) {
    return (
      <div className="batch-page">
        Checking permissions...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="batch-page">
        <div className="batch-list-error" role="alert">
          You do not have permission to view batches.
        </div>
      </div>
    );
  }

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>Batch Management</h1>
          <p>Manage course batches and seat capacity.</p>
        </div>

        {canCreate && (
          <Link
            to={`${basePath}/add`}
            className="batch-add-button"
          >
            + Add Batch
          </Link>
        )}
      </div>

      <div className="batch-card">
        <BatchFilters
          filters={filters}
          courses={courses}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {error && (
          <div className="batch-list-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="batch-loading">
            Loading batches...
          </div>
        ) : (
          <BatchTable
            batches={batches}
            onDelete={handleDelete}
            canDelete={canDelete}
          />
        )}

        {!loading && pagination.totalPages > 0 && (
          <div className="batch-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((previous) => previous - 1)}
            >
              Previous
            </button>

            <span>
              Page {page} of {pagination.totalPages}
              {" · "}
              {pagination.total} batches
            </span>

            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((previous) => previous + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Batches;
