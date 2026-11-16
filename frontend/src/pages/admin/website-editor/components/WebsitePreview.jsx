
import {
  FiPhone,
  FiMail,
} from "react-icons/fi";

export default function WebsitePreview({
  header,
  institute,
  logoUrl,
}) {
  return (
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
              <a href={link.url} key={index}>
                {link.label}
              </a>
            ))}

            {header.socialLinks.map((link) => (
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                key={link.platform}
              >
                {link.platform}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="we-public-main-header">
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
            <a
              className="we-public-login"
              href={header.loginButtonUrl}
            >
              {header.loginButtonLabel}
            </a>
          )}

          {header.showEnquiryButton && (
            <a
              className="we-public-enquiry"
              href={header.enquiryButtonUrl}
            >
              {header.enquiryButtonLabel}
            </a>
          )}
        </div>
      </div>

      <div className="we-public-menu-placeholder">
        Navigation Menu — will be configured in Phase 3
      </div>

      <div className="we-public-page-placeholder">
        <div className="we-preview-hero-content">
          <span>WEBSITE PREVIEW</span>
          <h2>{institute.instituteName || "Your Institute Website"}</h2>
          <p>
            Homepage sections will be connected in their respective phases.
          </p>
        </div>
      </div>
    </div>
  );
}
