
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiGlobe,
  FiChevronDown,
  FiChevronUp,
  FiLayout,
  FiMenu,
  FiImage,
  FiGrid,
  FiBookOpen,
  FiAward,
  FiUsers,
  FiBriefcase,
  FiVideo,
  FiMessageSquare,
  FiPhone,
  FiLayers,
  FiSettings,
  FiMonitor,
  FiTablet,
  FiSmartphone,
  FiSave,
  FiX,
  FiLock,
  FiRefreshCw,
  FiExternalLink,
} from "react-icons/fi";

import websiteEditorService from "../../../services/websiteEditorService";
import instituteSettingsService from "../../../services/instituteSettingsService";
import { getAssetUrl } from "../../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import HeaderControls from "./components/HeaderControls";
import WebsitePreview from "./components/WebsitePreview";

import "./WebsiteEditor.css";

const initialHeader = {
  topbarEnabled: true,
  announcementText: "",
  showTopbarEmail: true,
  showTopbarPhone: true,
  quickLinks: [],
  socialLinks: [],
  showInstituteLogo: true,
  showInstituteName: true,
  showLoginButton: true,
  loginButtonLabel: "Login",
  loginButtonUrl: "/login",
  showEnquiryButton: true,
  enquiryButtonLabel: "Enquire Now",
  enquiryButtonUrl: "/contact",
};

const initialInstitute = {
  instituteName: "",
  logoUrl: "",
  email: "",
  phone: "",
  alternatePhone: "",
  website: "",
  address: "",
};

const editorSections = [
  { id: "header", label: "Header", phase: 2, icon: FiLayout },
  { id: "menu", label: "Menu", phase: 3, icon: FiMenu },
  { id: "banner", label: "Banner 1", phase: 4, icon: FiImage },
  { id: "categories", label: "Category Banner", phase: 5, icon: FiGrid },
  { id: "pinned", label: "Pinned Banner", phase: 6, icon: FiImage },
  { id: "courses", label: "Trending Courses", phase: 7, icon: FiBookOpen },
  { id: "resources", label: "Study Resources", phase: 8, icon: FiLayers },
  { id: "certificate", label: "Certificate Section", phase: 9, icon: FiAward },
  { id: "partners", label: "Partners", phase: 10, icon: FiBriefcase },
  { id: "placements", label: "Placement Stories", phase: 11, icon: FiUsers },
  { id: "team", label: "Our Team", phase: 12, icon: FiUsers },
  { id: "videos", label: "Free Videos", phase: 13, icon: FiVideo },
  { id: "careers", label: "Careers", phase: 14, icon: FiBriefcase },
  { id: "testimonials", label: "Testimonials", phase: 15, icon: FiMessageSquare },
  { id: "contact", label: "Contact Us", phase: 16, icon: FiPhone },
  { id: "footer", label: "Footer", phase: 17, icon: FiLayers },
  { id: "pages", label: "Pages Management", phase: 18, icon: FiGlobe },
  { id: "media", label: "Media Library", phase: 19, icon: FiImage },
  { id: "seo", label: "SEO Settings", phase: 20, icon: FiSettings },
];

const WebsiteEditor = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("header");
  const [expandedSection, setExpandedSection] = useState("header");
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const [header, setHeader] = useState(initialHeader);
  const [savedHeader, setSavedHeader] = useState(initialHeader);

  const [institute, setInstitute] = useState(initialInstitute);
  const [savedInstitute, setSavedInstitute] = useState(initialInstitute);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoInputKey, setLogoInputKey] = useState(0);

  const selectedSection = useMemo(
    () => editorSections.find((item) => item.id === activeSection),
    [activeSection]
  );

  const logoUrl = institute.logoUrl
    ? getAssetUrl(institute.logoUrl)
    : "";

  const hasUnsavedChanges =
    JSON.stringify(header) !== JSON.stringify(savedHeader) ||
    JSON.stringify(institute) !== JSON.stringify(savedInstitute);

  const loadSettings = useCallback(async () => {
    setLoading(true);

    try {
      const [headerData, instituteData] = await Promise.all([
        websiteEditorService.getHeaderSettings(),
        instituteSettingsService.getSettings(),
      ]);

      const nextHeader = {
        ...initialHeader,
        ...(headerData || {}),
      };

      const nextInstitute = {
        ...initialInstitute,
        ...(instituteData || {}),
      };

      setHeader(nextHeader);
      setSavedHeader(nextHeader);
      setInstitute(nextInstitute);
      setSavedInstitute(nextInstitute);
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to load website header settings."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateHeader = (field, value) => {
    setHeader((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateInstitute = (field, value) => {
    setInstitute((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSectionClick = (section) => {
    setActiveSection(section.id);
    setExpandedSection((current) =>
      current === section.id ? "" : section.id
    );
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      notification.warning("Choose a JPG, PNG or WEBP image.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notification.warning("Logo must be 2 MB or smaller.");
      return;
    }

    setUploadingLogo(true);

    try {
      const updated = await instituteSettingsService.uploadLogo(file);

      const nextInstitute = {
        ...institute,
        ...(updated || {}),
      };

      setInstitute(nextInstitute);
      setSavedInstitute((current) => ({
        ...current,
        ...(updated || {}),
      }));

      notification.success("Institute logo uploaded successfully.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) || "Unable to upload institute logo."
      );
    } finally {
      setUploadingLogo(false);
      setLogoInputKey((current) => current + 1);
    }
  };

  const addQuickLink = () => {
    if (header.quickLinks.length >= 8) {
      notification.warning("Maximum 8 quick links are allowed.");
      return;
    }

    updateHeader("quickLinks", [
      ...header.quickLinks,
      { label: "", url: "" },
    ]);
  };

  const updateQuickLink = (index, field, value) => {
    updateHeader(
      "quickLinks",
      header.quickLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeQuickLink = (index) => {
    updateHeader(
      "quickLinks",
      header.quickLinks.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const addSocialLink = () => {
    if (header.socialLinks.length >= 5) {
      notification.warning("Maximum 5 social links are allowed.");
      return;
    }

    const platforms = [
      "Facebook",
      "Instagram",
      "YouTube",
      "LinkedIn",
      "X",
    ];

    const available = platforms.find(
      (platform) =>
        !header.socialLinks.some((item) => item.platform === platform)
    );

    if (!available) return;

    updateHeader("socialLinks", [
      ...header.socialLinks,
      { platform: available, url: "" },
    ]);
  };

  const updateSocialLink = (index, field, value) => {
    updateHeader(
      "socialLinks",
      header.socialLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeSocialLink = (index) => {
    updateHeader(
      "socialLinks",
      header.socialLinks.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const validateHeader = () => {
    if (
      header.showLoginButton &&
      !header.loginButtonLabel.trim()
    ) {
      notification.warning("Enter the Login button label.");
      return false;
    }

    if (
      header.showEnquiryButton &&
      !header.enquiryButtonLabel.trim()
    ) {
      notification.warning("Enter the Enquiry button label.");
      return false;
    }

    if (
      header.quickLinks.some(
        (item) => !item.label.trim() || !item.url.trim()
      )
    ) {
      notification.warning(
        "Complete or remove every empty quick link."
      );
      return false;
    }

    if (
      header.socialLinks.some((item) => !item.url.trim())
    ) {
      notification.warning(
        "Complete or remove every empty social link."
      );
      return false;
    }

    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateHeader()) return;

    setSaving(true);

    try {
      const institutePayload = {
        instituteName: institute.instituteName,
        email: institute.email,
        phone: institute.phone,
        alternatePhone: institute.alternatePhone,
        website: institute.website,
        address: institute.address,
      };

      const [savedHeaderData, savedInstituteData] =
        await Promise.all([
          websiteEditorService.updateHeaderSettings(header),
          instituteSettingsService.updateSettings(institutePayload),
        ]);

      const nextHeader = {
        ...initialHeader,
        ...(savedHeaderData || header),
      };

      const nextInstitute = {
        ...institute,
        ...(savedInstituteData || {}),
      };

      setHeader(nextHeader);
      setSavedHeader(nextHeader);
      setInstitute(nextInstitute);
      setSavedInstitute(nextInstitute);

      notification.success("Header settings saved successfully.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to save header settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    if (!hasUnsavedChanges) {
      await loadSettings();
      return;
    }

    const confirmed = await notification.confirm({
      title: "Discard unsaved changes?",
      text: "Your unsaved Header and Topbar changes will be discarded.",
      icon: "warning",
      confirmText: "Discard Changes",
      cancelText: "Continue Editing",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmed) return;

    setHeader(savedHeader);
    setInstitute(savedInstitute);
  };

  const openPreviewInNewTab = () => {
    if (hasUnsavedChanges) {
      notification.warning(
        "Please save your changes before opening the new-tab preview."
      );
      return;
    }

    window.open(
      "/website-preview",
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (loading) {
    return (
      <div className="website-editor-loading">
        <FiRefreshCw className="we-spin" />
        Loading Website Editor...
      </div>
    );
  }

  return (
    <div className="website-editor">
      <aside className="website-editor-sidebar">
        <div className="website-editor-sidebar-top">
          <div className="website-editor-brand">
            <div className="website-editor-brand-icon">
              <FiGlobe />
            </div>

            <div>
              <strong>Website Editor</strong>
              <small>Manage your website</small>
            </div>
          </div>

          <button
            type="button"
            className="website-editor-back"
            onClick={() => navigate("/admin/dashboard")}
          >
            <FiArrowLeft />
            Back to Admin
          </button>
        </div>

        <div className="website-editor-sidebar-scroll">
          {editorSections.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSection === section.id;
            const isActive = activeSection === section.id;

            return (
              <div
                className={`website-editor-accordion ${
                  isActive ? "active" : ""
                }`}
                key={section.id}
              >
                <button
                  type="button"
                  className="website-editor-accordion-trigger"
                  onClick={() => handleSectionClick(section)}
                  aria-expanded={isExpanded}
                >
                  <Icon />
                  <span>{section.label}</span>
                  {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {isExpanded && (
                  <div className="website-editor-accordion-content">
                    {section.id === "header" ? (
                      <HeaderControls
                        header={header}
                        institute={institute}
                        logoUrl={logoUrl}
                        uploadingLogo={uploadingLogo}
                        logoInputKey={logoInputKey}
                        onHeaderChange={updateHeader}
                        onInstituteChange={updateInstitute}
                        onLogoUpload={handleLogoUpload}
                        onAddQuickLink={addQuickLink}
                        onUpdateQuickLink={updateQuickLink}
                        onRemoveQuickLink={removeQuickLink}
                        onAddSocialLink={addSocialLink}
                        onUpdateSocialLink={updateSocialLink}
                        onRemoveSocialLink={removeSocialLink}
                      />
                    ) : (
                      <div className="we-coming-soon">
                        <span>Phase {section.phase}</span>
                        <p>
                          {section.label} editor will be implemented
                          in its own development phase.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="website-editor-sidebar-actions">
          <button
            type="button"
            className="we-save-button"
            onClick={handleSaveDraft}
            disabled={saving || uploadingLogo}
          >
            {saving ? (
              <FiRefreshCw className="we-spin" />
            ) : (
              <FiSave />
            )}
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            className="we-discard-button"
            onClick={handleDiscard}
            disabled={saving}
          >
            <FiX />
            Discard
          </button>

          <button
            type="button"
            className="we-publish-button"
            disabled
            title="Publishing will be implemented in a later phase."
          >
            <FiLock />
            Publish
          </button>
        </div>
      </aside>

      <main className="website-editor-main">
        <div className="website-editor-preview-toolbar">
          <div>
            <span>WEBSITE PREVIEW</span>
            <h1>{selectedSection?.label || "Website Editor"}</h1>
            <p>
              Changes appear here while you edit the sidebar controls.
            </p>
          </div>

          <div className="we-preview-toolbar-actions">
            <div className="we-device-controls">
              <button
                type="button"
                className={previewDevice === "desktop" ? "active" : ""}
                onClick={() => setPreviewDevice("desktop")}
              >
                <FiMonitor />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                className={previewDevice === "tablet" ? "active" : ""}
                onClick={() => setPreviewDevice("tablet")}
              >
                <FiTablet />
                <span>Tablet</span>
              </button>

              <button
                type="button"
                className={previewDevice === "mobile" ? "active" : ""}
                onClick={() => setPreviewDevice("mobile")}
              >
                <FiSmartphone />
                <span>Mobile</span>
              </button>
            </div>

            <button
              type="button"
              className="we-open-preview-button"
              onClick={openPreviewInNewTab}
            >
              <FiExternalLink />
              Open Preview in New Tab
            </button>
          </div>
        </div>

        <div className="website-editor-preview-stage">
          <div
            className={`we-preview-frame we-preview-${previewDevice}`}
          >
            <div className="we-preview-browser">
              <div className="we-browser-dots">
                <span />
                <span />
                <span />
              </div>

              <div className="we-browser-address">
                <FiLock />
                <span>Saved website configuration preview</span>
              </div>
            </div>

            <WebsitePreview
              header={header}
              institute={institute}
              logoUrl={logoUrl}
            />
          </div>
        </div>

        <div className="website-editor-preview-footer">
          <span className="we-preview-status-dot" />
          <span>
            Live editor preview · Not published to the public website
          </span>

          {hasUnsavedChanges && (
            <strong>Unsaved changes</strong>
          )}
        </div>
      </main>
    </div>
  );
};

export default WebsiteEditor;
