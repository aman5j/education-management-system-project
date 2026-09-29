import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

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

const Batches = () => {
  const [
    batches,
    setBatches,
  ] = useState([]);

  const [
    courses,
    setCourses,
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
    course_id: "",
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

  useEffect(() => {
    const loadCourses =
      async () => {
        try {
          const response = await getCourses({
            page: 1,
            limit: 100,
          });

          const courseList = response?.data?.data ?? [];

          setCourses(
            Array.isArray(courseList) ? courseList : []
          );
        } catch (courseError) {
          console.error(
            "Failed to load courses:",
            courseError
          );
        }
      };

    loadCourses();
  }, []);

  const loadBatches =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const response =
            await getBatches({
              ...filters,
              page,
              limit: 10,
              sortBy:
                "createdAt",
              sortOrder:
                "desc",
            });

          const data =
            response?.data?.data;

          setBatches(
            data?.batches || []
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
            "Failed to load batches:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
              "Failed to load batches."
          );
        } finally {
          setLoading(false);
        }
      },
      [filters, page]
    );

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

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
        course_id: "",
        status: "",
      });

      setPage(1);
    };

  const handleDelete =
    async (id) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this batch?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteBatch(
          id
        );

        await loadBatches();
      } catch (deleteError) {
        window.alert(
          deleteError?.response
            ?.data?.message ||
            "Failed to delete batch."
        );
      }
    };

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>
            Batch Management
          </h1>

          <p>
            Manage course batches and seat capacity.
          </p>
        </div>

        <Link
          to="/admin/batches/add"
          className="batch-add-button"
        >
          + Add Batch
        </Link>
      </div>

      <div className="batch-card">
        <BatchFilters
          filters={filters}
          courses={courses}
          onChange={
            handleFilterChange
          }
          onReset={
            handleReset
          }
        />

        {error && (
          <div className="batch-list-error">
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
            onDelete={
              handleDelete
            }
          />
        )}

        {!loading &&
          pagination.totalPages >
            0 && (
            <div className="batch-pagination">
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

export default Batches;