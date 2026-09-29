import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import CategoryFilters from "../../../components/categories/CategoryFilters";
import CategoryTable from "../../../components/categories/CategoryTable";

import {
  getCategories,
  deleteCategory,
} from "../../../services/categoryService";

import "../../../styles/CategoryManagement.css";

const Categories = () => {
  const [
    categories,
    setCategories,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    filters,
    setFilters,
  ] = useState({
    search: "",
    status: "",
  });

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const loadCategories =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await getCategories({
              ...filters,
              page,
              limit: 10,
              sortBy:
                "displayOrder",
              sortOrder:
                "asc",
            });

          const data =
            response?.data?.data;

          setCategories(
            data?.categories || []
          );

          setPagination(
            data?.pagination || {
              page,
              limit: 10,
              total: 0,
              totalPages: 0,
            }
          );
        } catch (requestError) {
          console.error(
            "Failed to load categories:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
              "Failed to load categories."
          );
        } finally {
          setLoading(false);
        }
      },
      [filters, page]
    );

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleFilterChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setFilters(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );

      setPage(1);
    };

  const handleReset =
    () => {
      setFilters({
        search: "",
        status: "",
      });

      setPage(1);
    };

  const handleDelete =
    async (id) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this category?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteCategory(
          id
        );

        await loadCategories();
      } catch (deleteError) {
        window.alert(
          deleteError?.response
            ?.data?.message ||
            "Failed to delete category."
        );
      }
    };

  return (
    <div className="category-page">
      <div className="category-page-header">
        <div>
          <h1>
            Course Categories
          </h1>

          <p>
            Manage course categories.
          </p>
        </div>

        <Link
          to="/admin/categories/add"
          className="category-add-button"
        >
          + Add Category
        </Link>
      </div>

      <div className="category-card">
        <CategoryFilters
          filters={filters}
          onChange={
            handleFilterChange
          }
          onReset={
            handleReset
          }
        />

        {error && (
          <div className="category-list-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="category-loading">
            Loading categories...
          </div>
        ) : (
          <CategoryTable
            categories={
              categories
            }
            onDelete={
              handleDelete
            }
          />
        )}

        {!loading &&
          pagination.totalPages >
            0 && (
            <div className="category-pagination">
              <button
                type="button"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous -
                      1
                  )
                }
              >
                Previous
              </button>

              <span>
                Page {page} of{" "}
                {
                  pagination.totalPages
                }
              </span>

              <button
                type="button"
                disabled={
                  page >=
                  pagination.totalPages
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous +
                      1
                  )
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