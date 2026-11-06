
import { useEffect, useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import { getAssetUrl } from "../../../utils/assetUrl";
import { downloadAdmissionIdCard } from "../../../utils/downloadAdmissionIdCard";
import { downloadAdmissionForm } from "../../../utils/downloadAdmissionForm";

import Pagination from "../../../components/common/Pagination";
import notification from "../../../utils/notification";
import {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/AdmissionManagement.css";

import {
  FiEdit2,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import { FaIdCard } from "react-icons/fa6";
import { GrDocument } from "react-icons/gr";

import {
  getAdmissions,
  deleteAdmission,
} from "../../../services/admissionService";

const PAGE_SIZES = [10, 25, 50];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const Admissions = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const admissionsPath = location.pathname.startsWith("/staff")
    ? "/staff/admissions"
    : "/admin/admissions";

  const canViewAdmissions = hasPermission(user, "admissions.view");
  const canCreateAdmission = hasPermission(user, "admissions.create");
  const canUpdateAdmission = hasPermission(user, "admissions.update");
  const canDeleteAdmission = hasPermission(user, "admissions.delete");

  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [deletingId, setDeletingId] = useState("");
  const [downloadingIdCard, setDownloadingIdCard] = useState("");
  const [downloadingAdmissionForm, setDownloadingAdmissionForm] =
    useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (authLoading || !user || !canViewAdmissions) {
      setAdmissions([]);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const fetchAdmissions = async () => {
      setLoading(true);

      try {
        const response = await getAdmissions({
          search: debouncedSearch,
          status,
          page,
          limit,
        });

        if (cancelled) return;

        const data = response?.data?.data;

        const records = Array.isArray(data?.admissions)
          ? data.admissions
          : [];

        const serverPagination = data?.pagination || {};

        setAdmissions(records);
        setPagination({
          page: Number(serverPagination.page) || page,
          limit: Number(serverPagination.limit) || limit,
          total: Number(serverPagination.total) || 0,
          totalPages: Number(serverPagination.totalPages) || 0,
        });

        // If a record was deleted from the last page, return to
        // the previous page when the server reports no records.
        if (
          records.length === 0 &&
          page > 1 &&
          Number(serverPagination.totalPages) > 0 &&
          page > Number(serverPagination.totalPages)
        ) {
          setPage(Number(serverPagination.totalPages));
        }
      } catch (error) {
        if (cancelled) return;

        setAdmissions([]);
        notification.error(getApiErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAdmissions();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    status,
    page,
    limit,
    authLoading,
    user,
    canViewAdmissions,
    refreshKey,
  ]);

  const handleDownloadIdCard = async (admission) => {
    try {
      setDownloadingIdCard(admission._id);
      await downloadAdmissionIdCard(admission);
      notification.success("Student ID card downloaded.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setDownloadingIdCard("");
    }
  };

  const handleDownloadAdmissionForm = async (admission) => {
    try {
      setDownloadingAdmissionForm(admission._id);
      await downloadAdmissionForm(admission);
      notification.success("Admission form downloaded.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error)
      );
    } finally {
      setDownloadingAdmissionForm("");
    }
  };

  const handleDelete = async (admission) => {
    if (!canDeleteAdmission || deletingId) return;

    const studentName = [
      admission.student_id?.firstName,
      admission.student_id?.surname,
    ].filter(Boolean).join(" ");

    const confirmed = await notification.confirmDelete(
      `the admission${studentName ? ` for ${studentName}` : ""}`
    );

    if (!confirmed) return;

    setDeletingId(admission._id);

    try {
      await deleteAdmission(admission._id);

      notification.success("Admission deleted successfully.");

      if (admissions.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setDeletingId("");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setPage(1);
  };

  if (authLoading) {
    return <div className="admission-state">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canViewAdmissions) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="admission-page">
      <div className="page-header">
        <div>
          <h1>Manage Admissions</h1>
        </div>

        {canCreateAdmission && (
          <Link to={`${admissionsPath}/add`} className="themebtn">
            <FiPlus />
            Add Admission
          </Link>
        )}
      </div>

      <div className="common-card-filters">
        <div className="input-search">
          <FiSearch />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, roll no, course, batch..."
          />
        </div>

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter admissions by status"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
          <option value="Dropped">Dropped</option>
        </select>

        <button
          type="button"
          className="admission-reset-button"
          onClick={resetFilters}
        >
          <FiRefreshCw />
          Reset
        </button>
      </div>

      <div className="common-card">
        {loading ? (
          <div className="admission-state">Loading admissions...</div>
        ) : admissions.length === 0 ? (
          <div className="admission-empty">No admissions found.</div>
        ) : (
          <div className="common-table-wrapper">
            <table className="common-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Admission Date</th>
                  <th>Final Amount</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Download</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {admissions.map((admission) => {
                  const student = admission.student_id;
                  const course = admission.course_id;
                  const batch = admission.batch_id;

                  const remaining = Math.max(
                    0,
                    Number(admission.final_amount || 0) -
                      Number(admission.paid_amount || 0)
                  );

                  return (
                    <tr key={admission._id}>
                      <td>
                        <div className="admission-student-cell">
                          <div className="admission-student-profile">
                            {student?.profileImage ? (
                              <img
                                className="admission-student-image"
                                src={getAssetUrl(student.profileImage)}
                                alt={[
                                  student?.firstName,
                                  student?.surname,
                                ].filter(Boolean).join(" ") || "Student"}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                  event.currentTarget.nextElementSibling?.classList.remove(
                                    "admission-student-fallback-hidden"
                                  );
                                }}
                              />
                            ) : null}

                            <div
                              className={`admission-student-fallback ${
                                student?.profileImage
                                  ? "admission-student-fallback-hidden"
                                  : ""
                              }`}
                              aria-label="Student initials"
                            >
                              {[
                                student?.firstName?.[0],
                                student?.surname?.[0],
                              ].filter(Boolean).join("").toUpperCase() || "S"}
                            </div>

                            <div className="admission-student-info">
                              <strong>
                                {[
                                  student?.firstName,
                                  student?.surname,
                                ].filter(Boolean).join(" ") || "—"}
                              </strong>
                              <small>{student?.rollNo || "—"}</small>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>{course?.courseTitle || "—"}</td>
                      <td>{batch?.batch_name || "—"}</td>

                      <td>
                        {admission.admission_date
                          ? new Date(admission.admission_date)
                              .toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td>
                        <strong className="tag-purple">
                          {money(admission.final_amount)}
                        </strong>
                      </td>

                      <td>
                        <strong className="tag-success">
                          {money(admission.paid_amount)}
                        </strong>
                      </td>

                      <td>
                        <strong className="tag-danger">
                          {money(remaining)}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`admission-status admission-status-${String(
                            admission.status
                          ).toLowerCase()}`}
                        >
                          {admission.status}
                        </span>
                      </td>

                      <td>
                        <div className="admission-actions">
                          <button
                            type="button"
                            className="tooltip"
                            data-tooltip="Download Admission Form"
                            title="Download Admission Form"
                            disabled={
                              downloadingAdmissionForm === admission._id
                            }
                            onClick={() =>
                              handleDownloadAdmissionForm(admission)
                            }
                          >
                            <GrDocument />
                          </button>

                          <button
                            type="button"
                            className="tooltip"
                            data-tooltip="Download Student ID Card"
                            title="Download Student ID Card"
                            disabled={downloadingIdCard === admission._id}
                            onClick={() => handleDownloadIdCard(admission)}
                          >
                            <FaIdCard />
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="admission-actions">
                          {canViewAdmissions && (
                            <Link
                              to={`${admissionsPath}/${admission._id}`}
                              data-tooltip="View"
                              className="tooltip"
                            >
                              <FiEye />
                            </Link>
                          )}

                          {canUpdateAdmission && (
                            <Link
                              to={`${admissionsPath}/${admission._id}/edit`}
                              data-tooltip="Edit"
                              className="tooltip"
                            >
                              <FiEdit2 />
                            </Link>
                          )}

                          {canDeleteAdmission && (
                            <button
                              type="button"
                              data-tooltip="Delete"
                              className="tooltip"
                              title="Delete"
                              disabled={deletingId === admission._id}
                              onClick={() => handleDelete(admission)}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <Pagination
            page={pagination.page || page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            itemCount={admissions.length}
            itemLabel="admissions"
            limit={limit}
            loading={loading || Boolean(deletingId)}
            onPageChange={setPage}
            onLimitChange={(nextLimit) => {
              if (!PAGE_SIZES.includes(nextLimit)) return;
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Admissions;
