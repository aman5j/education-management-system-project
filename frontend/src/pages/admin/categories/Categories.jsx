
import React, { useCallback, useEffect, useState } from "react";
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

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const loadCategories = useCallback(async () => {

    if (authLoading || !user || !canView) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getCategories({
        ...filters,
        page,
        limit: 10,
        sortBy: "displayOrder",
        sortOrder: "asc",
      });

      const data = response?.data?.data;

      setCategories(data?.categories || []);
      setPagination(
        data?.pagination || {
          page,
          limit: 10,
          total: 0,
          totalPages: 0,
        }
      );
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Failed to load categories."
      );
    } finally {
      setLoading(false);
    }
  }, [filters, page, authLoading, user, canView]);

  useEffect(() => {
    if (!authLoading) {
      loadCategories();
    }
  }, [loadCategories, authLoading]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
  };

  const handleReset = () => {
    setFilters({ search: "", status: "" });
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setError("You do not have permission to delete categories.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this category? Categories used by existing courses should be retained or reassigned first."
    );

    if (!confirmed) return;

    try {
      setError("");
      await deleteCategory(id);
      await loadCategories();
    } catch (deleteError) {
      setError(
        deleteError?.response?.data?.message ||
          "Failed to delete category."
      );
    }
  };

  if (authLoading) {
    return <div className="category-loading">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="category-list-error">
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
          <Link
            to={`${basePath}/add`}
            className="themebtn"
          >
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
          <CategoryTable
            categories={categories}
            basePath={basePath}
            canView={canView}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={handleDelete}
          />
        )}

        {!loading && pagination.totalPages > 0 && (
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
      </div>
    </div>
  );
};

export default Categories;
