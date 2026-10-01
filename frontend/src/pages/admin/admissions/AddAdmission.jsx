import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import AdmissionForm from "../../../components/admissions/AdmissionForm";

import {
  createAdmission,
} from "../../../services/admissionService";

const AddAdmission = () => {
  const navigate =
    useNavigate();

  const [saving, setSaving] =
    useState(false);

  const handleSubmit =
    async (formData) => {
      try {
        setSaving(true);

        await createAdmission(
          formData
        );

        navigate(
          "/admin/admissions"
        );
      } catch (error) {
        console.error(
          "Create admission error:",
          error
        );

        throw new Error(
          error?.response?.data
            ?.message ||
            "Unable to create admission."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="admission-page">
      <div className="admission-page-header">
        <div>
          <h1>
            Add Admission
          </h1>

          <p>
            Create a new student
            admission.
          </p>
        </div>
      </div>

      <AdmissionForm
        submitting={saving}
        submitLabel="Create Admission"
        onSubmit={
          handleSubmit
        }
      />
    </div>
  );
};

export default AddAdmission;