
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiPhone,
  FiShield,
  FiSave,
  FiUpload,
  FiLock,
  FiEye,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import instituteSettingsService from "../../services/instituteSettingsService";
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

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "A";

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

// const getAssetUrl = (assetPath) => {
//   if (typeof assetPath !== "string" || !assetPath.trim()) {
//     return "";
//   }

//   const value = assetPath.trim();

//   if (/^https?:\/\//i.test(value)) {
//     return value;
//   }

//   const apiBase =
//     api.defaults.baseURL || "http://localhost:5000/api";

//   try {
//     const backendOrigin = new URL(apiBase).origin;
//     const cleanPath = value.startsWith("/")
//       ? value
//       : `/${value}`;

//     return `${backendOrigin}${cleanPath}`;
//   } catch {
//     return "";
//   }
// };



const getAssetUrl = (assetPath) => {
  if (typeof assetPath !== "string" || !assetPath.trim()) {
    return "";
  }

  const value = assetPath.trim();
  const apiBase =
    api.defaults.baseURL || import.meta.env.VITE_API_URL;

  if (!apiBase) {
    console.error("VITE_API_URL is not configured.");
    return "";
  }

  let backendOrigin;

  try {
    backendOrigin = new URL(apiBase, window.location.origin).origin;
  } catch {
    console.error("Invalid backend API URL:", apiBase);
    return "";
  }

  // Data and temporary preview URLs should remain unchanged.
  if (/^(data:|blob:)/i.test(value)) {
    return value;
  }

  let pathname = value;

  // Extract the path from absolute URLs, including old localhost
  // or frontend-hosted URLs. Uploaded files belong on the backend.
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);

      // Preserve external image URLs unless they point to a local
      // development server or an old frontend uploads path.
      const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(
        parsed.hostname
      );
      const isOldFrontendUpload =
        parsed.pathname.includes("/uploads/");

      if (!isLocalHost && !isOldFrontendUpload) {
        return value;
      }

      pathname = parsed.pathname;
    } catch {
      return "";
    }
  }

  // Normalize legacy formats such as api/uploads/... or
  // /api/uploads/... into /uploads/...
  pathname = pathname.replace(/^\/+/, "");
  pathname = pathname.replace(/^api\/uploads\//i, "uploads/");

  if (!pathname.startsWith("uploads/")) {
    pathname = `uploads/${pathname.replace(/^\/+/, "")}`;
  }

  return `${backendOrigin}/${pathname}`;
};



const Field = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  maxLength,
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
    />
  </label>
);

const TextAreaField = ({ label, name, value, onChange }) => (
  <label className="admin-profile-field fullinput">
    <span>{label}</span>
    <textarea
      className="admin-profile-input admin-profile-textarea"
      name={name}
      value={value ?? ""}
      onChange={onChange}
      rows={3}
    />
  </label>
);

const CheckField = ({ label, name, checked, onChange }) => (
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
            onChange={(event) => {
              setPreviewError(false);
              onChange(event);
            }}
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
              onError={(event) => {
                event.currentTarget.style.display = "none";
                setPreviewError(true);
              }}
            />
          ) : null}

          {imageUrl && previewError ? (
            <small className="image-preview-error">
              Image failed to load. Check the backend URL.
            </small>
          ) : !imageUrl ? (
            <small>No image uploaded</small>
          ) : null}
        </div>

        {imageUrl && !previewError && (
          <a className="preview-image tooltip" data-tooltip="View Full Image"
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
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
  const { user, updateUser, changePassword } = useAuth();

  const [admin, setAdmin] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await instituteSettingsService.getSettings();

        if (mounted) {
          setSettings({
            ...EMPTY_SETTINGS,
            ...data,
            address:
              data.address ||
              [data.addressLine1, data.addressLine2]
                .filter(Boolean)
                .join(", "),
          });
        }
      } catch (requestError) {
        if (mounted) {
          setError(errorMessage(requestError));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

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

    setError("");
    setSuccess("");
  };

  const handleSettingsChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSettings((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  };

  const handleImageUpload = async (event, assetType) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Choose a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2 MB or smaller.");
      return;
    }

    setError("");
    setSuccess("");

    setUploading((previous) => ({
      ...previous,
      [assetType]: true,
    }));

    try {
      const updated =
        assetType === "logo"
          ? await instituteSettingsService.uploadLogo(file)
          : await instituteSettingsService.uploadAsset(assetType, file);

      const fieldNameMap = {
        logo: "logoUrl",
        stamp: "stampUrl",
        controllerSignature: "controllerSignatureUrl",
        ownerPhoto: "ownerPhotoUrl",
        ownerSignature: "ownerSignatureUrl",
      };

      const targetField =
        fieldNameMap[assetType] || `${assetType}Url`;

      const uploadedUrl =
        updated?.[targetField] ||
        updated?.[assetType] ||
        updated?.url ||
        (typeof updated === "string" ? updated : null);

      setSettings((previous) => ({
        ...previous,
        ...updated,
        ...(uploadedUrl
          ? { [targetField]: uploadedUrl }
          : {}),
      }));

      if (assetType === "logo") {
        window.dispatchEvent(
          new CustomEvent("ems:institute-logo-updated", {
            detail: {
              logoUrl: uploadedUrl || updated?.logoUrl || "",
            },
          })
        );
      }

      setSuccess(
        `${
          assetType === "logo"
            ? "Institute logo"
            : assetType.replace(/([A-Z])/g, " $1")
        } uploaded successfully.`
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
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
    <div className="admin-profile-field fullinput" key={fieldName}>
      <span className="admin-profile-field-label">{title}</span>

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

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (admin.name.trim().length < 2) {
      setError("Admin name must contain at least 2 characters.");
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email.trim())
    ) {
      setError("Enter a valid admin email address.");
      return;
    }

    if (settings.instituteName.trim().length < 2) {
      setError("Institute name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      const adminResponse = await api.put("/auth/profile", {
        name: admin.name.trim(),
        email: admin.email.trim(),
        phone: admin.phone.trim(),
      });

      const updatedUser = adminResponse?.data?.data?.user;

      if (!updatedUser) {
        throw new Error(
          "The server did not return the updated admin account."
        );
      }

      updateUser(updatedUser);

      const savedSettings =
        await instituteSettingsService.updateSettings({
          ...settings,
          instituteName: settings.instituteName.trim(),
        });

      setSettings((previous) => ({
        ...previous,
        ...savedSettings,
      }));

      setAdmin({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      setSuccess(
        "Admin profile and institute settings saved successfully."
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);

      navigate("/login", {
        replace: true,
        state: {
          message: "Password changed. Please sign in again.",
        },
      });
    } catch (requestError) {
      setError(errorMessage(requestError));
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
      <div class="page-header"><div><h1>My Profile</h1></div></div>


      {error && (
        <div
          className="admin-profile-alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className="admin-profile-alert success"
          role="status"
        >
          {success}
        </div>
      )}

      <div className="admin-profile-layout">
        <aside className="admin-profile-sidebar-card common-card">
          <span className="admin-profile-account-status">
            {user?.status || "active"}
          </span>

          {/* <div className="admin-profile-avatar">
            {user?.avatar ? (
              <img
                src={getAssetUrl(user.avatar)}
                alt="Admin avatar"
              />
            ) : (
              getInitials(admin.name)
            )}
          </div> */}

          
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
            {/* <h2>{admin.name || "System Administrator"}</h2> */}
            <h2>{settings.instituteName || "Institute Name"}</h2>

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
              setShowPasswordForm((value) => !value)
            }
          >
            <FiLock /> Change Password
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
                />
              </label>

              <button
                className="themebtn"
                type="submit"
              >
                Update Password
              </button>
            </form>
          )}
        </aside>

        <form
          className="admin-profile-form"
          onSubmit={handleSave}
        >
          <section className="common-card">
            <div class="panel-header"><div><h3>Bassic Details</h3> </div></div>

            <div className="admin-profile-section-body">
              <div className="admin-profile-grid">
                {/* <Field
                  label="Admin Name"
                  name="name"
                  value={admin.name}
                  onChange={handleAdminChange}
                  required
                  maxLength={100}
                /> */}

                <Field
                  label="Institute Name"
                  name="instituteName"
                  value={settings.instituteName}
                  onChange={handleSettingsChange}
                  required
                  maxLength={150}
                />

                <Field
                  label="Designation"
                  name="designation"
                  value={settings.designation}
                  onChange={handleSettingsChange}
                  placeholder="Enter your designation"
                  maxLength={100}
                />

                <Field
                  label="Admin Email Address"
                  name="email"
                  type="email"
                  value={admin.email}
                  onChange={handleAdminChange}
                  required
                  maxLength={254}
                />

                <div className="admin-profile-field">
                  <span>Account Role</span>
                  <div className="admin-profile-readonly">
                    <span>{user?.role || "admin"}</span>
                    <small>
                      Managed by system permissions
                    </small>
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
                        <div class="panel-header"><div><h3>Contact Details</h3> </div></div>


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
           
               <div class="panel-header"><div><h3>Certificate Information</h3> </div></div>


            <div className="admin-profile-section-body">
              <div className="admin-profile-grid">
                <Field
                  label="Controller of Examiner"
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
                    checked={
                      settings.showControllerNameOnCertificate
                    }
                    onChange={handleSettingsChange}
                  />

                  <CheckField
                    label="Show controller signature on certificate"
                    name="showControllerSignatureOnCertificate"
                    checked={
                      settings.showControllerSignatureOnCertificate
                    }
                    onChange={handleSettingsChange}
                  />
                </div>

                {imageField(
                  "Upload Controller Examiner Signature",
                  "Preview of your signature",
                  "controllerSignatureUrl",
                  "controllerSignature"
                )}
              </div>
            </div>
          </section>

          <section className="common-card">
           
                           <div class="panel-header"><div><h3>Owner Details</h3> </div></div>


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
                  <span>Certificate visibility</span>
                  <CheckField
                    label="Show owner details on certificate"
                    name="showOwnerOnCertificate"
                    checked={settings.showOwnerOnCertificate}
                    onChange={handleSettingsChange}
                  />
                </div>

                {imageField(
                  "Owner Photo",
                  "Preview of your Profile",
                  "ownerPhotoUrl",
                  "ownerPhoto"
                )}

                {imageField(
                  "Owner Signature",
                  "Preview of your Owner Signature",
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
                saving || Object.values(uploading).some(Boolean)
              }
            >
             
              {saving ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
