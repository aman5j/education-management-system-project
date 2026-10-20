import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

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

  const { user, loading: authLoading } = useAuth();

  const canUpdateAdmission = hasPermission(
    user,
    "admissions.update"
  );
  
  const location = useLocation();

  const admissionsPath = location.pathname.startsWith("/staff")
    ? "/staff/admissions"
    : "/admin/admissions";

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

        if (authLoading || !user || !canUpdateAdmission) {
          setLoading(false);
          return;
        }

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
  }, [id, authLoading, user, canUpdateAdmission]);

  const handleSubmit =
    async (formData) => {
      try {

        if (!canUpdateAdmission || saving) {
          throw new Error(
            "You do not have permission to update admissions."
          );
        }

        setSaving(true);

        await updateAdmission(
          id,
          formData
        );

        navigate(`${admissionsPath}/${id}`);

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
  
  if (authLoading) {
    return (
      <div className="admission-state">
        Checking permissions...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canUpdateAdmission) {
    return <Navigate to="/unauthorized" replace />;
  }

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
      <div className="page-header">
        <div>
          <h1>Edit Admission</h1>
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