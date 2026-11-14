
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiUsers,
  FiLock,
  FiCamera,
  FiSave,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { FaIdCard } from "react-icons/fa";
import { IoMdInformationCircle } from "react-icons/io";
import { MdOutgoingMail } from "react-icons/md";
import { IoIosCall } from "react-icons/io";

import { useAuth } from "../../context/AuthContext";
import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

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
  getApiErrorMessage(error) ||
  "Something went wrong. Please try again.";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { user, updateUser, changePassword } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("personal");
  const [form, setForm] = useState(initialForm);
  const [student, setStudent] = useState(null);
  const [loginEmail, setLoginEmail] = useState(user?.email || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

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

    try {
      const response = await studentPortalService.getMyProfile();

      const data = response?.data || {};
      const profile = data.student || {};
      const account = data.account || {};

      setStudent(profile);

      setLoginEmail(
        account.email || user?.email || profile.email || ""
      );

      setForm({
        firstName: profile.firstName || "",
        surname: profile.surname || "",
        fatherName: profile.fatherName || "",
        motherName: profile.motherName || "",
        dob: getDateInput(profile.dob),
        gender: profile.gender || "",
        mobile: profile.mobile || "",
        alternateMobile: profile.alternateMobile || "",
        address: profile.address || "",
        pincode: profile.pincode || "",
      });

      if (account.name) {
        updateUser({ name: account.name });
      }
    } catch (err) {
      notification.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [updateUser, user?.email]);

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

    if (form.firstName.trim().length < 2) {
      notification.warning(
        "First name must contain at least 2 characters."
      );
      return;
    }

    setSaving(true);

    try {
      // Login email is intentionally excluded from this request.
      const response = await studentPortalService.updateMyProfile({
        firstName: form.firstName,
        surname: form.surname,
        fatherName: form.fatherName,
        motherName: form.motherName,
        dob: form.dob,
        gender: form.gender,
        mobile: form.mobile,
        alternateMobile: form.alternateMobile,
        address: form.address,
        pincode: form.pincode,
      });

      const updatedStudent = response?.data?.student;

      if (updatedStudent) {
        setStudent(updatedStudent);
      }

      if (response?.data?.account?.name) {
        updateUser({
          name: response.data.account.name,
        });
      }

      if (response?.data?.account?.email) {
        setLoginEmail(response.data.account.email);
      }

      notification.success(
        response?.message || "Profile updated successfully."
      );
    } catch (err) {
      notification.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      notification.warning(
        "Choose a JPG, PNG or WEBP image."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      notification.warning(
        "Profile photo must be 5 MB or smaller."
      );
      return;
    }

    setPhotoUploading(true);

    try {
      const response =
        await studentPortalService.uploadMyProfilePhoto(file);

      setStudent((current) => ({
        ...current,
        profileImage: response?.data?.profileImage || "",
      }));

      notification.success(
        response?.message || "Profile photo updated."
      );
    } catch (err) {
      notification.error(errorMessage(err));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword.length < 8) {
      notification.warning(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !== passwordForm.confirmPassword
    ) {
      notification.warning(
        "New password and confirmation do not match."
      );
      return;
    }

    const confirmed = await notification.confirm({
      title: "Change Account Password?",
      text:
        "Your current session will end after the password is changed. You will need to sign in again using your new password.",
      icon: "warning",
      confirmText: "Yes, Change Password",
      cancelText: "Go Back",
      confirmButtonColor: "#2563eb",
    });

    if (!confirmed) return;

    setPasswordSaving(true);

    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        { silent: true }
      );

      notification.success(
        "Password changed successfully. Please sign in again."
      );

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Password changed successfully. Please sign in again.",
        },
      });
    } catch (err) {
      notification.error(errorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  };

  const imageUrl = student?.profileImage
    ? getAssetUrl(student.profileImage)
    : "";

  const signatureUrl = student?.signature
    ? getAssetUrl(student.signature)
    : "";

  const displayName =
    [student?.firstName, student?.surname]
      .filter(Boolean)
      .join(" ") ||
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
      <section className="common-card">
        <div className="profile-header__banner"></div>

        <div className="profile-header__content">
          <div className="profile-header__image">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  event.currentTarget.parentElement.dataset.imageError =
                    "true";
                }}
              />
            ) : (
              <span>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}

            <div className="uploadicon">
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
                {photoUploading ? "Uploading..." : "Edit"}
              </button>
            </div>
          </div>

          <div className="profile-header__details">
            <h1>{displayName}</h1>

            {signatureUrl && (
              <img
                key={signatureUrl}
                className="student-sign"
                src={signatureUrl}
                alt={`${displayName} signature`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}

            <div className="profile-header__meta">
              <div className="profile-header__item">
                <FaIdCard />
                <span>
                  Roll No: {student?.rollNo || "—"}
                </span>
              </div>

              <div className="profile-header__item">
                <MdOutgoingMail />
                <span>{student?.email || "—"}</span>
              </div>

              <div className="profile-header__item">
                <IoIosCall />
                <span>{student?.mobile || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

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
          className="common-card"
          onSubmit={handleSaveProfile}
        >
          <div className="panel-header">
            <div>
              <h3>Personal Information</h3>
              <p>Update your personal and contact details.</p>
            </div>
          </div>

          <div className="cardbody">
            <div className="student-profile__fields">
              <div className="input-felid">
                <label>
                  First Name <span className="required">*</span>
                </label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  maxLength={80}
                />
              </div>

              <div className="input-felid">
                <label>Surname</label>
                <input
                  name="surname"
                  value={form.surname}
                  onChange={handleChange}
                  maxLength={80}
                />
              </div>

              <div className="input-felid">
                <label>
                  Mobile Number <span className="required">*</span>
                </label>
                <input
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  required
                  maxLength={20}
                />
              </div>

              <div className="input-felid">
                <label>Alternate Mobile</label>
                <input
                  name="alternateMobile"
                  value={form.alternateMobile}
                  onChange={handleChange}
                  maxLength={20}
                />
              </div>

              <div className="input-felid">
                <label>
                  Login Email Address
                  <span
                    className="infoicon tooltip"
                    data-tooltip="This email is your student login ID. Contact your institute administrator if it needs to be changed."
                  >
                    <IoMdInformationCircle />
                  </span>
                </label>

                <input
                  type="email"
                  value={loginEmail}
                  readOnly
                  aria-readonly="true"
                  title="Your login email can only be managed by the institute administrator."
                />
              </div>

              <div className="input-felid">
                <label>Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob}
                  onChange={handleChange}
                />
              </div>

              <div className="input-felid">
                <label>Gender</label>
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
              </div>

              <div className="input-felid">
                <label>Pincode</label>
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handleChange}
                  maxLength={10}
                />
              </div>

              <div className="input-felid student-form-full">
                <label>Address</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="student-profile__actions">
              <button
                className="themebtn"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <FiRefreshCw className="student-profile__spin" />
                ) : (
                  <FiSave />
                )}
                {saving ? "Saving..." : "Update Profile"}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === "guardian" && (
        <form
          className="common-card"
          onSubmit={handleSaveProfile}
        >
          <div className="panel-header">
            <div>
              <h3>Guardian Information</h3>
              <p>
                Manage the parent or guardian details associated
                with your student record.
              </p>
            </div>
          </div>

          <div className="cardbody">
            <div className="student-profile__fields student-profile__guardian-fields">
              <div className="input-felid">
                <label>Father's Name</label>
                <input
                  name="fatherName"
                  value={form.fatherName}
                  onChange={handleChange}
                  maxLength={100}
                />
              </div>

              <div className="input-felid">
                <label>Mother's Name</label>
                <input
                  name="motherName"
                  value={form.motherName}
                  onChange={handleChange}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="student-profile__actions">
              <button
                className="themebtn"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <FiRefreshCw className="student-profile__spin" />
                ) : (
                  <FiSave />
                )}
                {saving
                  ? "Saving..."
                  : "Update Guardian Details"}
              </button>
            </div>
          </div>
        </form>
      )}

      {activeTab === "password" && (
        <form
          className="common-card"
          onSubmit={handlePasswordChange}
        >
          <div className="student-profile__password-fields cardbody">
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
              <div
                className="student-profile__password-input-wrap input-felid"
                key={field.name}
              >
                <label>{field.label}</label>

                <input
                  type={
                    passwordVisibility[field.name]
                      ? "text"
                      : "password"
                  }
                  autoComplete={field.autoComplete}
                  minLength={
                    field.name === "currentPassword"
                      ? undefined
                      : 8
                  }
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
                  {passwordVisibility[field.name] ? (
                    <FiEyeOff />
                  ) : (
                    <FiEye />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="cardbody">
            <div className="student-profile__password-note">
              Your account will be signed out after the password
              is changed. Sign in again using your new password.
            </div>

            <div className="student-profile__actions">
              <button
                type="submit"
                className="themebtn"
                disabled={passwordSaving}
              >
                {passwordSaving ? (
                  <FiRefreshCw className="student-profile__spin" />
                ) : (
                  <FiLock />
                )}
                {passwordSaving
                  ? "Changing Password..."
                  : "Change Password"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
