
import {
  FiPhone,
  FiMail,
  FiMapPin,
  FiArrowUpRight,
  FiChevronRight,
} from "react-icons/fi";

import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  FaXTwitter,
} from "react-icons/fa6";

import "./../Footer.phase17.css";

// Fixed developer credit. Not editable in Website Editor.
const DEVELOPER_NAME = "IndiaTech Samadhaan";
const DEVELOPER_WEBSITE_URL = "https://indiatechsamadhaan.com";

const SOCIAL_ICONS = {
  Facebook: FaFacebookF,
  Instagram: FaInstagram,
  YouTube: FaYoutube,
  LinkedIn: FaLinkedinIn,
  X: FaXTwitter,
};

function FooterLinks({ heading, links = [] }) {
  return (
    <div className="we-site-footer-column">
      <h3>{heading}</h3>

      <ul>
        {links.map((link, index) => (
          <li key={`${link.label}-${index}`}>
            <FiChevronRight />

            <a
              href={link.url || "#"}
              target={link.openInNewTab ? "_blank" : undefined}
              rel={
                link.openInNewTab
                  ? "noopener noreferrer"
                  : undefined
              }
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterSocialLinks({ links = [] }) {
  const visibleLinks = links.filter(
    (item) =>
      SOCIAL_ICONS[item.platform] &&
      typeof item.url === "string" &&
      item.url.trim()
  );

  if (!visibleLinks.length) return null;

  return (
    <div className="we-site-footer-socials">
      {visibleLinks.map((item) => {
        const Icon = SOCIAL_ICONS[item.platform];

        return (
          <a
            key={item.platform}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit our ${item.platform} account`}
            title={item.platform}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
}

export default function WebsiteFooterSection({
  settings = {},
  institute = {},
  logoUrl = "",
  socialLinks = [],
}) {
  const currentYear = new Date().getFullYear();

  const phone = String(institute.phone || "").trim();
  const email = String(institute.email || "").trim();

  const address = [
    institute.address,
    institute.city,
    institute.state,
    institute.postalCode,
    institute.country,
  ]
    .filter(Boolean)
    .join(", ");

  const phoneLink = phone.replace(/[^\d+]/g, "");

  const mapUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address
      )}`
    : "";

  return (
    <footer className="we-site-footer">
      <div className="we-site-footer-container">
        <div className="we-site-footer-grid">
          {/* Column 1: Institute Information */}
          <div className="we-site-footer-brand">
            <a
              href="/website"
              className="we-site-footer-logo"
              aria-label="Institute homepage"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={institute.instituteName || "Institute logo"}
                />
              ) : (
                <span className="we-site-footer-brand-name">
                  {institute.instituteName || "Institute"}
                </span>
              )}
            </a>

            <p>
              {settings.instituteDescription ||
                "Empowering learners with industry-relevant courses, practical training and career support to build a successful future."}
            </p>
          </div>

          {/* Column 2: Main Heading 1 */}
          <FooterLinks
            heading={settings.columnOneHeading || "Useful Links"}
            links={settings.columnOneLinks || []}
          />

          {/* Column 3: Main Heading 2 */}
          <FooterLinks
            heading={settings.columnTwoHeading || "Our Company"}
            links={settings.columnTwoLinks || []}
          />

          {/* Column 4: Contact and Social Media */}
          <div className="we-site-footer-column we-site-footer-contact">
            <h3>
              {settings.columnThreeHeading || "Get in Touch"}
            </h3>

            <ul>
              {phone && (
                <li>
                  <FiPhone />

                  <a href={`tel:${phoneLink}`}>
                    <span>Phone: {phone}</span>
                  </a>
                </li>
              )}

              {email && (
                <li>
                  <FiMail />

                  <a href={`mailto:${email}`}>
                    <span>Email:</span>
                    {email}
                  </a>
                </li>
              )}

              {address && (
                <li>
                  <FiMapPin />

                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {address}
                    <FiArrowUpRight className="we-footer-map-arrow" />
                  </a>
                </li>
              )}
            </ul>

            {/* Dynamic Social Links configured in Footer Editor */}
            <FooterSocialLinks links={socialLinks} />
          </div>
        </div>

        <div className="we-site-footer-bottom">
          <p>
            © {currentYear} All Rights Reserved. Developed By{" "}
            <a
              href={DEVELOPER_WEBSITE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {DEVELOPER_NAME}
              <FiArrowUpRight />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
