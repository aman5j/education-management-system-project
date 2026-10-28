
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
import Breadcrumb from "../../../common/Breadcrumb";
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
  const [error, setError] = useState("");

  const loadStudent = useCallback(async () => {
    if (authLoading || !user || !canUpdate) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/students/${id}`);
      setStudent(response.data.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load student."
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, canUpdate, id]);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !canUpdate) {
      setLoading(false);
      return;
    }

    loadStudent();
  }, [authLoading, user, canUpdate, loadStudent]);

  const handleSubmit = async (formData) => {
    if (!canUpdate || submitting) {
      throw new Error("You do not have permission to update students.");
    }

    setSubmitting(true);

    try {
      await api.put(`/students/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      navigate(studentsPath);
    } catch (requestError) {
        const message =
          requestError.response?.data?.message ||
          requestError.message ||
          "Unable to save student.";

        throw new Error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="student-loading-page">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canUpdate) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="student-loading-page">
        <div className="student-spinner" />
        Loading student...
      </div>
    );
  }

  if (error) {
    return <div className="student-page-error">{error}</div>;
  }

  if (!student) {
    return <div className="student-page-error">Student not found.</div>;
  }

  return (
    <div className="student-management-page">
      <Breadcrumb currentPage="Edit Student" />

      <div className="student-page-header">
        <div>
          <span className="student-page-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Edit Student</h1>
          <p>Update student information.</p>
        </div>
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
