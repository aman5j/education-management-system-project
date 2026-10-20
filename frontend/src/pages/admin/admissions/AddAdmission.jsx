import {
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import AdmissionForm from "../../../components/admissions/AdmissionForm";

import {
  createAdmission,
} from "../../../services/admissionService";

const AddAdmission = () => {
  const navigate =
    useNavigate();

  const { user, loading: authLoading } = useAuth();

  const canCreateAdmission = hasPermission(
    user,
    "admissions.create"
  );
  
  const location = useLocation();

  const admissionsPath = location.pathname.startsWith("/staff")
    ? "/staff/admissions"
    : "/admin/admissions";

  const [saving, setSaving] =
    useState(false);

  const handleSubmit =
    async (formData) => {

      if (!canCreateAdmission || saving) {
        throw new Error(
          "You do not have permission to create admissions."
        );
      }

      try {
        setSaving(true);

        await createAdmission(
          formData
        );

        navigate(admissionsPath);

      } catch (error) {
        console.error(
          "Create admission error:",
          error
        );

        throw new Error(
          error?.response?.data
            ?.message ||
            "Unable to create admission."
        );
      } finally {
        setSaving(false);
      }
    };

  if (authLoading) {
    return <div className="admission-state">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canCreateAdmission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="admission-page">
      <div className="page-header">
        <div>
          <h1>
            Add Admission
          </h1>

          {/* <p>
            Create a new student
            admission.
          </p> */}
        </div>
      </div>

      <AdmissionForm
        submitting={saving}
        submitLabel="Create Admission"
        onSubmit={
          handleSubmit
        }
      />
    </div>
  );
};

export default AddAdmission;