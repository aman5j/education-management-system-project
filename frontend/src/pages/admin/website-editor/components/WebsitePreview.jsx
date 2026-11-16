
import {
  FiPhone,
  FiMail,
  FiChevronDown,
} from "react-icons/fi";

export default function WebsitePreview({
  header,
  institute,
  logoUrl,
  menu,
}) {
  const navigationItems = Array.isArray(menu?.items)
    ? menu.items.filter((item) => item.isVisible !== false)
    : [];

  const getLinkProps = (item) => ({
    href: item.url || "#",
    target: item.openInNewTab ? "_blank" : undefined,
    rel: item.openInNewTab ? "noopener noreferrer" : undefined,
  });

  return (
    <div className="we-public-site we-reference-header">
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

      <header className="we-public-main-header">
        <div className="we-public-main-header-inner">
          <a
            className="we-public-brand"
            href="/"
            aria-label="Institute home"
          >
            {header.showInstituteLogo && logoUrl && (
              <img src={logoUrl} alt="Institute logo" />
            )}
          </a>

          <nav
            className="we-public-menu-placeholder"
            aria-label="Main navigation preview"
          >
            {navigationItems.map((item) => {
              const children = Array.isArray(item.children)
                ? item.children.filter(
                    (child) => child.isVisible !== false
                  )
                : [];

              return (
                <div
                  className={`we-preview-menu-item ${
                    children.length ? "has-dropdown" : ""
                  }`}
                  key={item.key}
                >
                  <a
                    className="we-preview-menu-link"
                    {...getLinkProps(item)}
                  >
                    <span>{item.label}</span>
                    {children.length > 0 && <FiChevronDown />}
                  </a>

                  {children.length > 0 && (
                    <div className="we-preview-dropdown">
                      {children.map((child) => (
                        <a
                          key={child.key}
                          {...getLinkProps(child)}
                        >
                          {child.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {navigationItems.length === 0 && (
              <span className="we-preview-no-menu">
                Add menu items from the Menu editor
              </span>
            )}
          </nav>
        </div>
      </header>

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
