
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import AdmissionForm from "../../../components/admissions/AdmissionForm";
import { createAdmission } from "../../../services/admissionService";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

const AddAdmission = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading: authLoading } = useAuth();
  const canCreateAdmission = hasPermission(user, "admissions.create");

  const admissionsPath = location.pathname.startsWith("/staff")
    ? "/staff/admissions"
    : "/admin/admissions";

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData) => {
    if (!canCreateAdmission || saving) {
      throw new Error("You do not have permission to create admissions.");
    }

    setSaving(true);

    try {
      await createAdmission(formData);
      notification.success("Admission created successfully.");
      navigate(admissionsPath);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="admission-state">Checking permissions...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!canCreateAdmission) return <Navigate to="/unauthorized" replace />;

  return (
    <div className="admission-page">
      <div className="page-header">
        <div>
          <h1>Add Admission</h1>
        </div>
      </div>

      <AdmissionForm
        submitting={saving}
        submitLabel="Create Admission"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AddAdmission;
