import {
  useEffect,
  useState,
} from "react";

import {
  FiImage,
  FiSave,
} from "react-icons/fi";

import { getAssetUrl } from "../../utils/assetUrl";

const initialForm = {
  rollNo: "",
  firstName: "",
  surname: "",
  fatherName: "",
  motherName: "",
  relationship: "Father",
  dob: "",
  gender: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  address: "",
  pincode: "",
  course: "",
  batch: "",
  showFatherName: true,
  showSurname: true,
  status: "active",
  profileImage: null,
  signature: null,
};

const StudentForm = ({
  initialData = null,
//   initialData !== null,
  onSubmit,
  submitting = false,
  submitLabel = "Save Student",
}) => {
  const [form, setForm] =
    useState(initialForm);

  const [profilePreview, setProfilePreview] =
    useState("");

  const [
    signaturePreview,
    setSignaturePreview,
  ] = useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!initialData) {
      setForm(initialForm);
      return;
    }

    setForm({
      rollNo:
        initialData.rollNo || "",

      firstName:
        initialData.firstName || "",

      surname:
        initialData.surname || "",

      fatherName:
        initialData.fatherName || "",

      motherName:
        initialData.motherName || "",

      relationship:
        initialData.relationship ||
        "Father",

      dob: initialData.dob
        ? initialData.dob.substring(
            0,
            10
          )
        : "",

      gender:
        initialData.gender || "",

      mobile:
        initialData.mobile || "",

      alternateMobile:
        initialData.alternateMobile ||
        "",

      email:
        initialData.email || "",

      address:
        initialData.address || "",

      pincode:
        initialData.pincode || "",

      course:
        initialData.course || "",

      batch:
        initialData.batch || "",

      showFatherName:
        initialData.showFatherName ??
        true,

      showSurname:
        initialData.showSurname ??
        true,

      status:
        initialData.status ||
        "active",

      profileImage: null,
      signature: null,
    });

    // setProfilePreview(
    //   initialData.profileImage ||
    //     ""
    // );

    // setSignaturePreview(
    //   initialData.signature ||
    //     ""
    // );

    // Wrap with getAssetUrl to handle relative backend paths
    setProfilePreview(
      initialData.profileImage ? getAssetUrl(initialData.profileImage) : ""
    );

    setSignaturePreview(
      initialData.signature ? getAssetUrl(initialData.signature) : ""
    );

  }, [initialData]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setError("");
  };

  const handleFileChange = (
    event
  ) => {
    const {
      name,
      files,
    } = event.target;

    const file =
      files?.[0] || null;

    setForm((previous) => ({
      ...previous,
      [name]: file,
    }));

    if (file) {
      const previewUrl =
        URL.createObjectURL(
          file
        );

      if (
        name ===
        "profileImage"
      ) {
        setProfilePreview(
          previewUrl
        );
      }

      if (
        name ===
        "signature"
      ) {
        setSignaturePreview(
          previewUrl
        );
      }
    }
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!form.rollNo.trim()) {
        setError("Roll number is required.");
        return;
    }

    if (!form.firstName.trim()) {
      setError(
        "First name is required."
      );

      return;
    }

    if (!form.mobile.trim()) {
      setError(
        "Mobile number is required."
      );

      return;
    }

    const formData =
      new FormData();

    Object.entries(form).forEach(
      ([key, value]) => {
        if (
          value === null ||
          value === undefined
        ) {
          return;
        }

        if (
          key ===
            "profileImage" ||
          key === "signature"
        ) {
          if (value) {
            formData.append(
              key,
              value
            );
          }

          return;
        }

        formData.append(
          key,
          String(value)
        );
      }
    );

    try {
      await onSubmit(formData);
    } catch (submitError) {
      setError(
        submitError.message ||
          "Unable to save student."
      );
    }
  };

  return (
    <form
      className="student-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="student-form-error">
          {error}
        </div>
      )}

      <section className="student-form-section">
        <div className="student-form-section-header">
          <div>
            <h3>
              Personal Information
            </h3>

            <p>
              Enter the student's basic
              information.
            </p>
          </div>
        </div>

        <div className="student-form-grid">
            

          {/* {form.rollNo && ( */}
            {/* <div className="student-form-group">
            <label>
              Roll Number
            </label>

            <input
              name="rollNo"
              value={form.rollNo}
              onChange={handleChange}
              placeholder="Enter roll number"
              autoComplete="off"
              required
              readOnly={Boolean(initialData)}
            />
          </div> */}
          {/* )} */}

          <div className="student-form-group">
            <label>
                Roll Number <span className="required">*</span>
            </label>

            <input
                type="text"
                name="rollNo"
                value={form.rollNo}
                onChange={handleChange}
                placeholder="Enter roll number"
                autoComplete="off"
                required
                readOnly={Boolean(initialData)}
            />

            {/* <small className="form-help">
                {initialData
                ? "Roll number cannot be changed after student creation."
                : "Enter the student's roll number."}
                
            </small> */}
            </div>

          

          <div className="student-form-group">
            <label>
              First Name *
            </label>

            <input
              name="firstName"
              value={
                form.firstName
              }
              onChange={
                handleChange
              }
              placeholder="Enter first name"
            />
          </div>

          <div className="student-form-group">
            <label>
              Surname
            </label>

            <input
              name="surname"
              value={
                form.surname
              }
              onChange={
                handleChange
              }
              placeholder="Enter surname"
            />
          </div>

          <div className="student-form-group">
            <label>
              Father/Husband Name
            </label>

            <input
              name="fatherName"
              value={
                form.fatherName
              }
              onChange={
                handleChange
              }
              placeholder="Enter father/husband name"
            />
          </div>

          <div className="student-form-group">
            <label>
              Mother Name
            </label>

            <input
              name="motherName"
              value={
                form.motherName
              }
              onChange={
                handleChange
              }
              placeholder="Enter mother name"
            />
          </div>

          <div className="student-form-group">
            <label>
              Relationship
            </label>

            <select
              name="relationship"
              value={
                form.relationship
              }
              onChange={
                handleChange
              }
            >
              <option value="Father">
                Father
              </option>

              <option value="Husband">
                Husband
              </option>

              <option value="Guardian">
                Guardian
              </option>
            </select>
          </div>

          <div className="student-form-group">
            <label>
              Date of Birth
            </label>

            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={
                handleChange
              }
            />
          </div>

          <div className="student-form-group">
            <label>
              Gender
            </label>

            <select
              name="gender"
              value={
                form.gender
              }
              onChange={
                handleChange
              }
            >
              <option value="">
                Select gender
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>

              <option value="Other">
                Other
              </option>
            </select>
          </div>

          <div className="student-form-group">
            <label>
              Status
            </label>

            <select
              name="status"
              value={
                form.status
              }
              onChange={
                handleChange
              }
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

              <option value="suspended">
                Suspended
              </option>
            </select>
          </div>
        </div>
      </section>

      <section className="student-form-section">
        <div className="student-form-section-header">
          <div>
            <h3>
              Contact Information
            </h3>

            <p>
              Add contact and address
              information.
            </p>
          </div>
        </div>

        <div className="student-form-grid">
          <div className="student-form-group">
            <label>
              Mobile *
            </label>

            <input
              name="mobile"
              value={
                form.mobile
              }
              onChange={
                handleChange
              }
              placeholder="Enter mobile number"
            />
          </div>

          <div className="student-form-group">
            <label>
              Alternate Mobile
            </label>

            <input
              name="alternateMobile"
              value={
                form.alternateMobile
              }
              onChange={
                handleChange
              }
              placeholder="Enter alternate mobile"
            />
          </div>

          <div className="student-form-group">
            <label>
              Email
            </label>

            <input
              type="email"
              name="email"
              value={
                form.email
              }
              onChange={
                handleChange
              }
              placeholder="Enter email"
            />
          </div>

          <div className="student-form-group">
            <label>
              Pincode
            </label>

            <input
              name="pincode"
              value={
                form.pincode
              }
              onChange={
                handleChange
              }
              placeholder="Enter pincode"
            />
          </div>

          <div className="student-form-group student-form-full">
            <label>
              Address
            </label>

            <textarea
              name="address"
              value={
                form.address
              }
              onChange={
                handleChange
              }
              placeholder="Enter full address"
              rows="4"
            />
          </div>
        </div>
      </section>

      <section className="student-form-section">
        <div className="student-form-section-header">
          <div>
            <h3>
              Course & Batch
            </h3>

            <p>
              These fields support the
              current Student filters.
            </p>
          </div>
        </div>

        <div className="student-form-grid">
          <div className="student-form-group">
            <label>
              Course
            </label>

            <input
              name="course"
              value={
                form.course
              }
              onChange={
                handleChange
              }
              placeholder="Enter course"
            />
          </div>

          <div className="student-form-group">
            <label>
              Batch
            </label>

            <input
              name="batch"
              value={
                form.batch
              }
              onChange={
                handleChange
              }
              placeholder="Enter batch"
            />
          </div>
        </div>
      </section>

      <section className="student-form-section">
        <div className="student-form-section-header">
          <div>
            <h3>
              Profile Documents
            </h3>

            <p>
              Upload profile image and
              signature.
            </p>
          </div>
        </div>

        <div className="student-upload-grid">
          <div className="student-upload-card">
            <label>
              Profile Image
            </label>

            <div className="student-image-preview">
              {profilePreview ? (
                <img
                  src={
                    profilePreview
                  }
                  alt="Profile preview"
                />
              ) : (
                <FiImage />
              )}
            </div>

            <input
              type="file"
              name="profileImage"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleFileChange
              }
            />

            <span>
              JPG, PNG or WEBP. Max 5MB.
            </span>
          </div>

          <div className="student-upload-card">
            <label>
              Signature
            </label>

            <div className="student-signature-preview">
              {signaturePreview ? (
                <img
                  src={
                    signaturePreview
                  }
                  alt="Signature preview"
                />
              ) : (
                <span>
                  Signature preview
                </span>
              )}
            </div>

            <input
              type="file"
              name="signature"
              accept="image/jpeg,image/png,image/webp"
              onChange={
                handleFileChange
              }
            />

            <span>
              JPG, PNG or WEBP. Max 5MB.
            </span>
          </div>
        </div>
      </section>

      <section className="student-form-section">
        <div className="student-form-section-header">
          <div>
            <h3>
              Certificate Options
            </h3>

            <p>
              Configure how the student's
              certificate name is displayed.
            </p>
          </div>
        </div>

        <div className="student-checkbox-group">
          <label className="student-checkbox">
            <input
              type="checkbox"
              name="showFatherName"
              checked={
                form.showFatherName
              }
              onChange={
                handleChange
              }
            />

            <span>
              Show Father/Husband Name
            </span>
          </label>

          <label className="student-checkbox">
            <input
              type="checkbox"
              name="showSurname"
              checked={
                form.showSurname
              }
              onChange={
                handleChange
              }
            />

            <span>
              Show Surname
            </span>
          </label>
        </div>
      </section>

      <div className="student-form-actions">
        <button
          type="submit"
          className="student-primary-button"
          disabled={submitting}
        >
          <FiSave />

          {submitting
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;