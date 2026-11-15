import { useEffect, useMemo, useState } from "react";
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
  FiUpload,
  FiSave,
  FiX,
  FiPlus,
  FiTrash2,
  FiMail,
  FiExternalLink,
  FiLock,
  FiRefreshCw,
} from "react-icons/fi";

import websiteEditorService from "../../../services/websiteEditorService";
import instituteSettingsService from "../../../services/instituteSettingsService";
import { getAssetUrl } from "../../../utils/assetUrl";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

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
  logoAlignment: "left",
  headerSticky: true,
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
  {
    id: "header",
    label: "Header",
    phase: 2,
    icon: FiLayout,
  },
  {
    id: "menu",
    label: "Menu",
    phase: 3,
    icon: FiMenu,
  },
  {
    id: "banner",
    label: "Banner 1",
    phase: 4,
    icon: FiImage,
  },
  {
    id: "categories",
    label: "Category Banner",
    phase: 5,
    icon: FiGrid,
  },
  {
    id: "pinned",
    label: "Pinned Banner",
    phase: 6,
    icon: FiImage,
  },
  {
    id: "courses",
    label: "Trending Courses",
    phase: 7,
    icon: FiBookOpen,
  },
  {
    id: "resources",
    label: "Study Resources",
    phase: 8,
    icon: FiLayers,
  },
  {
    id: "certificate",
    label: "Certificate Section",
    phase: 9,
    icon: FiAward,
  },
  {
    id: "partners",
    label: "Partners",
    phase: 10,
    icon: FiBriefcase,
  },
  {
    id: "placements",
    label: "Placement Stories",
    phase: 11,
    icon: FiUsers,
  },
  {
    id: "team",
    label: "Our Team",
    phase: 12,
    icon: FiUsers,
  },
  {
    id: "videos",
    label: "Free Videos",
    phase: 13,
    icon: FiVideo,
  },
  {
    id: "careers",
    label: "Careers",
    phase: 14,
    icon: FiBriefcase,
  },
  {
    id: "testimonials",
    label: "Testimonials",
    phase: 15,
    icon: FiMessageSquare,
  },
  {
    id: "contact",
    label: "Contact Us",
    phase: 16,
    icon: FiPhone,
  },
  {
    id: "footer",
    label: "Footer",
    phase: 17,
    icon: FiLayers,
  },
  {
    id: "pages",
    label: "Pages Management",
    phase: 18,
    icon: FiGlobe,
  },
  {
    id: "media",
    label: "Media Library",
    phase: 19,
    icon: FiImage,
  },
  {
    id: "seo",
    label: "SEO Settings",
    phase: 20,
    icon: FiSettings,
  },
];

const socialPlatforms = [
  "Facebook",
  "Instagram",
  "YouTube",
  "LinkedIn",
  "X",
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

  const loadSettings = async () => {
    setLoading(true);

    try {
      const [headerData, instituteData] = await Promise.all([
        websiteEditorService.getHeaderSettings(),
        instituteSettingsService.getSettings(),
      ]);

      const nextHeader = {
        ...initialHeader,
        ...headerData,
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
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateHeader = (field, value) => {
    setHeader((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateInstitute = (field, value) => {
    setInstitute((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSectionClick = (section) => {
    setActiveSection(section.id);

    setExpandedSection((previous) =>
      previous === section.id ? "" : section.id
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
      setSavedInstitute((previous) => ({
        ...previous,
        ...(updated || {}),
      }));

      notification.success("Institute logo uploaded successfully.");
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) || "Unable to upload institute logo."
      );
    } finally {
      setUploadingLogo(false);
      setLogoInputKey((previous) => previous + 1);
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
        itemIndex === index
          ? { ...item, [field]: value }
          : item
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

    const available = socialPlatforms.find(
      (platform) =>
        !header.socialLinks.some(
          (item) => item.platform === platform
        )
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
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const removeSocialLink = (index) => {
    updateHeader(
      "socialLinks",
      header.socialLinks.filter(
        (_, itemIndex) => itemIndex !== index
      )
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

  const handlePublish = () => {
    notification.info?.(
      "Publishing will be enabled in the Website Publishing phase."
    );
  };

  const renderToggle = (label, description, field) => (
    <label className="we-control-toggle" key={field}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>

      <input
        type="checkbox"
        checked={Boolean(header[field])}
        onChange={(event) =>
          updateHeader(field, event.target.checked)
        }
      />
    </label>
  );

  const renderField = (
    label,
    field,
    options = {}
  ) => (
    <label className="we-control-field" key={field}>
      <span>{label}</span>

      {options.type === "textarea" ? (
        <textarea
          value={header[field] || ""}
          onChange={(event) =>
            updateHeader(field, event.target.value)
          }
          maxLength={options.maxLength || 240}
          rows={options.rows || 2}
          placeholder={options.placeholder || ""}
        />
      ) : options.type === "select" ? (
        <select
          value={header[field] || ""}
          onChange={(event) =>
            updateHeader(field, event.target.value)
          }
        >
          {options.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={options.type || "text"}
          value={header[field] || ""}
          onChange={(event) =>
            updateHeader(field, event.target.value)
          }
          maxLength={options.maxLength || 300}
          placeholder={options.placeholder || ""}
        />
      )}
    </label>
  );

  const renderHeaderControls = () => (
    <div className="we-sidebar-controls">
      <div className="we-control-block">
        <label className="we-control-label">Logo</label>

        <div className="we-logo-upload-box">
          {logoUrl ? (
            <img src={logoUrl} alt="Institute logo" />
          ) : (
            <div className="we-logo-empty">
              <FiImage />
              <span>No institute logo uploaded</span>
            </div>
          )}

          <label
            className="we-logo-edit-button"
            title="Upload institute logo"
          >
            {uploadingLogo ? (
              <FiRefreshCw className="we-spin" />
            ) : (
              <FiUpload />
            )}

            <input
              key={logoInputKey}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={uploadingLogo}
              onChange={handleLogoUpload}
            />
          </label>
        </div>

        <small className="we-control-note">
          NOTE: Recommended image size 200 × 50 px. JPG, PNG or WEBP;
          maximum 2 MB.
        </small>
        <small className="we-control-warning">
          This is the shared Institute Settings logo used elsewhere in EMS.
        </small>
      </div>

      <div className="we-control-block">
        <h4>Institute Details</h4>

        <label className="we-control-field">
          <span>Institute Name</span>
          <input
            value={institute.instituteName}
            onChange={(event) =>
              updateInstitute("instituteName", event.target.value)
            }
            maxLength={150}
            placeholder="Institute name"
          />
        </label>

        <label className="we-control-field">
          <span>Email Address</span>
          <input
            type="email"
            value={institute.email}
            onChange={(event) =>
              updateInstitute("email", event.target.value)
            }
            maxLength={254}
            placeholder="info@example.com"
          />
        </label>

        <label className="we-control-field">
          <span>Phone Number</span>
          <input
            value={institute.phone}
            onChange={(event) =>
              updateInstitute("phone", event.target.value)
            }
            maxLength={25}
            placeholder="Phone number"
          />
        </label>

        <label className="we-control-field">
          <span>Alternate Phone</span>
          <input
            value={institute.alternatePhone}
            onChange={(event) =>
              updateInstitute("alternatePhone", event.target.value)
            }
            maxLength={25}
            placeholder="Alternate phone"
          />
        </label>
      </div>

      <div className="we-control-block">
        <h4>Topbar</h4>

        {renderToggle(
          "Enable Topbar",
          "Show or hide the top contact strip.",
          "topbarEnabled"
        )}

        {header.topbarEnabled && (
          <>
            {renderField("Announcement Text", "announcementText", {
              type: "textarea",
              maxLength: 240,
              placeholder: "Welcome to our institute...",
            })}

            {renderToggle(
              "Show Email",
              "Display institute email in the topbar.",
              "showTopbarEmail"
            )}

            {renderToggle(
              "Show Phone",
              "Display institute phone in the topbar.",
              "showTopbarPhone"
            )}
          </>
        )}
      </div>

      <div className="we-control-block">
        <div className="we-control-heading-row">
          <h4>Quick Links</h4>
          <button
            type="button"
            onClick={addQuickLink}
            disabled={header.quickLinks.length >= 8}
          >
            <FiPlus /> Add
          </button>
        </div>

        {header.quickLinks.map((item, index) => (
          <div className="we-repeat-item" key={index}>
            <input
              value={item.label}
              maxLength={40}
              placeholder="Link label"
              aria-label="Quick link label"
              onChange={(event) =>
                updateQuickLink(index, "label", event.target.value)
              }
            />

            <input
              value={item.url}
              placeholder="/contact or https://..."
              aria-label="Quick link URL"
              onChange={(event) =>
                updateQuickLink(index, "url", event.target.value)
              }
            />

            <button
              type="button"
              title="Remove quick link"
              onClick={() => removeQuickLink(index)}
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>

      <div className="we-control-block">
        <div className="we-control-heading-row">
          <h4>Social Links</h4>
          <button
            type="button"
            onClick={addSocialLink}
            disabled={header.socialLinks.length >= 5}
          >
            <FiPlus /> Add
          </button>
        </div>

        {header.socialLinks.map((item, index) => (
          <div className="we-repeat-item" key={index}>
            <select
              value={item.platform}
              aria-label="Social platform"
              onChange={(event) =>
                updateSocialLink(index, "platform", event.target.value)
              }
            >
              {socialPlatforms.map((platform) => (
                <option
                  key={platform}
                  value={platform}
                  disabled={header.socialLinks.some(
                    (link, linkIndex) =>
                      link.platform === platform && linkIndex !== index
                  )}
                >
                  {platform}
                </option>
              ))}
            </select>

            <input
              type="url"
              value={item.url}
              placeholder="https://..."
              aria-label="Social URL"
              onChange={(event) =>
                updateSocialLink(index, "url", event.target.value)
              }
            />

            <button
              type="button"
              title="Remove social link"
              onClick={() => removeSocialLink(index)}
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>

      <div className="we-control-block">
        <h4>Main Header</h4>

        {renderToggle(
          "Show Institute Logo",
          "Display institute logo in the main header.",
          "showInstituteLogo"
        )}

        {renderToggle(
          "Show Institute Name",
          "Display institute name beside the logo.",
          "showInstituteName"
        )}

        {renderToggle(
          "Sticky Header",
          "Keep the header fixed while scrolling.",
          "headerSticky"
        )}

        {renderField("Logo Alignment", "logoAlignment", {
          type: "select",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
        })}
      </div>

      <div className="we-control-block">
        <h4>Login Button</h4>

        {renderToggle(
          "Show Login Button",
          "Display login action in the website header.",
          "showLoginButton"
        )}

        {header.showLoginButton && (
          <>
            {renderField("Button Label", "loginButtonLabel", {
              maxLength: 30,
              placeholder: "Login",
            })}

            {renderField("Button URL", "loginButtonUrl", {
              placeholder: "/login",
            })}
          </>
        )}
      </div>

      <div className="we-control-block">
        <h4>Enquiry Button</h4>

        {renderToggle(
          "Show Enquiry Button",
          "Display enquiry action in the website header.",
          "showEnquiryButton"
        )}

        {header.showEnquiryButton && (
          <>
            {renderField("Button Label", "enquiryButtonLabel", {
              maxLength: 30,
              placeholder: "Enquire Now",
            })}

            {renderField("Button URL", "enquiryButtonUrl", {
              placeholder: "/contact",
            })}
          </>
        )}
      </div>
    </div>
  );

  const renderPreview = () => (
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
          <span>Website preview</span>
        </div>

        <FiExternalLink />
      </div>

      <div className="we-public-site">
        {header.topbarEnabled && (
          <div className="we-public-topbar">
            <div className="we-public-topbar-contact">
              {header.showTopbarPhone && institute.phone && (
                <span>
                  <FiPhone /> {institute.phone}
                </span>
              )}

              {header.announcementText && (
                <span className="we-public-announcement">
                  {header.announcementText}
                </span>
              )}

              {header.showTopbarEmail && institute.email && (
                <span>
                  <FiMail /> {institute.email}
                </span>
              )}
            </div>

            <div className="we-public-topbar-links">
              {header.quickLinks.map((link, index) => (
                <span key={index}>{link.label}</span>
              ))}

              {header.socialLinks.map((link) => (
                <span key={link.platform}>{link.platform}</span>
              ))}
            </div>
          </div>
        )}

        <div
          className={`we-public-main-header ${
            header.logoAlignment === "center" ? "center" : ""
          }`}
        >
          <div className="we-public-brand">
            {header.showInstituteLogo && logoUrl && (
              <img src={logoUrl} alt="Institute logo" />
            )}

            {header.showInstituteName && (
              <strong>
                {institute.instituteName || "Institute Name"}
              </strong>
            )}
          </div>

          <div className="we-public-header-actions">
            {header.showLoginButton && (
              <span className="we-public-login">
                {header.loginButtonLabel}
              </span>
            )}

            {header.showEnquiryButton && (
              <span className="we-public-enquiry">
                {header.enquiryButtonLabel}
              </span>
            )}
          </div>
        </div>

        <div className="we-public-menu-placeholder">
          <span>Home</span>
          <span>About</span>
          <span>Courses</span>
          <span>Admissions</span>
          <span>Contact</span>
        </div>

        <div className="we-public-page-placeholder">
          <div className="we-preview-hero-content">
            <span>WEBSITE PREVIEW</span>
            <h2>Your Institute Website</h2>
            <p>
              Your homepage content will be connected phase by phase.
            </p>
            <div>Explore Courses</div>
          </div>
        </div>

        <div className="we-preview-below-fold">
          <strong>Homepage sections</strong>
          <div>
            <span>Popular Categories</span>
            <span>Trending Courses</span>
            <span>Study Resources</span>
          </div>
        </div>
      </div>
    </div>
  );

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
                      renderHeaderControls()
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
            title="Publishing will be implemented in the publishing phase."
            onClick={handlePublish}
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
              Changes are shown here as you edit the sidebar controls.
            </p>
          </div>

          <div className="we-device-controls">
            <button
              type="button"
              className={previewDevice === "desktop" ? "active" : ""}
              onClick={() => setPreviewDevice("desktop")}
              title="Desktop preview"
            >
              <FiMonitor />
              <span>Desktop</span>
            </button>

            <button
              type="button"
              className={previewDevice === "tablet" ? "active" : ""}
              onClick={() => setPreviewDevice("tablet")}
              title="Tablet preview"
            >
              <FiTablet />
              <span>Tablet</span>
            </button>

            <button
              type="button"
              className={previewDevice === "mobile" ? "active" : ""}
              onClick={() => setPreviewDevice("mobile")}
              title="Mobile preview"
            >
              <FiSmartphone />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        <div className="website-editor-preview-stage">
          {renderPreview()}
        </div>

        <div className="website-editor-preview-footer">
          <span className="we-preview-status-dot" />
          <span>
            Configuration preview · Not published to the public website
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