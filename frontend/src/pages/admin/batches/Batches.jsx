
import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import BatchFilters from "../../../components/batches/BatchFilters";
import BatchTable from "../../../components/batches/BatchTable";
import Pagination from "../../../components/common/Pagination";

import { getBatches, deleteBatch } from "../../../services/batchService";
import { getCourses } from "../../../services/courseService";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/BatchManagement.css";

const DEFAULT_PAGE_SIZE = 10;

const Batches = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  const canView = hasPermission(user, "batches.view");
  const canCreate = hasPermission(user, "batches.create");
  const canDelete = hasPermission(user, "batches.delete");
  const canEdit = hasPermission(user, "batches.update");

  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    course_id: "",
    status: "",
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  // Load courses for the course filter.
  useEffect(() => {
    if (authLoading || !user || !canView) return undefined;

    let cancelled = false;

    const loadCourses = async () => {
      try {
        const response = await getCourses({
          page: 1,
          limit: 100,
        });

        if (cancelled) return;

        const payload = response?.data?.data;
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.courses)
            ? payload.courses
            : [];

        setCourses(list);
      } catch (error) {
        if (!cancelled) {
          notification.error(getApiErrorMessage(error));
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, canView]);

  // Load batches using server-side pagination.
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

      try {
        const response = await getBatches({
          ...filters,
          page,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (cancelled) return;

        const data = response?.data?.data;
        const list = Array.isArray(data?.batches)
          ? data.batches
          : [];

        const pageData = data?.pagination || {};

        const total = Number(pageData.total) || 0;
        const totalPages =
          Number(pageData.totalPages) ||
          Math.ceil(total / limit);

        setBatches(list);

        setPagination({
          page: Number(pageData.page) || page,
          limit: Number(pageData.limit) || limit,
          total,
          totalPages,
        });

        // Recover if a filter or deletion leaves the current page empty.
        if (totalPages > 0 && page > totalPages) {
          setPage(totalPages);
        }
      } catch (error) {
        if (!cancelled) {
          setBatches([]);
          notification.error(getApiErrorMessage(error));
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
  }, [authLoading, user, canView, filters, page, limit, refreshKey]);

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

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleDelete = useCallback(
    async (id) => {
      if (!canDelete) {
        notification.error(
          "You do not have permission to delete batches."
        );
        return;
      }

      const confirmed = await notification.confirmDelete("this batch");

      if (!confirmed) return;

      try {
        await deleteBatch(id);

        notification.success("Batch deleted successfully.");

        if (batches.length === 1 && page > 1) {
          setPage((previous) => previous - 1);
        } else {
          setRefreshKey((previous) => previous + 1);
        }
      } catch (error) {
        notification.error(getApiErrorMessage(error));
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
          <Link to={`${basePath}/add`} className="batch-add-button">
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

        {loading ? (
          <div className="batch-loading">
            Loading batches...
          </div>
        ) : (
          <>
            <BatchTable
              batches={batches}
              onDelete={handleDelete}
              canView={canView}
              canEdit={canEdit}
              canDelete={canDelete}
            />

            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              itemCount={batches.length}
              itemLabel="batches"
              limit={limit}
              loading={loading}
              onPageChange={setPage}
              onLimitChange={handleLimitChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Batches;
