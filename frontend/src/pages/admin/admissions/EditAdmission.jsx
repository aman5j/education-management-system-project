import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import AdmissionForm from "../../../components/admissions/AdmissionForm";

import {
  getAdmission,
  updateAdmission,
} from "../../../services/admissionService";

const EditAdmission = () => {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [admission, setAdmission] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadAdmission =
      async () => {
        try {
          setLoading(true);

          const response =
            await getAdmission(id);

          setAdmission(
            response?.data?.data
          );
        } catch (loadError) {
          console.error(
            "Load admission error:",
            loadError
          );

          setError(
            loadError?.response
              ?.data?.message ||
              "Unable to load admission."
          );
        } finally {
          setLoading(false);
        }
      };

    loadAdmission();
  }, [id]);

  const handleSubmit =
    async (formData) => {
      try {
        setSaving(true);

        await updateAdmission(
          id,
          formData
        );

        navigate(
          `/admin/admissions/${id}`
        );
      } catch (submitError) {
        throw new Error(
          submitError?.response
            ?.data?.message ||
            "Unable to update admission."
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="admission-state">
        Loading admission...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admission-error">
        {error}
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="admission-empty">
        Admission not found.
      </div>
    );
  }

  return (
    <div className="admission-page">
      <div className="admission-page-header">
        <div>
          <h1>
            Edit Admission
          </h1>

          <p>
            Update admission
            information.
          </p>
        </div>
      </div>

      <AdmissionForm
        initialData={
          admission
        }
        submitting={saving}
        submitLabel="Update Admission"
        onSubmit={
          handleSubmit
        }
      />
    </div>
  );
};

export default EditAdmission;