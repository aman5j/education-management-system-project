
import { useEffect, useState } from "react";
import {
  FiBriefcase,
  FiGlobe,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiUpload,
} from "react-icons/fi";

import instituteSettingsService from "../../services/instituteSettingsService";
import api from "../../services/api";
import "../../styles/InstituteSettings.css";

const initialSettings = {
  instituteName: "India Tech Samadhaan",
  legalName: "",
  registrationNumber: "",
  logoUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const getAssetUrl = (assetPath) => {
  if (!assetPath) return "";

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const baseUrl = (
    api.defaults.baseURL || "http://localhost:5000/api"
  ).replace(/\/api\/?$/, "");

  return `${baseUrl}${assetPath.startsWith("/") ? "" : "/"}${assetPath}`;
};

const InstituteSettings = () => {
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await instituteSettingsService.getSettings();

        if (active) {
          setSettings({
            ...initialSettings,
            ...data,
          });
        }
      } catch (requestError) {
        if (active) {
          setError(
            getErrorMessage(
              requestError,
              "Unable to load institute settings."
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (settings.instituteName.trim().length < 2) {
      setError("Institute name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      const savedSettings =
        await instituteSettingsService.updateSettings(settings);

      setSettings((previous) => ({
        ...previous,
        ...savedSettings,
      }));

      setSuccess("Institute settings saved successfully.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to save institute settings."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];

    // Let the same file be selected again after an upload.
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Choose a JPG, PNG, or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Logo image must be 2 MB or smaller.");
      return;
    }

    setError("");
    setSuccess("");
    setUploadingLogo(true);

    try {
      const updatedSettings =
        await instituteSettingsService.uploadLogo(file);

      setSettings((previous) => ({
        ...previous,
        ...updatedSettings,
      }));

      setSuccess("Institute logo uploaded successfully.");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to upload institute logo."
        )
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="institute-settings-page">
        <div className="institute-settings-loading">
          Loading institute settings...
        </div>
      </div>
    );
  }

  return (
    <div className="institute-settings-page">
      <header className="page-header">
        <div>
          <h1>Institute Settings</h1>
          <p>
            Manage your institute's identity, contact information,
            address, and logo.
          </p>
        </div>
      </header>

      {error && (
        <div className="institute-settings-alert error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="institute-settings-alert success" role="status">
          {success}
        </div>
      )}

      <form onSubmit={handleSave}>
        <section className="common-card institute-settings-card">
          <div className="institute-settings-section-heading">
            <span className="institute-settings-icon">
              <FiBriefcase />
            </span>
            <div>
              <h2>Institute Identity</h2>
              <p>Basic information used to identify your institute.</p>
            </div>
          </div>

          <div className="institute-settings-logo-row">
            <div className="institute-settings-logo-preview">
              {settings.logoUrl ? (
                <img
                  src={getAssetUrl(settings.logoUrl)}
                  alt="Institute logo"
                />
              ) : (
                <FiBriefcase size={38} />
              )}
            </div>

            <div className="institute-settings-logo-actions">
              <strong>Institute logo</strong>
              <p>JPG, PNG, or WEBP. Maximum file size: 2 MB.</p>

              <label className="institute-settings-upload-button">
                <FiUpload />
                {uploadingLogo ? "Uploading..." : "Upload logo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  disabled={uploadingLogo}
                />
              </label>
            </div>
          </div>

          <div className="institute-settings-grid">
            <label className="institute-settings-field">
              <span>Institute Name *</span>
              <input
                name="instituteName"
                value={settings.instituteName}
                onChange={handleChange}
                maxLength={150}
                required
              />
            </label>

            <label className="institute-settings-field">
              <span>Legal Name</span>
              <input
                name="legalName"
                value={settings.legalName}
                onChange={handleChange}
                maxLength={150}
                placeholder="Registered legal name"
              />
            </label>

            <label className="institute-settings-field">
              <span>Registration Number</span>
              <input
                name="registrationNumber"
                value={settings.registrationNumber}
                onChange={handleChange}
                maxLength={100}
                placeholder="Enter registration number"
              />
            </label>
          </div>
        </section>

        <section className="common-card institute-settings-card">
          <div className="institute-settings-section-heading">
            <span className="institute-settings-icon">
              <FiPhone />
            </span>
            <div>
              <h2>Contact Information</h2>
              <p>Contact details for institute communication.</p>
            </div>
          </div>

          <div className="institute-settings-grid">
            <label className="institute-settings-field">
              <span>Email Address</span>
              <span className="institute-settings-input-icon">
                <FiMail />
                <input
                  name="email"
                  type="email"
                  value={settings.email}
                  onChange={handleChange}
                  maxLength={254}
                  placeholder="institute@example.com"
                />
              </span>
            </label>

            <label className="institute-settings-field">
              <span>Phone Number</span>
              <input
                name="phone"
                type="tel"
                value={settings.phone}
                onChange={handleChange}
                maxLength={25}
                placeholder="Enter phone number"
              />
            </label>

            <label className="institute-settings-field">
              <span>Alternate Phone</span>
              <input
                name="alternatePhone"
                type="tel"
                value={settings.alternatePhone}
                onChange={handleChange}
                maxLength={25}
                placeholder="Optional alternate number"
              />
            </label>

            <label className="institute-settings-field">
              <span>Website</span>
              <span className="institute-settings-input-icon">
                <FiGlobe />
                <input
                  name="website"
                  type="url"
                  value={settings.website}
                  onChange={handleChange}
                  maxLength={300}
                  placeholder="https://example.com"
                />
              </span>
            </label>
          </div>
        </section>

        <section className="common-card institute-settings-card">
          <div className="institute-settings-section-heading">
            <span className="institute-settings-icon">
              <FiMapPin />
            </span>
            <div>
              <h2>Institute Address</h2>
              <p>Official address and location information.</p>
            </div>
          </div>

          <div className="institute-settings-grid">
            <label className="institute-settings-field full-width">
              <span>Address Line 1</span>
              <input
                name="addressLine1"
                value={settings.addressLine1}
                onChange={handleChange}
                maxLength={200}
                placeholder="Building, street, or area"
              />
            </label>

            <label className="institute-settings-field full-width">
              <span>Address Line 2</span>
              <input
                name="addressLine2"
                value={settings.addressLine2}
                onChange={handleChange}
                maxLength={200}
                placeholder="Landmark or additional address"
              />
            </label>

            <label className="institute-settings-field">
              <span>City</span>
              <input
                name="city"
                value={settings.city}
                onChange={handleChange}
                maxLength={100}
              />
            </label>

            <label className="institute-settings-field">
              <span>State</span>
              <input
                name="state"
                value={settings.state}
                onChange={handleChange}
                maxLength={100}
              />
            </label>

            <label className="institute-settings-field">
              <span>Postal Code</span>
              <input
                name="postalCode"
                value={settings.postalCode}
                onChange={handleChange}
                maxLength={20}
              />
            </label>

            <label className="institute-settings-field">
              <span>Country</span>
              <input
                name="country"
                value={settings.country}
                onChange={handleChange}
                maxLength={100}
              />
            </label>
          </div>
        </section>

        <div className="institute-settings-footer">
          <button
            type="submit"
            className="institute-settings-save-button"
            disabled={saving || uploadingLogo}
          >
            <FiSave />
            {saving ? "Saving..." : "Save Institute Settings"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InstituteSettings;
