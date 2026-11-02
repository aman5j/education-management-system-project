
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiUsers,
  FiLock,
  FiCamera,
  FiSave,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";
import "./StudentProfile.css";

const initialForm = {
  firstName: "",
  surname: "",
  fatherName: "",
  motherName: "",
  dob: "",
  gender: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  address: "",
  pincode: "",
};

const getDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { user, updateUser, changePassword } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("personal");
  const [form, setForm] = useState(initialForm);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordVisibility, setPasswordVisibility] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
    });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await studentPortalService.getMyProfile();
      const data = response?.data || {};
      const profile = data.student || {};

      setStudent(profile);
      setForm({
        firstName: profile.firstName || "",
        surname: profile.surname || "",
        fatherName: profile.fatherName || "",
        motherName: profile.motherName || "",
        dob: getDateInput(profile.dob),
        gender: profile.gender || "",
        mobile: profile.mobile || "",
        alternateMobile: profile.alternateMobile || "",
        email: profile.email || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
      });

      if (data.account) {
        updateUser({
          name: data.account.name,
          email: data.account.email,
        });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.firstName.trim().length < 2) {
      setError("First name must contain at least 2 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    try {
      const response = await studentPortalService.updateMyProfile({
        ...form,
        email: form.email.trim().toLowerCase(),
      });

      const updatedStudent = response?.data?.student;
      setStudent(updatedStudent || student);

      if (response?.data?.account) {
        updateUser(response.data.account);
      }

      setSuccess(response?.message || "Profile updated successfully.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      return;
    }

    setPhotoUploading(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await studentPortalService.uploadMyProfilePhoto(file);

      setStudent((current) => ({
        ...current,
        profileImage: response?.data?.profileImage || "",
      }));

      setSuccess(response?.message || "Profile photo updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      navigate("/login", {
        replace: true,
        state: {
          message: "Password changed successfully. Please sign in again.",
        },
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const imageUrl = student?.profileImage
    ? getAssetUrl(student.profileImage)
    : "";

  const displayName =
    [student?.firstName, student?.surname].filter(Boolean).join(" ") ||
    user?.name ||
    "Student";

  if (loading) {
    return (
      <div className="student-profile__loading">
        <FiRefreshCw className="student-profile__spin" />
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="student-profile">
      <header className="student-profile__header">
        <div className="student-profile__title-icon">
          <FiUser />
        </div>
        <div>
          <span className="student-profile__eyebrow">STUDENT PORTAL</span>
          <h1>My Profile</h1>
          <p>View and manage your personal account information.</p>
        </div>
        <button
          type="button"
          className="student-profile__refresh"
          onClick={loadProfile}
          disabled={saving || photoUploading}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && (
        <div className="student-profile__alert student-profile__alert--error">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {success && (
        <div className="student-profile__alert student-profile__alert--success">
          <FiCheckCircle />
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")}>Dismiss</button>
        </div>
      )}

      <div className="student-profile__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "personal"}
          className={activeTab === "personal" ? "active" : ""}
          onClick={() => setActiveTab("personal")}
        >
          <FiUser /> Personal Details
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "guardian"}
          className={activeTab === "guardian" ? "active" : ""}
          onClick={() => setActiveTab("guardian")}
        >
          <FiUsers /> Guardian Details
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "password"}
          className={activeTab === "password" ? "active" : ""}
          onClick={() => setActiveTab("password")}
        >
          <FiLock /> Change Password
        </button>
      </div>

      {activeTab === "personal" && (
        <form
          className="student-profile__panel"
          onSubmit={handleSaveProfile}
        >
          <div className="student-profile__personal-layout">
            <aside className="student-profile__photo-panel">
              <div className="student-profile__photo">
                {imageUrl ? (
                  <img src={imageUrl} alt={displayName} />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <h2>{displayName}</h2>
              <p>Roll No: {student?.rollNo || "—"}</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={handlePhotoChange}
              />

              <button
                type="button"
                className="student-profile__photo-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
              >
                {photoUploading ? (
                  <FiRefreshCw className="student-profile__spin" />
                ) : (
                  <FiCamera />
                )}
                {photoUploading ? "Uploading..." : "Change Photo"}
              </button>

              <small>JPG, PNG or WEBP · Maximum 5 MB</small>
            </aside>

            <div className="student-profile__form-area">
              <div className="student-profile__section-heading">
                <h2>Personal Information</h2>
                <p>Update your personal and contact details.</p>
              </div>

              <div className="student-profile__fields">
                <label>
                  First Name *
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    maxLength={80}
                  />
                </label>

                <label>
                  Surname
                  <input
                    name="surname"
                    value={form.surname}
                    onChange={handleChange}
                    maxLength={80}
                  />
                </label>

                <label>
                  Mobile Number *
                  <input
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    required
                    maxLength={20}
                  />
                </label>

                <label>
                  Alternate Mobile
                  <input
                    name="alternateMobile"
                    value={form.alternateMobile}
                    onChange={handleChange}
                    maxLength={20}
                  />
                </label>

                <label className="student-profile__field-full">
                  Email Address *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    maxLength={150}
                  />
                </label>

                <label>
                  Date of Birth
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Gender
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label className="student-profile__field-full">
                  Address
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    rows={3}
                    maxLength={500}
                  />
                </label>

                <label>
                  Pincode
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    maxLength={10}
                  />
                </label>
              </div>

              <div className="student-profile__actions">
                <button type="submit" disabled={saving}>
                  {saving ? (
                    <FiRefreshCw className="student-profile__spin" />
                  ) : (
                    <FiSave />
                  )}
                  {saving ? "Saving..." : "Update Profile"}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {activeTab === "guardian" && (
        <form
          className="student-profile__panel"
          onSubmit={handleSaveProfile}
        >
          <div className="student-profile__section-heading">
            <h2>Guardian Information</h2>
            <p>Manage the parent or guardian details associated with your student record.</p>
          </div>

          <div className="student-profile__fields student-profile__guardian-fields">
            <label>
              Father's Name
              <input
                name="fatherName"
                value={form.fatherName}
                onChange={handleChange}
                maxLength={100}
              />
            </label>

            <label>
              Mother's Name
              <input
                name="motherName"
                value={form.motherName}
                onChange={handleChange}
                maxLength={100}
              />
            </label>
          </div>

          <div className="student-profile__actions">
            <button type="submit" disabled={saving}>
              {saving ? <FiRefreshCw className="student-profile__spin" /> : <FiSave />}
              {saving ? "Saving..." : "Update Guardian Details"}
            </button>
          </div>
        </form>
      )}

      {activeTab === "password" && (
        <form
          className="student-profile__panel student-profile__password-panel"
          onSubmit={handlePasswordChange}
        >
          <div className="student-profile__section-heading">
            <h2>Change Password</h2>
            <p>Use a strong password that you do not use on other websites.</p>
          </div>

        <div className="student-profile__password-fields">
            {[
                {
                name: "currentPassword",
                label: "Current Password *",
                autoComplete: "current-password",
                },
                {
                name: "newPassword",
                label: "New Password *",
                autoComplete: "new-password",
                },
                {
                name: "confirmPassword",
                label: "Confirm New Password *",
                autoComplete: "new-password",
                },
            ].map((field) => (
                <label key={field.name}>
                {field.label}

                <div className="student-profile__password-input-wrap">
                    <input
                    type={passwordVisibility[field.name] ? "text" : "password"}
                    autoComplete={field.autoComplete}
                    minLength={field.name === "currentPassword" ? undefined : 8}
                    value={passwordForm[field.name]}
                    onChange={(event) =>
                        setPasswordForm((current) => ({
                        ...current,
                        [field.name]: event.target.value,
                        }))
                    }
                    required
                    />

                    <button
                    type="button"
                    className="student-profile__password-toggle"
                    aria-label={
                        passwordVisibility[field.name]
                        ? "Hide password"
                        : "Show password"
                    }
                    title={
                        passwordVisibility[field.name]
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                        setPasswordVisibility((current) => ({
                        ...current,
                        [field.name]: !current[field.name],
                        }))
                    }
                    >
                    {passwordVisibility[field.name] ? <FiEyeOff /> : <FiEye />}
                    </button>
                </div>
                </label>
            ))}
        </div>

          <div className="student-profile__password-note">
            Your account will be signed out after the password is changed.
            Sign in again using your new password.
          </div>

          <div className="student-profile__actions">
            <button type="submit">
              <FiLock /> Change Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
