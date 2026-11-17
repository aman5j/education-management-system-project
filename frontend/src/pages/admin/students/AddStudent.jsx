
import { useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import notification from "../../../utils/notification";
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
    if (!canCreate) {
      notification.error("You do not have permission to create students.");
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      // !!!!! INSERTION START: EXTRACT DOCUMENT FILES AND NAMES !!!!!
      const documentFiles = formData.getAll("documents");

      let documentNames = [];

      try {
        documentNames = JSON.parse(
          formData.get("documentNames") || "[]"
        );
      } catch {
        throw new Error("Invalid document names.");
      }

      if (documentFiles.length !== documentNames.length) {
        throw new Error("Please provide a name for every document.");
      }

      const documents = documentFiles.map((file, index) => ({
        file,
        displayName: String(documentNames[index] || "").trim(),
      }));

      if (documents.some((document) => !document.displayName)) {
        throw new Error("Please enter a name for every document.");
      }

      const studentFormData = new FormData();

      for (const [key, value] of formData.entries()) {
        if (
          key !== "documents" &&
          key !== "documentNames"
        ) {
          studentFormData.append(key, value);
        }
      }
      // !!!!! INSERTION END: EXTRACT DOCUMENT FILES AND NAMES !!!!!

      const response = await api.post("/students", studentFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        silent: true,
      });

      const student = response?.data?.data;

      if (!student?._id) {
        throw new Error(
          "Student was created, but the server did not return the student ID."
        );
      }

      // !!!!! INSERTION START: UPLOAD NAMED STUDENT DOCUMENTS !!!!!
      if (documents.length > 0) {
        try {
          await uploadStudentDocuments(student._id, documents);
        } catch (error) {
          navigate(`${studentsPath}/${student._id}/edit`, {
            replace: true,
          });

          throw new Error(
            error?.response?.data?.message ||
              "Student was created, but document upload failed. You have been redirected to Edit Student to retry."
          );
        }
      }
      // !!!!! INSERTION END: UPLOAD NAMED STUDENT DOCUMENTS !!!!!

      notification.success("Student created successfully.");
      navigate(studentsPath, { replace: true });
    } catch (requestError) {
      throw new Error(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to create student."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="student-loading-page">
        Checking permissions...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!canCreate) return <Navigate to="/unauthorized" replace />;

  return (
    <div className="student-management-page">
      <div className="page-header">
        <div>
          <h1>Add New Student</h1>
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
