
import React, { useEffect, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import CategoryFilters from "../../../components/categories/CategoryFilters";
import CategoryTable from "../../../components/categories/CategoryTable";
import Pagination from "../../../components/common/Pagination";
import { hasPermission } from "../../../utils/permissions";

import {
  getCategories,
  deleteCategory,
} from "../../../services/categoryService";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/CategoryManagement.css";

const DEFAULT_FILTERS = {
  search: "",
  status: "",
};

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

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
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

      try {
        const response = await getCategories({
          ...filters,
          page,
          limit,
          sortBy: "displayOrder",
          sortOrder: "asc",
        });

        if (cancelled) return;

        const payload = response?.data?.data;
        const categoryList = Array.isArray(payload?.categories)
          ? payload.categories
          : [];

        const paginationData = payload?.pagination || {};

        setCategories(categoryList);
        setPagination({
          page: Number(paginationData.page) || page,
          limit: Number(paginationData.limit) || limit,
          total: Number(paginationData.total) || 0,
          totalPages: Math.max(
            Number(paginationData.totalPages) || 0,
            0
          ),
        });
      } catch (error) {
        if (!cancelled) {
          setCategories([]);
          notification.error(getApiErrorMessage(error));
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
    limit,
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

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      notification.error(
        "You do not have permission to delete categories."
      );
      return;
    }

    const category = categories.find(
      (item) => String(item._id) === String(id)
    );

    const categoryName = category?.categoryName || "this category";

    const confirmed = await notification.confirmDelete(
      `"${categoryName}"`
    );

    if (!confirmed) return;

    try {
      await deleteCategory(id);

      notification.success("Category deleted successfully.");

      if (categories.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        setRefreshKey((previous) => previous + 1);
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
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

            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              itemCount={categories.length}
              itemLabel="categories"
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

export default Categories;
