import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import api from "../../../services/api";

import Breadcrumb from "../../../common/Breadcrumb";

import StudentForm from "../../../components/students/StudentForm";

import "./StudentManagement.css";

const EditStudent = () => {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const [student, setStudent] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadStudent =
      async () => {
        try {
          const response =
            await api.get(
              `/students/${id}`
            );

          setStudent(
            response.data.data
          );
        } catch (requestError) {
          setError(
            requestError.response
              ?.data?.message ||
              "Unable to load student."
          );
        } finally {
          setLoading(false);
        }
      };

    loadStudent();
  }, [id]);

  const handleSubmit =
    async (formData) => {
      setSubmitting(true);

      try {
        await api.put(
          `/students/${id}`,
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
      } catch (requestError) {
        throw new Error(
          requestError.response
            ?.data?.message ||
            "Unable to update student."
        );
      } finally {
        setSubmitting(false);
      }
    };

  if (loading) {
    return (
      <div className="student-loading-page">
        <div className="student-spinner" />
        Loading student...
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-page-error">
        {error}
      </div>
    );
  }

  return (
    <div className="student-management-page">
      <Breadcrumb
        currentPage="Edit Student"
      />

      <div className="student-page-header">
        <div>
          <span className="student-page-eyebrow">
            STUDENT MANAGEMENT
          </span>

          <h1>
            Edit Student
          </h1>

          <p>
            Update student information.
          </p>
        </div>
      </div>

      <StudentForm
        initialData={student}
        onSubmit={
          handleSubmit
        }
        submitting={submitting}
        submitLabel="Update Student"
      />
    </div>
  );
};

export default EditStudent;