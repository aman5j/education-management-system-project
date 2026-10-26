import {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import { getAssetUrl } from "../../../utils/assetUrl";
import { downloadAdmissionIdCard } from "../../../utils/downloadAdmissionIdCard";
import { downloadAdmissionForm } from "../../../utils/downloadAdmissionForm";

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
import { LuIdCard } from "react-icons/lu";



import {
  getAdmissions,
  deleteAdmission,
} from "../../../services/admissionService";


const money = (value) =>
  `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const Admissions = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const admissionsPath = location.pathname.startsWith("/staff")
    ? "/staff/admissions"
    : "/admin/admissions";

  const canViewAdmissions = hasPermission(
    user,
    "admissions.view"
  );

  const canCreateAdmission = hasPermission(
    user,
    "admissions.create"
  );

  const canUpdateAdmission = hasPermission(
    user,
    "admissions.update"
  );

  const canDeleteAdmission = hasPermission(
    user,
    "admissions.delete"
  ); 

  const [admissions, setAdmissions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");
  
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const [status, setStatus] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  // const loadAdmissions =
  //   async () => {

  //     if (authLoading || !user || !canViewAdmissions) {
  //       setAdmissions([]);
  //       setLoading(false);
  //       return;
  //     }

  //     try {
  //       setLoading(true);
  //       setError("");

  //       const response =
  //         await getAdmissions({
  //           search,
  //           status,
  //           page,
  //           limit: 10,
  //         });

  //       const data =
  //         response?.data?.data;

  //       setAdmissions(
  //         Array.isArray(
  //           data?.admissions
  //         )
  //           ? data.admissions
  //           : []
  //       );

  //       setPagination(
  //         data?.pagination || {
  //           page,
  //           limit: 10,
  //           total: 0,
  //           totalPages: 1,
  //         }
  //       );
  //     } catch (loadError) {
  //       console.error(
  //         loadError
  //       );

  //       setError(
  //         loadError?.response
  //           ?.data?.message ||
  //           "Unable to load admissions."
  //       );
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

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
        return;
      }

      let cancelled = false;

      const fetchAdmissions = async () => {
        try {
          setLoading(true);
          setError("");

          const response = await getAdmissions({
            search: debouncedSearch,
            status,
            page,
            limit: 10,
          });

          if (cancelled) return;

          const data = response?.data?.data;

          setAdmissions(
            Array.isArray(data?.admissions) ? data.admissions : []
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
          if (cancelled) return;

          setAdmissions([]);
          setError(
            requestError?.response?.data?.message ||
              "Unable to load admissions."
          );
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
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
      authLoading,
      user,
      canViewAdmissions,

      refreshKey,
    ]);

  
  const [downloadingIdCard, setDownloadingIdCard] = useState("");

  const handleDownloadIdCard = async (admission) => {
    try {
      setError("");
      setDownloadingIdCard(admission._id);

      await downloadAdmissionIdCard(admission);
    } catch (downloadError) {
      console.error("Student ID card generation failed:", downloadError);

      setError(
        downloadError?.response?.data?.message ||
          downloadError?.message ||
          "Unable to generate the student ID card."
      );
    } finally {
      setDownloadingIdCard("");
    }
  };

  const [downloadingAdmissionForm, setDownloadingAdmissionForm] =
  useState("");

  const handleDownloadAdmissionForm = async (admission) => {
    try {
      setError("");
      setDownloadingAdmissionForm(admission._id);

      await downloadAdmissionForm(admission);
    } catch (downloadError) {
      console.error(
        "Admission form generation failed:",
        downloadError
      );

      setError(
        downloadError?.response?.data?.message ||
          downloadError?.message ||
          "Unable to generate the admission form."
      );
    } finally {
      setDownloadingAdmissionForm("");
    }
  };


  const handleDelete =
    async (id) => {

      if (!canDeleteAdmission) {
        setError("You do not have permission to delete admissions.");
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this admission?"
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteAdmission(
          id
        );

        // await loadAdmissions();
        if (admissions.length === 1 && page > 1) {
          setPage((currentPage) => currentPage - 1);
        } else {
          setRefreshKey((currentKey) => currentKey + 1);
        }


      } catch (deleteError) {
        alert(
          deleteError?.response
            ?.data?.message ||
            "Unable to delete admission."
        );
      }
    };

  const resetFilters =
    () => {
      setSearch("");
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
          <h1>
            Manage Admissions
          </h1>
        </div>

        {canCreateAdmission && (
          <Link
            to={`${admissionsPath}/add`}
            className="themebtn"
          >
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
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search student, roll no, course, batch..."
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value
              );
              setPage(1);
            }}
          >
            <option value="">
              All Status
            </option>

            <option value="Active">
              Active
            </option>

            <option value="Completed">
              Completed
            </option>

            <option value="Dropped">
              Dropped
            </option>
          </select>

          <button
            type="button"
            className="admission-reset-button"
            onClick={
              resetFilters
            }
          >
            <FiRefreshCw />
            Reset
          </button>
        </div>

      <div className="common-card">
       

        {error && (
          <div className="admission-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="admission-state">
            Loading admissions...
          </div>
        ) : admissions.length ===
          0 ? (
          <div className="admission-empty">
            No admissions found.
          </div>
        ) : (
          <div className="common-table-wrapper">
            <table className="common-table">
              <thead>
                <tr>
                  <th>
                    Student
                  </th>

                  <th>
                    Course
                  </th>

                  <th>
                    Batch
                  </th>

                  <th>
                    Admission Date
                  </th>

                  <th>
                    Final Amount
                  </th>

                  <th>
                    Paid
                  </th>

                  <th>
                    Remaining
                  </th>

                  <th>
                    Status
                  </th>
                  <th>Download</th>
                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {admissions.map(
                  (admission) => {
                    const student =
                      admission.student_id;

                    const course =
                      admission.course_id;

                    const batch =
                      admission.batch_id;

                    const remaining =
                      Math.max(
                        0,
                        Number(
                          admission.final_amount ||
                            0
                        ) -
                          Number(
                            admission.paid_amount ||
                              0
                          )
                      );

                    return (
                      <tr
                        key={
                          admission._id
                        }
                      >
                        
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
                            ]
                              .filter(Boolean)
                              .join("")
                              .toUpperCase() || "S"}
                          </div>

                          <div className="admission-student-info">
                            <strong>
                              {[
                                student?.firstName,
                                student?.surname,
                              ]
                                .filter(Boolean)
                                .join(" ") || "—"}
                            </strong>

                            <small>{student?.rollNo || "—"}</small>
                          </div>
                        </div>
                      </div>
                    </td>


                        <td>
                          {course?.courseTitle ||
                            "—"}
                        </td>

                        <td>
                          {batch?.batch_name ||
                            "—"}
                        </td>

                        <td>
                          {admission.admission_date
                            ? new Date(
                                admission.admission_date
                              ).toLocaleDateString(
                                "en-IN"
                              )
                            : "—"}
                        </td>

                        <td>
                          <strong className="tag-purple">
                          {money(
                            admission.final_amount
                          )}
                          </strong>
                        </td>

                        <td>
                          <strong className="tag-success">
                           {money(
                            admission.paid_amount
                          )}
                          </strong>
                         
                        </td>

                        <td>
                        <strong className="tag-danger">

                          {money(
                            remaining
                          )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`admission-status admission-status-${String(
                              admission.status
                            ).toLowerCase()}`}
                          >
                            {
                              admission.status
                            }
                          </span>
                        </td>

                        <td>
                          <div className="admission-actions">

                          
                          <button
                            type="button"
                            className="tooltip"
                            data-tooltip="Download Admission Form"
                            title="Download Admission Form"
                            disabled={downloadingAdmissionForm === admission._id}
                            onClick={() => handleDownloadAdmissionForm(admission)}
                          >
                            <GrDocument />
                          </button>
                            

                            {/* <Link
                              to={`${admissionsPath}/${admission._id}`}
                              data-tooltip="Download ID Card" className="tooltip"
                            >
                             <GrDocument />

                            </Link> */}

                            
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
                                data-tooltip="Delete"
                                className="tooltip"
                                type="button"
                                title="Delete"
                                onClick={() => handleDelete(admission._id)}
                              >
                                <FiTrash2 />
                              </button>
                            )}

                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading &&
          pagination.totalPages >
            1 && (
            <div className="admission-pagination">
              <button
                type="button"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (previous) =>
                      previous - 1
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
                      previous + 1
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

export default Admissions;