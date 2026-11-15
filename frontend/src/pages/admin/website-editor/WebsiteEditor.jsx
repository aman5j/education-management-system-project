import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiMonitor,
  FiTablet,
  FiSmartphone,
  FiSave,
  FiEye,
  FiGlobe,
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
  FiChevronRight,
  FiExternalLink,
  FiLock,
} from "react-icons/fi";

import "./WebsiteEditor.css";

const editorSections = [
  {
    group: "WEBSITE STRUCTURE",
    items: [
      { id: "header", label: "Header", phase: 2, icon: FiLayout },
      { id: "menu", label: "Navigation Menu", phase: 3, icon: FiMenu },
      { id: "banner", label: "Banner / Slider", phase: 4, icon: FiImage },
    ],
  },
  {
    group: "HOMEPAGE SECTIONS",
    items: [
      { id: "categories", label: "Popular Categories", phase: 5, icon: FiGrid },
      { id: "courses", label: "Trending Courses", phase: 6, icon: FiBookOpen },
      { id: "resources", label: "Study Resources", phase: 7, icon: FiLayers },
      { id: "certificate", label: "Certificate Section", phase: 8, icon: FiAward },
      { id: "partners", label: "Partners", phase: 9, icon: FiBriefcase },
      { id: "placements", label: "Placement Stories", phase: 10, icon: FiUsers },
      { id: "team", label: "Our Team", phase: 11, icon: FiUsers },
      { id: "videos", label: "Free Videos", phase: 12, icon: FiVideo },
      { id: "careers", label: "Careers", phase: 13, icon: FiBriefcase },
      { id: "testimonials", label: "Testimonials", phase: 14, icon: FiMessageSquare },
      { id: "contact", label: "Contact Us", phase: 15, icon: FiPhone },
      { id: "footer", label: "Footer", phase: 16, icon: FiLayers },
    ],
  },
  {
    group: "WEBSITE MANAGEMENT",
    items: [
      { id: "pages", label: "Pages Management", phase: 17, icon: FiGlobe },
      { id: "media", label: "Media Library", phase: 18, icon: FiImage },
      { id: "seo", label: "SEO Settings", phase: 19, icon: FiSettings },
    ],
  },
];

const allSections = editorSections.flatMap((group) => group.items);

const WebsiteEditor = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("header");
  const [previewDevice, setPreviewDevice] = useState("desktop");

  const selectedSection = allSections.find(
    (section) => section.id === activeSection
  );

  const PreviewIcon =
    previewDevice === "desktop"
      ? FiMonitor
      : previewDevice === "tablet"
        ? FiTablet
        : FiSmartphone;

  return (
    <div className="website-editor">
      <aside className="website-editor-sidebar">
        <div className="website-editor-brand">
          <div className="website-editor-brand-icon">
            <FiGlobe />
          </div>

          <div>
            <strong>Website Editor</strong>
            <span>Manage your website</span>
          </div>
        </div>

        <button
          type="button"
          className="website-editor-back"
          onClick={() => navigate("/admin/dashboard")}
        >
          <FiArrowLeft />
          <span>Back to Admin Dashboard</span>
        </button>

        <div className="website-editor-sidebar-scroll">
          <div className="website-editor-sidebar-heading">
            WEBSITE BUILDER
          </div>

          {editorSections.map((group) => (
            <div className="website-editor-nav-group" key={group.group}>
              <div className="website-editor-group-title">
                {group.group}
              </div>

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`website-editor-nav-item ${
                      isActive ? "active" : ""
                    }`}
                    onClick={() => setActiveSection(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    title={`Planned for Phase ${item.phase}`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    <small>{item.phase}</small>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="website-editor-sidebar-footer">
          <span className="website-editor-status-dot" />
          <span>Editor workspace</span>
          <span className="website-editor-version">Phase 1</span>
        </div>
      </aside>

      <main className="website-editor-main">
        <header className="website-editor-toolbar">
          <div className="website-editor-toolbar-title">
            <span className="website-editor-eyebrow">
              WEBSITE MANAGEMENT
            </span>
            <h1>Website Editor</h1>
          </div>

          <div className="website-editor-toolbar-actions">
            <span className="website-editor-draft-status">
              <span />
              Draft workspace
            </span>

            <button
              type="button"
              className="website-editor-toolbar-button"
              disabled
              title="Available in the publishing phase"
            >
              <FiSave />
              Save Draft
            </button>

            <button
              type="button"
              className="website-editor-publish-button"
              disabled
              title="Publishing will be implemented in Phase 20"
            >
              <FiLock />
              Publish
            </button>
          </div>
        </header>

        <section className="website-editor-content">
          <div className="website-editor-preview-header">
            <div className="website-editor-preview-heading">
              <div>
                <h2>Website Preview</h2>
                <p>
                  Preview workspace layout. Website content editing will
                  be enabled phase by phase.
                </p>
              </div>
            </div>

            <div
              className="website-editor-device-switch"
              aria-label="Preview device"
            >
              <button
                type="button"
                className={previewDevice === "desktop" ? "active" : ""}
                onClick={() => setPreviewDevice("desktop")}
                aria-label="Desktop preview"
                title="Desktop"
              >
                <FiMonitor />
                <span>Desktop</span>
              </button>

              <button
                type="button"
                className={previewDevice === "tablet" ? "active" : ""}
                onClick={() => setPreviewDevice("tablet")}
                aria-label="Tablet preview"
                title="Tablet"
              >
                <FiTablet />
                <span>Tablet</span>
              </button>

              <button
                type="button"
                className={previewDevice === "mobile" ? "active" : ""}
                onClick={() => setPreviewDevice("mobile")}
                aria-label="Mobile preview"
                title="Mobile"
              >
                <FiSmartphone />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          <div className="website-editor-preview-stage">
            <div
              className={`website-editor-preview-frame device-${previewDevice}`}
            >
              <div className="website-editor-preview-browser">
                <div className="website-editor-browser-dots">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="website-editor-browser-address">
                  <FiLock />
                  <span>Your public website preview</span>
                </div>

                <FiExternalLink />
              </div>

              <div className="website-editor-preview-page">
                <div className="website-editor-preview-site-header">
                  <div className="website-editor-preview-logo">
                    <span className="website-editor-logo-mark">
                      IT
                    </span>
                    <span>
                      <strong>Institute Website</strong>
                      <small>Public website preview</small>
                    </span>
                  </div>

                  <div className="website-editor-preview-site-menu">
                    <span>Home</span>
                    <span>About</span>
                    <span>Courses</span>
                    <span>Contact</span>
                  </div>
                </div>

                <div className="website-editor-preview-hero">
                  <div>
                    <span className="website-editor-preview-tag">
                      WEBSITE PREVIEW
                    </span>
                    <h2>Your institute website</h2>
                    <p>
                      Your website sections will appear here as they are
                      implemented and published.
                    </p>
                    <div className="website-editor-preview-hero-button">
                      Preview content
                    </div>
                  </div>

                  <div className="website-editor-preview-hero-art">
                    <FiGlobe />
                  </div>
                </div>

                <div className="website-editor-preview-section">
                  <div className="website-editor-preview-section-heading">
                    <div>
                      <span>HOMEPAGE</span>
                      <h3>Website sections</h3>
                    </div>
                    <span className="website-editor-preview-placeholder">
                      Preview only
                    </span>
                  </div>

                  <div className="website-editor-preview-cards">
                    {[
                      "Popular Categories",
                      "Trending Courses",
                      "Study Resources",
                    ].map((label, index) => (
                      <div
                        className="website-editor-preview-card"
                        key={label}
                      >
                        <div className="website-editor-preview-card-icon">
                          {index === 0 ? (
                            <FiGrid />
                          ) : index === 1 ? (
                            <FiBookOpen />
                          ) : (
                            <FiLayers />
                          )}
                        </div>
                        <strong>{label}</strong>
                        <span>Content will be connected in its phase</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="website-editor-preview-notice">
                  <FiEye />
                  <div>
                    <strong>Preview workspace only</strong>
                    <span>
                      This is a layout demonstration, not your live
                      website. Actual public website integration will
                      happen in the later phases.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="website-editor-selection-info">
            <div className="website-editor-selection-icon">
              <PreviewIcon />
            </div>

            <div>
              <strong>{selectedSection?.label}</strong>
              <p>
                This section is scheduled for Phase{" "}
                {selectedSection?.phase}. Its editor will be implemented
                separately without affecting the other website sections.
              </p>
            </div>

            <span className="website-editor-planned-badge">
              Planned
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WebsiteEditor;