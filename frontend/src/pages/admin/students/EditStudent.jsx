
import { useCallback, useEffect, useState } from "react";
import {
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";

import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import notification from "../../../utils/notification";
import StudentForm from "../../../components/students/StudentForm";
import "./StudentManagement.css";

const EditStudent = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const studentsPath = location.pathname.startsWith("/staff")
    ? "/staff/students"
    : "/admin/students";

  const canUpdate = hasPermission(user, "students.update");

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadStudent = useCallback(async () => {
    if (!id || !canUpdate) return;

    setLoading(true);
    setLoadFailed(false);

    try {
      const response = await api.get(`/students/${id}`, {
        silent: true,
      });

      const record = response?.data?.data;

      if (!record) {
        throw new Error("Student record was not returned by the server.");
      }

      setStudent(record);
    } catch (error) {
      setStudent(null);
      setLoadFailed(true);
      notification.error(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load student."
      );
    } finally {
      setLoading(false);
    }
  }, [id, canUpdate]);

  useEffect(() => {
    if (!authLoading && user && canUpdate) {
      loadStudent();
    }
  }, [authLoading, user, canUpdate, loadStudent]);

  const handleSubmit = async (formData) => {
    if (!canUpdate) {
      throw new Error("You do not have permission to update students.");
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      await api.put(`/students/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        silent: true,
      });

      navigate(studentsPath, {
        state: { notification: "Student updated successfully." },
      });
    } catch (requestError) {
      throw new Error(
        requestError?.response?.data?.message ||
        requestError?.message ||
        "Unable to update student."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="student-loading-page">Checking permissions...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!canUpdate) return <Navigate to="/unauthorized" replace />;

  if (loading) {
    return (
      <div className="student-loading-page">
        <div className="student-spinner" />
        Loading student...
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="student-management-page">
        <div className="student-page-error">
          Unable to load this student.
          <button type="button" onClick={loadStudent}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="student-management-page">
        <div className="student-page-error">Student not found.</div>
      </div>
    );
  }

  return (
    <div className="student-management-page">
      <div className="page-header">
        <div><h1>Edit Student</h1></div>
      </div>

      <StudentForm
        initialData={student}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Update Student"
      />
    </div>
  );
};

export default EditStudent;
