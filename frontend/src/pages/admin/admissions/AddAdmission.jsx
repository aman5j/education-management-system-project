import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import Breadcrumb from "../../../common/Breadcrumb";

import AdmissionForm from "../../../components/admissions/AdmissionForm";

import {
  createAdmission,
} from "../../../services/admissionService";

import api from "../../../services/api";

import "./AdmissionManagement.css";

const AddAdmission = () => {
  const navigate = useNavigate();

  const [students, setStudents] =
    useState([]);

  const [loadingStudents, setLoadingStudents] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoadingStudents(true);

        const response =
          await api.get(
            "/students",
            {
              params: {
                limit: 100,
                sortBy: "firstName",
                sortOrder: "asc",
              },
            }
          );

        setStudents(
          response.data.data.students
        );
      } catch (error) {
        window.alert(
          error.response?.data
            ?.message ||
            "Unable to load students."
        );
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, []);

  const handleSubmit = async (
    data
  ) => {
    try {
      setSubmitting(true);

      await createAdmission(data);

      window.alert(
        "Admission created successfully."
      );

      navigate(
        "/admin/admissions"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admission-page">
      <Breadcrumb
        items={[
          {
            label: "Home",
            path: "/admin/dashboard",
          },
          {
            label: "Admissions",
            path: "/admin/admissions",
          },
          {
            label: "Add Admission",
          },
        ]}
      />

      <div className="admission-page-header">
        <div>
          <span className="page-eyebrow">
            ADMISSION MANAGEMENT
          </span>

          <h1>
            Add Admission
          </h1>

          <p>
            Create a new student
            admission.
          </p>
        </div>
      </div>

      {loadingStudents ? (
        <div className="admission-card admission-loading">
          Loading students...
        </div>
      ) : (
        <div className="admission-card">
          <AdmissionForm
            students={students}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="Create Admission"
          />
        </div>
      )}
    </div>
  );
};

export default AddAdmission;