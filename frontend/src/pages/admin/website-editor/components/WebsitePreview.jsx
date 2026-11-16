
import {
  FiPhone,
  FiMail,
  FiChevronDown,
} from "react-icons/fi";

export default function WebsitePreview({
  header,
  institute,
  logoUrl,
}) {
  const navigationItems = [
    { label: "Home" },
    { label: "About us", dropdown: true },
    { label: "Courses" },
    { label: "Placements" },
    { label: "Verification" },
    { label: "Contact" },
    { label: "Resources", dropdown: true },
  ];

  return (
    <div className="we-public-site we-reference-header">
      {/* Top contact and action bar */}
      {header.topbarEnabled && (
        <div className="we-public-topbar">
          <div className="we-public-topbar-inner">
            <div className="we-public-topbar-contact">
              {header.showTopbarEmail && institute.email && (
                <span className="we-topbar-contact-item">
                  <FiMail />
                  {institute.email}
                </span>
              )}

              {header.showTopbarPhone && institute.phone && (
                <span className="we-topbar-contact-item">
                  <FiPhone />
                  {institute.phone}
                </span>
              )}

              {header.announcementText && (
                <span className="we-public-announcement">
                  {header.announcementText}
                </span>
              )}
            </div>

            <div className="we-public-topbar-actions">
              {header.showLoginButton && (
                <a
                  className="we-topbar-login"
                  href={header.loginButtonUrl || "/login"}
                >
                  {header.loginButtonLabel || "Login/Register"}
                </a>
              )}

              {header.showEnquiryButton && (
                <a
                  className="we-topbar-demo"
                  href={header.enquiryButtonUrl || "/contact"}
                >
                  {header.enquiryButtonLabel || "Book Free Demo"}
                </a>
              )}

              {header.quickLinks.map((link, index) => (
                <a
                  className="we-topbar-quick-link"
                  href={link.url}
                  key={`${link.label}-${index}`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main logo and navigation row */}
      <header className="we-public-main-header">
        <div className="we-public-main-header-inner">
          <a
            className="we-public-brand"
            href="/"
            aria-label="Institute home"
          >
            {header.showInstituteLogo && logoUrl && (
              <img
                src={logoUrl}
                alt="Institute logo"
              />
            )}
          </a>

          {/* Navigation is a visual placeholder until Phase 3 */}
          <nav
            className="we-public-menu-placeholder"
            aria-label="Main navigation preview"
          >
            {navigationItems.map((item, index) => (
              <a
                href="#"
                key={item.label}
                className={index === 0 ? "active" : ""}
                onClick={(event) => event.preventDefault()}
              >
                <span>{item.label}</span>
                {item.dropdown && <FiChevronDown />}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* Homepage placeholder - future website phases will replace this */}
      <div className="we-public-page-placeholder">
        <div className="we-preview-hero-content">
          <span>WEBSITE PREVIEW</span>
          <h2>
            {institute.instituteName || "Your Institute Website"}
          </h2>
          <p>
            Homepage sections will be connected in their respective phases.
          </p>
        </div>
      </div>
    </div>
  );
}
