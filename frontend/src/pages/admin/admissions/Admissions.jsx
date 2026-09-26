import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FiDownload,
  FiPlus,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import Breadcrumb from "../../../common/Breadcrumb";

import AdmissionFilters from "../../../components/admissions/AdmissionFilters";
import AdmissionTable from "../../../components/admissions/AdmissionTable";
import AdmissionView from "../../../components/admissions/AdmissionView";

import {
  deleteAdmission,
  getAdmissions,
  updateAdmissionStatus,
} from "../../../services/admissionService";

import "./AdmissionManagement.css";

const initialFilters = {
  search: "",
  batch: "",
  course: "",
  status: "",
  remark: "",
  admittedFrom: "",
  admittedTo: "",
};

const Admissions = () => {
  const navigate = useNavigate();

  const [filters, setFilters] =
    useState(initialFilters);

  const [admissions, setAdmissions] =
    useState([]);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedAdmission, setSelectedAdmission] =
    useState(null);

  const loadAdmissions =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getAdmissions({
            ...filters,
            page: pagination.page,
            limit: pagination.limit,
          });

        setAdmissions(
          response.data.admissions
        );

        setPagination(
          response.data.pagination
        );
      } catch (requestError) {
        setError(
          requestError.response?.data
            ?.message ||
            requestError.message ||
            "Unable to load admissions."
        );
      } finally {
        setLoading(false);
      }
    }, [
      filters,
      pagination.page,
      pagination.limit,
    ]);

  useEffect(() => {
    loadAdmissions();
  }, [loadAdmissions]);

  const handleFilterChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const handleReset = () => {
    setFilters(initialFilters);

    setPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const handleDelete = async (
    admission
  ) => {
    const studentName = [
      admission.student?.firstName,
      admission.student?.surname,
    ]
      .filter(Boolean)
      .join(" ");

    const confirmed =
      window.confirm(
        `Delete admission for ${
          studentName ||
          admission.rollNo
        }?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAdmission(
        admission._id
      );

      await loadAdmissions();
    } catch (requestError) {
      window.alert(
        requestError.response?.data
          ?.message ||
          "Unable to delete admission."
      );
    }
  };

  const handleStatusChange =
    async (id, status) => {
      try {
        await updateAdmissionStatus(
          id,
          status
        );

        await loadAdmissions();
      } catch (requestError) {
        window.alert(
          requestError.response?.data
            ?.message ||
            "Unable to update status."
        );
      }
    };

  const exportCSV = () => {
    if (!admissions.length) {
      return;
    }

    const headers = [
      "Roll No",
      "Student",
      "Course",
      "Batch",
      "Course Fee",
      "Discount",
      "GST",
      "Admission Fee",
      "Final Amount",
      "Admission Date",
      "Status",
    ];

    const rows = admissions.map(
      (admission) => {
        const studentName = [
          admission.student?.firstName,
          admission.student?.surname,
        ]
          .filter(Boolean)
          .join(" ");

        return [
          admission.rollNo,
          studentName,
          admission.course,
          admission.batch,
          admission.courseFee,
          admission.discountAmount,
          admission.gstAmount,
          admission.admissionFee,
          admission.finalAmount,
          admission.admissionDate,
          admission.status,
        ];
      }
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const stringValue =
              String(value ?? "");

            return `"${stringValue.replace(
              /"/g,
              '""'
            )}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "admissions.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="admission-page">
      <Breadcrumb
        items={[
          {
            label: "Home",
            path: "/admin/dashboard",
          },
          {
            label: "Admissions",
          },
        ]}
      />

      <div className="admission-page-header">
        <div>
          <span className="page-eyebrow">
            ADMISSION MANAGEMENT
          </span>

          <h1>
            Manage Admissions
          </h1>

          <p>
            View, create and manage
            student admissions.
          </p>
        </div>

        <div className="admission-header-actions">
          <button
            type="button"
            className="admission-export-button"
            onClick={exportCSV}
          >
            <FiDownload />
            Export
          </button>

          <button
            type="button"
            className="admission-primary-button"
            onClick={() =>
              navigate(
                "/admin/admissions/add"
              )
            }
          >
            <FiPlus />
            Add Admission
          </button>
        </div>
      </div>

      <div className="admission-card">
        <AdmissionFilters
          filters={filters}
          onChange={
            handleFilterChange
          }
          onReset={handleReset}
        />

        {error && (
          <div className="admission-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="admission-loading">
            Loading admissions...
          </div>
        ) : (
          <AdmissionTable
            admissions={admissions}
            onView={
              setSelectedAdmission
            }
            onEdit={(admission) =>
              navigate(
                `/admin/admissions/${admission._id}/edit`
              )
            }
            onDelete={
              handleDelete
            }
            onStatusChange={
              handleStatusChange
            }
          />
        )}

        <div className="admission-pagination">
          <span>
            Showing{" "}
            {admissions.length} of{" "}
            {pagination.total} admissions
          </span>

          <div>
            <button
              type="button"
              disabled={
                pagination.page <= 1
              }
              onClick={() =>
                setPagination(
                  (previous) => ({
                    ...previous,
                    page:
                      previous.page - 1,
                  })
                )
              }
            >
              Previous
            </button>

            <span className="current-page">
              {pagination.page}
            </span>

            <button
              type="button"
              disabled={
                pagination.page >=
                pagination.totalPages
              }
              onClick={() =>
                setPagination(
                  (previous) => ({
                    ...previous,
                    page:
                      previous.page + 1,
                  })
                )
              }
            >
              Next
            </button>

            <select
              value={pagination.limit}
              onChange={(event) =>
                setPagination(
                  (previous) => ({
                    ...previous,
                    limit: Number(
                      event.target.value
                    ),
                    page: 1,
                  })
                )
              }
            >
              <option value="10">
                10 / page
              </option>

              <option value="25">
                25 / page
              </option>

              <option value="50">
                50 / page
              </option>
            </select>
          </div>
        </div>
      </div>

      <AdmissionView
        admission={
          selectedAdmission
        }
        onClose={() =>
          setSelectedAdmission(null)
        }
      />
    </div>
  );
};

export default Admissions;