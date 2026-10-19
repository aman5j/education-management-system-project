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
     
      <div class="page-header"><div><h1> Manage Students</h1></div></div>

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