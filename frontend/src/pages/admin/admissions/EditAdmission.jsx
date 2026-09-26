import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import Breadcrumb from "../../../common/Breadcrumb";

import AdmissionForm from "../../../components/admissions/AdmissionForm";

import {
  getAdmission,
  updateAdmission,
} from "../../../services/admissionService";

import api from "../../../services/api";

import "./AdmissionManagement.css";

const EditAdmission = () => {
  const {
    id,
  } = useParams();

  const navigate = useNavigate();

  const [admission, setAdmission] =
    useState(null);

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [
          admissionResponse,
          studentsResponse,
        ] = await Promise.all([
          getAdmission(id),

          api.get("/students", {
            params: {
              limit: 100,
            },
          }),
        ]);

        setAdmission(
          admissionResponse.data
        );

        setStudents(
          studentsResponse.data.data
            .students
        );
      } catch (error) {
        window.alert(
          error.response?.data
            ?.message ||
            "Unable to load admission."
        );

        navigate(
          "/admin/admissions"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);

  const handleSubmit = async (
    data
  ) => {
    try {
      setSubmitting(true);

      await updateAdmission(
        id,
        data
      );

      window.alert(
        "Admission updated successfully."
      );

      navigate(
        "/admin/admissions"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="admission-page">
        <div className="admission-card admission-loading">
          Loading admission...
        </div>
      </div>
    );
  }

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
            path: "/admin/admissions",
          },
          {
            label: "Edit Admission",
          },
        ]}
      />

      <div className="admission-page-header">
        <div>
          <span className="page-eyebrow">
            ADMISSION MANAGEMENT
          </span>

          <h1>
            Edit Admission
          </h1>

          <p>
            Update admission
            information.
          </p>
        </div>
      </div>

      <div className="admission-card">
        <AdmissionForm
          students={students}
          initialData={admission}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="Update Admission"
        />
      </div>
    </div>
  );
};

export default EditAdmission;