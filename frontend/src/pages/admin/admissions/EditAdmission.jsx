
import { useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import AdmissionForm from "../../../components/admissions/AdmissionForm";
import {
  getAdmission,
  updateAdmission,
} from "../../../services/admissionService";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

const EditAdmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading: authLoading } = useAuth();
  const canUpdateAdmission = hasPermission(user, "admissions.update");

  const admissionsPath = location.pathname.startsWith("/staff")
    ? "/staff/admissions"
    : "/admin/admissions";

  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !canUpdateAdmission) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadAdmission = async () => {
      setLoading(true);

      try {
        const response = await getAdmission(id);

        if (!cancelled) {
          setAdmission(response?.data?.data || null);
        }
      } catch (error) {
        if (!cancelled) {
          notification.error(getApiErrorMessage(error));
          setAdmission(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadAdmission();

    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user, canUpdateAdmission]);

  const handleSubmit = async (formData) => {
    if (!canUpdateAdmission || saving) {
      throw new Error("You do not have permission to update admissions.");
    }

    setSaving(true);

    try {
      await updateAdmission(id, formData);
      notification.success("Admission updated successfully.");
      navigate(`${admissionsPath}/${id}`);
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
  if (!canUpdateAdmission) return <Navigate to="/unauthorized" replace />;

  if (loading) {
    return <div className="admission-state">Loading admission...</div>;
  }

  if (!admission) {
    return <div className="admission-empty">Admission not found.</div>;
  }

  return (
    <div className="admission-page">
      <div className="page-header">
        <div>
          <h1>Edit Admission</h1>
        </div>
      </div>

      <AdmissionForm
        initialData={admission}
        submitting={saving}
        submitLabel="Update Admission"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditAdmission;
