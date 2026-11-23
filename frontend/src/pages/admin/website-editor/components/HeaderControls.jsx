
import {
  FiImage,
  FiUpload,
  FiRefreshCw,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";


export default function HeaderControls({
  header,
  institute,
  logoUrl,
  uploadingLogo,
  logoInputKey,
  onHeaderChange,
  onInstituteChange,
  onLogoUpload,
  onAddQuickLink,
  onUpdateQuickLink,
  onRemoveQuickLink,
}) {
  const toggle = (label, description, field) => (
    <label className="we-control-toggle" key={field}>
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>

      <input
        type="checkbox"
        checked={Boolean(header[field])}
        onChange={(event) =>
          onHeaderChange(field, event.target.checked)
        }
      />
    </label>
  );

  const field = (label, name, options = {}) => (
    <label className="we-control-field" key={name}>
      <span>{label}</span>

      {options.multiline ? (
        <textarea
          value={header[name] || ""}
          onChange={(event) =>
            onHeaderChange(name, event.target.value)
          }
          maxLength={options.maxLength || 240}
          rows={3}
          placeholder={options.placeholder || ""}
        />
      ) : (
        <input
          type={options.type || "text"}
          value={header[name] || ""}
          onChange={(event) =>
            onHeaderChange(name, event.target.value)
          }
          maxLength={options.maxLength || 300}
          placeholder={options.placeholder || ""}
        />
      )}
    </label>
  );

  return (
    <div className="we-sidebar-controls">
      {/* Institute logo */}
      <div className="we-control-block">
        <label className="we-control-label">
          Institute Logo
        </label>

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
              onChange={onLogoUpload}
            />
          </label>
        </div>

        <small className="we-control-note">
          Recommended image size: 200 × 50 px. JPG, PNG or WEBP;
          maximum 2 MB.
        </small>

        <small className="we-control-warning">
          Uses the shared Institute Settings logo.
        </small>
      </div>

      {/* Institute identity */}
      <div className="we-control-block">
        <h4>Institute Details</h4>

        <label className="we-control-field">
          <span>Institute Name</span>
          <input
            value={institute.instituteName || ""}
            onChange={(event) =>
              onInstituteChange("instituteName", event.target.value)
            }
            maxLength={150}
          />
        </label>

        <label className="we-control-field">
          <span>Email Address</span>
          <input
            type="email"
            value={institute.email || ""}
            onChange={(event) =>
              onInstituteChange("email", event.target.value)
            }
            maxLength={254}
          />
        </label>

        <label className="we-control-field">
          <span>Phone Number</span>
          <input
            value={institute.phone || ""}
            onChange={(event) =>
              onInstituteChange("phone", event.target.value)
            }
            maxLength={25}
          />
        </label>

        <label className="we-control-field">
          <span>Alternate Phone</span>
          <input
            value={institute.alternatePhone || ""}
            onChange={(event) =>
              onInstituteChange("alternatePhone", event.target.value)
            }
            maxLength={25}
          />
        </label>
      </div>

      {/* Topbar */}
      <div className="we-control-block">
        <h4>Topbar</h4>

        {toggle(
          "Enable Topbar",
          "Show or hide the top contact strip.",
          "topbarEnabled"
        )}

        {header.topbarEnabled && (
          <>
            {field("Announcement Text", "announcementText", {
              multiline: true,
              placeholder: "Welcome to our institute...",
              maxLength: 240,
            })}

            {toggle(
              "Show Phone",
              "Display institute phone in the topbar.",
              "showTopbarPhone"
            )}

            {toggle(
              "Show Email",
              "Display institute email in the topbar.",
              "showTopbarEmail"
            )}
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="we-control-block">
        <div className="we-control-heading-row">
          <h4>Quick Links</h4>
          <button
            type="button"
            onClick={onAddQuickLink}
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
                onUpdateQuickLink(index, "label", event.target.value)
              }
            />

            <input
              value={item.url}
              placeholder="/contact or https://..."
              aria-label="Quick link URL"
              onChange={(event) =>
                onUpdateQuickLink(index, "url", event.target.value)
              }
            />

            <button
              type="button"
              title="Remove quick link"
              onClick={() => onRemoveQuickLink(index)}
            >
              <FiTrash2 />
            </button>
          </div>
        ))}
      </div>


      {/* Main header */}
      <div className="we-control-block">
        <h4>Main Header</h4>

        {toggle(
          "Show Institute Logo",
          "Display institute logo in the main header.",
          "showInstituteLogo"
        )}

        {toggle(
          "Show Institute Name",
          "Display institute name in the main header.",
          "showInstituteName"
        )}
      </div>

      {/* Login button */}
      <div className="we-control-block">
        <h4>Login Button</h4>

        {toggle(
          "Show Login Button",
          "Display login action in the website header.",
          "showLoginButton"
        )}

        {header.showLoginButton && (
          <>
            {field("Button Label", "loginButtonLabel", {
              placeholder: "Login",
              maxLength: 30,
            })}

            {field("Button URL", "loginButtonUrl", {
              placeholder: "/login",
            })}
          </>
        )}
      </div>

      {/* Enquiry button */}
      <div className="we-control-block">
        <h4>Enquiry Button</h4>

        {toggle(
          "Show Enquiry Button",
          "Display enquiry action in the website header.",
          "showEnquiryButton"
        )}

        {header.showEnquiryButton && (
          <>
            {field("Button Label", "enquiryButtonLabel", {
              placeholder: "Enquire Now",
              maxLength: 30,
            })}

            {field("Button URL", "enquiryButtonUrl", {
              placeholder: "/contact",
            })}
          </>
        )}
      </div>
    </div>
  );
}
