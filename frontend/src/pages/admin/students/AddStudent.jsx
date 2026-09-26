import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import api from "../../../services/api";

import Breadcrumb from "../../../common/Breadcrumb";

import StudentForm from "../../../components/students/StudentForm";

import "./StudentManagement.css";

const AddStudent = () => {
  const navigate =
    useNavigate();

  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit =
    async (formData) => {
      setSubmitting(true);

      try {
        await api.post(
          "/students",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

        navigate(
          "/admin/students"
        );
      } catch (error) {
        throw new Error(
          error.response?.data
            ?.message ||
            "Unable to create student."
        );
      } finally {
        setSubmitting(false);
      }
    };

  return (
    <div className="student-management-page">
      <Breadcrumb
        currentPage="Add Student"
      />

      <div className="student-page-header">
        <div>
          <span className="student-page-eyebrow">
            STUDENT MANAGEMENT
          </span>

          <h1>
            Add Student
          </h1>

          <p>
            Create a new student record.
          </p>
        </div>
      </div>

      <StudentForm
        onSubmit={
          handleSubmit
        }
        submitting={submitting}
        submitLabel="Create Student"
      />
    </div>
  );
};

export default AddStudent;