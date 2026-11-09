
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiPhone,
  FiShield,
  FiUpload,
  FiLock,
  FiEye,
  FiUser,
  FiSave,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import instituteSettingsService from "../../services/instituteSettingsService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";
import { getAssetUrl } from "../../utils/assetUrl";

import "../../styles/AdminProfile.css";

const EMPTY_SETTINGS = {
  instituteName: "",
  legalName: "",
  registrationNumber: "",
  designation: "",
  logoUrl: "",
  stampUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  controllerName: "",
  controllerDesignation: "Examination Controller",
  controllerEmployeeId: "",
  controllerEmail: "",
  controllerPhone: "",
  controllerSignatureUrl: "",
  showControllerNameOnCertificate: true,
  showControllerSignatureOnCertificate: true,
  ownerName: "",
  ownerPhotoUrl: "",
  ownerSignatureUrl: "",
  showOwnerOnCertificate: false,
};

const EMPTY_ADMIN = {
  name: "",
  email: "",
  phone: "",
};

const EMPTY_PASSWORD = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const IMAGE_FIELDS = {
  logo: "logoUrl",
  stamp: "stampUrl",
  controllerSignature: "controllerSignatureUrl",
  ownerPhoto: "ownerPhotoUrl",
  ownerSignature: "ownerSignatureUrl",
};

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "I";

const normalizeSettings = (data = {}) => ({
  ...EMPTY_SETTINGS,
  ...data,
  address:
    data.address ||
    [data.addressLine1, data.addressLine2]
      .filter(Boolean)
      .join(", "),
});

const Field = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  maxLength,
  autoComplete,
}) => (
  <label className="admin-profile-field">
    <span>{label}</span>

    <input
      className="admin-profile-input"
      name={name}
      type={type}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      autoComplete={autoComplete}
    />
  </label>
);

const TextAreaField = ({
  label,
  name,
  value,
  onChange,
}) => (
  <label className="admin-profile-field fullinput">
    <span>{label}</span>

    <textarea
      className="admin-profile-input admin-profile-textarea"
      name={name}
      value={value ?? ""}
      onChange={onChange}
      rows={3}
      maxLength={500}
    />
  </label>
);

const CheckField = ({
  label,
  name,
  checked,
  onChange,
}) => (
  <label className="admin-profile-checkbox">
    <input
      type="checkbox"
      name={name}
      checked={Boolean(checked)}
      onChange={onChange}
    />

    <span>{label}</span>
  </label>
);

const ImageUploader = ({
  title,
  previewTitle,
  value,
  uploading,
  onChange,
}) => {
  const [previewError, setPreviewError] = useState(false);

  const imageUrl = getAssetUrl(value);

  useEffect(() => {
    setPreviewError(false);
  }, [imageUrl]);

  return (
    <div className="admin-profile-upload-row">
      <div className="admin-profile-upload-box">
        <span className="admin-profile-upload-icon">
          <FiUpload />
        </span>

        <strong>
          {uploading ? "Uploading..." : `Upload ${title}`}
        </strong>

        <small>JPG, PNG or WEBP · Maximum 2 MB</small>

        <label className="admin-profile-browse-button">
          Browse files

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={uploading}
            onChange={onChange}
          />
        </label>
      </div>

      <div className="admin-profile-preview-box">
        <span>{previewTitle}</span>

        <div className="admin-profile-preview-canvas">
          {imageUrl && !previewError ? (
            <img
              key={imageUrl}
              src={imageUrl}
              alt={previewTitle}
              onError={() => setPreviewError(true)}
            />
          ) : (
            <small>
              {previewError
                ? "Image could not be loaded. Check the backend URL."
                : "No image uploaded"}
            </small>
          )}
        </div>

        {imageUrl && !previewError && (
          <a
            className="preview-image tooltip"
            data-tooltip="View Full Image"
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`View ${previewTitle}`}
          >
            <FiEye />
          </a>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();

  const {
    user,
    updateUser,
    changePassword,
  } = useAuth();

  const [admin, setAdmin] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);

  const hasUploadingImage = Object.values(uploading).some(Boolean);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const data = await instituteSettingsService.getSettings();

        if (!mounted) return;

        setSettings(normalizeSettings(data));
        setLoadingError(false);
      } catch (error) {
        if (!mounted) return;

        setLoadingError(true);
        notification.error(getApiErrorMessage(error));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setAdmin({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user?.name, user?.email, user?.phone]);

  const handleAdminChange = (event) => {
    const { name, value } = event.target;

    setAdmin((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSettingsChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = async (event, assetType) => {
    const file = event.target.files?.[0];

    // Reset input so selecting the same file again also works.
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      notification.warning("Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      notification.warning("Image must be 2 MB or smaller.");
      return;
    }

    if (uploading[assetType]) return;

    setUploading((previous) => ({
      ...previous,
      [assetType]: true,
    }));

    try {
      const updatedSettings =
        assetType === "logo"
          ? await instituteSettingsService.uploadLogo(file)
          : await instituteSettingsService.uploadAsset(
              assetType,
              file
            );

      if (!updatedSettings) {
        throw new Error(
          "The server did not return updated institute settings."
        );
      }

      const normalized = normalizeSettings(updatedSettings);

      setSettings((previous) => ({
        ...previous,
        ...normalized,
      }));

      if (assetType === "logo") {
        window.dispatchEvent(
          new CustomEvent("ems:institute-logo-updated", {
            detail: {
              logoUrl: normalized.logoUrl,
            },
          })
        );
      }

      const labels = {
        logo: "Institute logo",
        stamp: "Institute stamp",
        controllerSignature: "Controller signature",
        ownerPhoto: "Owner photo",
        ownerSignature: "Owner signature",
      };

      notification.success(
        `${labels[assetType] || "Image"} uploaded successfully.`
      );
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setUploading((previous) => ({
        ...previous,
        [assetType]: false,
      }));
    }
  };

  const imageField = (
    title,
    previewTitle,
    fieldName,
    assetType
  ) => (
    <div
      className="admin-profile-field fullinput"
      key={fieldName}
    >
      <span className="admin-profile-field-label">
        {title}
      </span>

      <ImageUploader
        title={title.replace(/^Upload\s+/i, "")}
        previewTitle={previewTitle}
        value={settings[fieldName]}
        uploading={Boolean(uploading[assetType])}
        onChange={(event) =>
          handleImageUpload(event, assetType)
        }
      />
    </div>
  );

  const validateProfile = () => {
    if (admin.name.trim().length < 2) {
      notification.warning(
        "Admin name must contain at least 2 characters."
      );
      return false;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim())
    ) {
      notification.warning("Enter a valid admin email address.");
      return false;
    }

    if (admin.phone.trim().length > 20) {
      notification.warning(
        "Admin phone number cannot exceed 20 characters."
      );
      return false;
    }

    if (settings.instituteName.trim().length < 2) {
      notification.warning(
        "Institute name must contain at least 2 characters."
      );
      return false;
    }

    if (settings.instituteName.trim().length > 150) {
      notification.warning(
        "Institute name cannot exceed 150 characters."
      );
      return false;
    }

    return true;
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving || hasUploadingImage) return;
    if (!validateProfile()) return;

    setSaving(true);

    let instituteSettingsSaved = false;

    try {
      // Save institute settings first.
      const savedSettings =
        await instituteSettingsService.updateSettings({
          ...settings,
          instituteName: settings.instituteName.trim(),
        });

      if (!savedSettings) {
        throw new Error(
          "The server did not return saved institute settings."
        );
      }

      instituteSettingsSaved = true;

      setSettings(normalizeSettings(savedSettings));

      // Save admin account details separately.
      const adminResponse = await api.put(
        "/auth/profile",
        {
          name: admin.name.trim(),
          email: admin.email.trim(),
          phone: admin.phone.trim(),
        },
        {
          silent: true,
        }
      );

      const updatedUser = adminResponse?.data?.data?.user;

      if (!updatedUser) {
        throw new Error(
          "Institute settings were saved, but the server did not return the updated admin account."
        );
      }

      updateUser(updatedUser);

      setAdmin({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      notification.success(
        "Admin profile and institute settings saved successfully."
      );
    } catch (error) {
      if (instituteSettingsSaved) {
        notification.warning(
          `Institute settings were saved, but the admin profile could not be updated. ${getApiErrorMessage(error)}`
        );
      } else {
        notification.error(getApiErrorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();

    if (passwordSaving) return;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      notification.warning("Complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      notification.warning(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword.length > 128) {
      notification.warning(
        "New password cannot exceed 128 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      notification.warning(
        "New password and confirmation do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      notification.warning(
        "Your new password must be different from your current password."
      );
      return;
    }

    setPasswordSaving(true);

    try {
      await changePassword(currentPassword, newPassword);

      notification.success(
        "Password changed successfully. Please sign in again."
      );

      navigate("/login", {
        replace: true,
        state: {
          message: "Password changed. Please sign in again.",
        },
      });
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-profile-page">
        Loading profile settings...
      </div>
    );
  }

  return (
    <div className="admin-profile-page">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
        </div>
      </div>

      <div className="admin-profile-layout">
        <aside className="admin-profile-sidebar-card common-card">
          <span className="admin-profile-account-status">
            {user?.status || "active"}
          </span>

          <div className="admin-profile-avatar">
            {settings.logoUrl ? (
              <img
                src={getAssetUrl(settings.logoUrl)}
                alt={`${settings.instituteName || "Institute"} logo`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  padding: "8px",
                  background: "#ffffff",
                }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              getInitials(settings.instituteName || "Institute")
            )}
          </div>

          <div className="admin-profile-identity">
            <h2>
              {settings.instituteName || "Institute Name"}
            </h2>

            <p>
              <FiUser />
              <span>{admin.name || "Admin name unavailable"}</span>
            </p>

            <p>
              <FiMail />
              <span>{admin.email || "No email available"}</span>
            </p>

            <p>
              <FiPhone />
              <span>{admin.phone || "No phone available"}</span>
            </p>

            <p>
              <FiShield />
              <span>{user?.role || "admin"}</span>
            </p>

            <small>
              Last login:{" "}
              {user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("en-IN")
                : "Unavailable"}
            </small>
          </div>

          <button
            type="button"
            className="admin-profile-password-toggle"
            onClick={() =>
              setShowPasswordForm((previous) => !previous)
            }
          >
            <FiLock />
            {showPasswordForm ? "Hide Password Form" : "Change Password"}
          </button>

          {showPasswordForm && (
            <form
              className="admin-profile-password-form"
              onSubmit={handlePasswordChange}
            >
              <label>
                Current password

                <input
                  type="password"
                  autoComplete="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((previous) => ({
                      ...previous,
                      currentPassword: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                New password

                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((previous) => ({
                      ...previous,
                      newPassword: event.target.value,
                    }))
                  }
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>

              <label>
                Confirm new password

                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value,
                    }))
                  }
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>

              <button
                className="themebtn"
                type="submit"
                disabled={passwordSaving}
              >
                {passwordSaving
                  ? "Updating..."
                  : "Update Password"}
              </button>
            </form>
          )}
        </aside>

        <form
          className="admin-profile-form"
          onSubmit={handleSave}
        >
          {loadingError && (
            <section className="common-card">
              <div className="admin-profile-section-body">
                <p>
                  Institute settings could not be loaded.
                  Please refresh the page before making changes.
                </p>

                <button
                  type="button"
                  className="themebtn"
                  onClick={() => window.location.reload()}
                >
                  Reload Profile
                </button>
              </div>
            </section>
          )}

          <section className="common-card">
            <div className="panel-header">
              <div>
                <h3>Basic Details</h3>
              </div>
            </div>

            <div className="admin-profile-section-body">
              <div className="admin-profile-grid">
                <Field
                  label="Institute Name"
                  name="instituteName"
                  value={settings.instituteName}
                  onChange={handleSettingsChange}
                  required
                  maxLength={150}
                />

                <Field
                  label="Admin Name"
                  name="name"
                  value={admin.name}
                  onChange={handleAdminChange}
                  required
                  maxLength={100}
                  autoComplete="name"
                />

                <Field
                  label="Admin Email Address"
                  name="email"
                  type="email"
                  value={admin.email}
                  onChange={handleAdminChange}
                  required
                  maxLength={254}
                  autoComplete="email"
                />

                <Field
                  label="Admin Phone Number"
                  name="phone"
                  value={admin.phone}
                  onChange={handleAdminChange}
                  maxLength={20}
                  autoComplete="tel"
                />

                <div className="admin-profile-field">
                  <span>Account Role</span>

                  <div className="admin-profile-readonly">
                    <span>{user?.role || "admin"}</span>
                    <small>Managed by system permissions</small>
                  </div>
                </div>

                {imageField(
                  "Upload Institute Logo",
                  "Preview of your Logo",
                  "logoUrl",
                  "logo"
                )}

                {imageField(
                  "Upload Institute Stamp",
                  "Preview of your Stamp",
                  "stampUrl",
                  "stamp"
                )}
              </div>
            </div>
          </section>

          <section className="common-card">
            <div className="panel-header">
              <div>
                <h3>Contact Details</h3>
              </div>
            </div>

            <div className="admin-profile-section-body">
              <div className="admin-profile-grid">
                <Field
                  label="Institute Email"
                  name="email"
                  type="email"
                  value={settings.email}
                  onChange={handleSettingsChange}
                  maxLength={254}
                />

                <Field
                  label="Institute Mobile Number"
                  name="phone"
                  value={settings.phone}
                  onChange={handleSettingsChange}
                  maxLength={25}
                />

                <Field
                  label="Alternate Mobile"
                  name="alternatePhone"
                  value={settings.alternatePhone}
                  onChange={handleSettingsChange}
                  maxLength={25}
                />

                <Field
                  label="State"
                  name="state"
                  value={settings.state}
                  onChange={handleSettingsChange}
                  maxLength={100}
                />

                <Field
                  label="City"
                  name="city"
                  value={settings.city}
                  onChange={handleSettingsChange}
                  maxLength={100}
                />

                <Field
                  label="Pincode"
                  name="postalCode"
                  value={settings.postalCode}
                  onChange={handleSettingsChange}
                  maxLength={20}
                />

                <Field
                  label="Country"
                  name="country"
                  value={settings.country}
                  onChange={handleSettingsChange}
                  maxLength={100}
                />

                <Field
                  label="Website"
                  name="website"
                  type="url"
                  value={settings.website}
                  onChange={handleSettingsChange}
                  placeholder="https://example.com"
                  maxLength={300}
                />

                <TextAreaField
                  label="Full Institute Address"
                  name="address"
                  value={settings.address}
                  onChange={handleSettingsChange}
                />
              </div>
            </div>
          </section>

          <section className="common-card">
            <div className="panel-header">
              <div>
                <h3>Certificate Information</h3>
              </div>
            </div>

            <div className="admin-profile-section-body">
              <div className="admin-profile-grid">
                <Field
                  label="Controller / Examiner Name"
                  name="controllerName"
                  value={settings.controllerName}
                  onChange={handleSettingsChange}
                  maxLength={120}
                />

                <Field
                  label="Controller Designation"
                  name="controllerDesignation"
                  value={settings.controllerDesignation}
                  onChange={handleSettingsChange}
                  maxLength={100}
                />

                <Field
                  label="Employee ID"
                  name="controllerEmployeeId"
                  value={settings.controllerEmployeeId}
                  onChange={handleSettingsChange}
                  maxLength={50}
                />

                <Field
                  label="Controller Email"
                  name="controllerEmail"
                  type="email"
                  value={settings.controllerEmail}
                  onChange={handleSettingsChange}
                  maxLength={254}
                />

                <Field
                  label="Controller Phone"
                  name="controllerPhone"
                  value={settings.controllerPhone}
                  onChange={handleSettingsChange}
                  maxLength={25}
                />

                <div className="admin-profile-field fullinput">
                  <CheckField
                    label="Show controller name on certificate"
                    name="showControllerNameOnCertificate"
                    checked={settings.showControllerNameOnCertificate}
                    onChange={handleSettingsChange}
                  />

                  <CheckField
                    label="Show controller signature on certificate"
                    name="showControllerSignatureOnCertificate"
                    checked={settings.showControllerSignatureOnCertificate}
                    onChange={handleSettingsChange}
                  />
                </div>

                {imageField(
                  "Upload Controller Signature",
                  "Preview of Controller Signature",
                  "controllerSignatureUrl",
                  "controllerSignature"
                )}
              </div>
            </div>
          </section>

          <section className="common-card">
            <div className="panel-header">
              <div>
                <h3>Owner Details</h3>
              </div>
            </div>

            <div className="admin-profile-section-body">
              <div className="admin-profile-grid">
                <Field
                  label="Owner Name"
                  name="ownerName"
                  value={settings.ownerName}
                  onChange={handleSettingsChange}
                  maxLength={120}
                />

                <div className="admin-profile-field">
                  <span>Certificate Visibility</span>

                  <CheckField
                    label="Show owner details on certificate"
                    name="showOwnerOnCertificate"
                    checked={settings.showOwnerOnCertificate}
                    onChange={handleSettingsChange}
                  />
                </div>

                {imageField(
                  "Owner Photo",
                  "Preview of Owner Photo",
                  "ownerPhotoUrl",
                  "ownerPhoto"
                )}

                {imageField(
                  "Owner Signature",
                  "Preview of Owner Signature",
                  "ownerSignatureUrl",
                  "ownerSignature"
                )}
              </div>
            </div>
          </section>

          <div className="admin-profile-footer">
            <button
              className="themebtn"
              type="submit"
              disabled={
                saving ||
                hasUploadingImage ||
                loadingError
              }
            >
              <FiSave />

              {saving
                ? "Saving..."
                : hasUploadingImage
                  ? "Image Upload In Progress..."
                  : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
