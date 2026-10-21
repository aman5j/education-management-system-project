
import React, { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import CategoryFilters from "../../../components/categories/CategoryFilters";
import CategoryTable from "../../../components/categories/CategoryTable";
import { hasPermission } from "../../../utils/permissions";

import {
  getCategories,
  deleteCategory,
} from "../../../services/categoryService";

import "../../../styles/CategoryManagement.css";

const DEFAULT_FILTERS = {
  search: "",
  status: "",
};

const PAGE_SIZE = 10;

const Categories = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/categories"
    : "/admin/categories";

  const canView = hasPermission(user, "courses.view");
  const canCreate = hasPermission(user, "courses.create");
  const canUpdate = hasPermission(user, "courses.update");
  const canDelete = hasPermission(user, "courses.delete");

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (authLoading) return undefined;

    if (!user || !canView) {
      setCategories([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadCategories = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getCategories({
          ...filters,
          page,
          limit: PAGE_SIZE,
          sortBy: "displayOrder",
          sortOrder: "asc",
        });

        if (cancelled) return;

        const payload = response?.data?.data;

        const categoryList = Array.isArray(payload?.categories)
          ? payload.categories
          : [];

        const paginationData = payload?.pagination;

        setCategories(categoryList);

        if (paginationData) {
          setPagination({
            page: Number(paginationData.page) || page,
            limit: Number(paginationData.limit) || PAGE_SIZE,
            total: Number(paginationData.total) || 0,
            totalPages: Math.max(
              Number(paginationData.totalPages) || 0,
              0
            ),
          });
        } else {
          setPagination({
            page,
            limit: PAGE_SIZE,
            total: categoryList.length,
            totalPages: categoryList.length ? 1 : 0,
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setCategories([]);
          setError(
            requestError?.response?.data?.message ||
              "Failed to load categories."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCategories();

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
    setFilters({ ...DEFAULT_FILTERS });
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setError("You do not have permission to delete categories.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this category? Categories used by existing courses must be reassigned first."
    );

    if (!confirmed) return;

    try {
      setError("");
      await deleteCategory(id);

      // If the deleted category was the only row on a later page,
      // navigate back; otherwise reload the current page.
      if (categories.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (deleteError) {
      setError(
        deleteError?.response?.data?.message ||
          "Failed to delete category."
      );
    }
  };

  if (authLoading) {
    return (
      <div className="category-loading">
        Checking permissions...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="category-list-error" role="alert">
        You do not have permission to view Course Categories.
      </div>
    );
  }

  return (
    <div className="category-page">
      <div className="page-header">
        <div>
          <h1>Course Categories</h1>
          <p>Organize and manage the institute's course categories.</p>
        </div>

        {canCreate && (
          <Link to={`${basePath}/add`} className="themebtn">
            <FiPlus /> Add Category
          </Link>
        )}
      </div>

      <CategoryFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      <div className="common-card">
        {error && (
          <div className="category-list-error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="category-loading">
            Loading categories...
          </div>
        ) : (
          <>
            <CategoryTable
              categories={categories}
              basePath={basePath}
              canView={canView}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={handleDelete}
            />

            {pagination.totalPages > 0 && (
              <div className="category-pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((previous) => previous - 1)
                  }
                >
                  Previous
                </button>

                <span>
                  Page {page} of {pagination.totalPages}
                  {" · "}
                  {pagination.total} categories
                </span>

                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() =>
                    setPage((previous) => previous + 1)
                  }
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Categories;
