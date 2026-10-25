
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import Breadcrumb from "../../../common/Breadcrumb";
import StudentForm from "../../../components/students/StudentForm";
import { uploadStudentDocuments } from "../../../services/studentDocumentService";
import "./StudentManagement.css";

const AddStudent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const studentsPath = location.pathname.startsWith("/staff")
    ? "/staff/students"
    : "/admin/students";

  const canCreate = hasPermission(user, "students.create");

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (formData) => {
    if (!canCreate || submitting) {
      throw new Error("You do not have permission to create students.");
    }

    setSubmitting(true);

    try {
      // await api.post("/students", formData, {
      //   headers: { "Content-Type": "multipart/form-data" },
      // });

      const response = await api.post("/students", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const student = response?.data?.data;
      const documents = formData.getAll("documents");

      if (documents.length > 0) {
        if (!student?._id) {
          throw new Error(
            "Student was created, but its ID was not returned. Documents were not uploaded."
          );
        }

        await uploadStudentDocuments(student._id, documents);
      }

      navigate(studentsPath);

    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Unable to create student."
      );
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

  if (!canCreate) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="student-management-page">
      <Breadcrumb currentPage="Add Student" />

      <div className="student-page-header">
        <div>
          <span className="student-page-eyebrow">STUDENT MANAGEMENT</span>
          <h1>Add Student</h1>
          <p>Create a student record.</p>
        </div>
      </div>

      <StudentForm
        onSubmit={handleSubmit}
        submitting={submitting}
        submitLabel="Create Student"
      />
    </div>
  );
};

export default AddStudent;
