
import {
  FiPlus,
  FiTrash2,
  FiPhone,
  FiMail,
  FiMapPin,
  FiImage,
  FiExternalLink,
  FiShare2,
} from "react-icons/fi";

const SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "YouTube",
  "LinkedIn",
  "X",
];

export default function FooterControls({
  settings,
  institute,
  logoUrl,
  onChange,
  socialLinks = [],
  onSocialLinksChange,
}) {
  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  const updateLink = (field, index, key, value) => {
    const links = [...(settings[field] || [])];

    links[index] = {
      ...links[index],
      [key]: value,
    };

    updateField(field, links);
  };

  const addLink = (field) => {
    const links = [...(settings[field] || [])];

    if (links.length >= 12) return;

    links.push({
      label: "",
      url: "",
      openInNewTab: false,
    });

    updateField(field, links);
  };

  const removeLink = (field, index) => {
    const links = [...(settings[field] || [])];
    links.splice(index, 1);
    updateField(field, links);
  };

  const addSocialLink = () => {
    if (socialLinks.length >= SOCIAL_PLATFORMS.length) return;

    const availablePlatform = SOCIAL_PLATFORMS.find(
      (platform) =>
        !socialLinks.some(
          (item) => item.platform === platform
        )
    );

    if (!availablePlatform) return;

    onSocialLinksChange([
      ...socialLinks,
      {
        platform: availablePlatform,
        url: "",
      },
    ]);
  };

  const updateSocialLink = (index, key, value) => {
    const updated = [...socialLinks];

    updated[index] = {
      ...updated[index],
      [key]: value,
    };

    onSocialLinksChange(updated);
  };

  const removeSocialLink = (index) => {
    onSocialLinksChange(
      socialLinks.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const renderLinkEditor = (heading, field) => (
    <div className="we-footer-control-group">
      <div className="we-footer-control-group-heading">
        <h4>{heading}</h4>

        <button
          type="button"
          onClick={() => addLink(field)}
          disabled={(settings[field] || []).length >= 12}
        >
          <FiPlus />
          Add Link
        </button>
      </div>

      {(settings[field] || []).length === 0 && (
        <div className="we-footer-empty-links">
          No links added yet. Click Add Link to create one.
        </div>
      )}

      {(settings[field] || []).map((link, index) => (
        <div
          className="we-footer-link-editor"
          key={`${field}-${index}`}
        >
          <div className="we-footer-link-editor-top">
            <strong>Link {index + 1}</strong>

            <button
              type="button"
              className="we-footer-remove-link"
              onClick={() => removeLink(field, index)}
              aria-label={`Remove link ${index + 1}`}
            >
              <FiTrash2 />
            </button>
          </div>

          <label>
            Link Name
            <input
              type="text"
              maxLength={60}
              value={link.label || ""}
              placeholder="Example: Browse Courses"
              onChange={(event) =>
                updateLink(
                  field,
                  index,
                  "label",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Link URL
            <input
              type="text"
              maxLength={500}
              value={link.url || ""}
              placeholder="/courses or https://example.com"
              onChange={(event) =>
                updateLink(
                  field,
                  index,
                  "url",
                  event.target.value
                )
              }
            />
          </label>

          <label className="we-footer-new-tab-option">
            <input
              type="checkbox"
              checked={link.openInNewTab === true}
              onChange={(event) =>
                updateLink(
                  field,
                  index,
                  "openInNewTab",
                  event.target.checked
                )
              }
            />
            Open in new tab
          </label>
        </div>
      ))}
    </div>
  );

  return (
    <div className="we-footer-controls">
      <div className="we-footer-controls-intro">
        <h3>Footer Management</h3>
        <p>
          Manage the four-column footer displayed at the bottom
          of your public website.
        </p>
      </div>

      {/* Institute Information */}
      <div className="we-footer-control-group">
        <h4>Institute Information</h4>

        <div className="we-footer-logo-preview">
          {logoUrl ? (
            <img src={logoUrl} alt="Institute logo" />
          ) : (
            <div>
              <FiImage />
              <span>Institute logo not configured</span>
            </div>
          )}
        </div>

        <small>
          The logo is automatically taken from Header / Institute
          Logo settings. Change it from the Header section.
        </small>

        <label>
          Institute Description
          <textarea
            rows={5}
            maxLength={500}
            value={settings.instituteDescription || ""}
            placeholder="Write a short description about your institute..."
            onChange={(event) =>
              updateField(
                "instituteDescription",
                event.target.value
              )
            }
          />
          <small>
            {(settings.instituteDescription || "").length}/500
            characters
          </small>
        </label>
      </div>

      {/* Main Heading 1 */}
      <div className="we-footer-control-group">
        <h4>Main Heading 1</h4>

        <label>
          Heading Name
          <input
            type="text"
            maxLength={60}
            value={settings.columnOneHeading || ""}
            onChange={(event) =>
              updateField(
                "columnOneHeading",
                event.target.value
              )
            }
          />
        </label>
      </div>

      {renderLinkEditor("Heading 1 Links", "columnOneLinks")}

      {/* Main Heading 2 */}
      <div className="we-footer-control-group">
        <h4>Main Heading 2</h4>

        <label>
          Heading Name
          <input
            type="text"
            maxLength={60}
            value={settings.columnTwoHeading || ""}
            onChange={(event) =>
              updateField(
                "columnTwoHeading",
                event.target.value
              )
            }
          />
        </label>
      </div>

      {renderLinkEditor("Heading 2 Links", "columnTwoLinks")}

      {/* Main Heading 3 */}
      <div className="we-footer-control-group">
        <h4>Main Heading 3</h4>

        <label>
          Heading Name
          <input
            type="text"
            maxLength={60}
            value={settings.columnThreeHeading || ""}
            onChange={(event) =>
              updateField(
                "columnThreeHeading",
                event.target.value
              )
            }
          />
        </label>

        <div className="we-footer-contact-preview">
          <strong>Contact details from Institute Details</strong>

          <div>
            <FiPhone />
            <span>{institute?.phone || "Phone not configured"}</span>
          </div>

          <div>
            <FiMail />
            <span>{institute?.email || "Email not configured"}</span>
          </div>

          <div>
            <FiMapPin />
            <span>{institute?.address || "Address not configured"}</span>
          </div>

          <small>
            These details update automatically when you save
            Institute Details.
          </small>
        </div>
      </div>

      {/* Social Links - managed from Footer */}
      <div className="we-footer-control-group">
        <div className="we-footer-control-group-heading">
          <h4>
            <FiShare2 className="we-footer-social-heading-icon" />
            Social Links
          </h4>

          <button
            type="button"
            onClick={addSocialLink}
            disabled={socialLinks.length >= SOCIAL_PLATFORMS.length}
          >
            <FiPlus />
            Add Social Link
          </button>
        </div>

        <p className="we-footer-social-help">
          Select a social media platform and enter your official
          account URL. Configured icons will appear in the Footer.
        </p>

        {socialLinks.length === 0 && (
          <div className="we-footer-empty-links">
            No social accounts added. Click Add Social Link to
            configure Facebook, Instagram, YouTube, LinkedIn or X.
          </div>
        )}

        {socialLinks.map((item, index) => (
          <div
            className="we-footer-link-editor we-footer-social-editor"
            key={`${item.platform}-${index}`}
          >
            <div className="we-footer-link-editor-top">
              <strong>Social Account {index + 1}</strong>

              <button
                type="button"
                className="we-footer-remove-link"
                onClick={() => removeSocialLink(index)}
                aria-label={`Remove ${item.platform} account`}
              >
                <FiTrash2 />
              </button>
            </div>

            <label>
              Select Platform
              <select
                value={item.platform || ""}
                onChange={(event) =>
                  updateSocialLink(
                    index,
                    "platform",
                    event.target.value
                  )
                }
              >
                {SOCIAL_PLATFORMS.map((platform) => (
                  <option
                    key={platform}
                    value={platform}
                    disabled={socialLinks.some(
                      (link, linkIndex) =>
                        link.platform === platform &&
                        linkIndex !== index
                    )}
                  >
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Account URL
              <input
                type="url"
                value={item.url || ""}
                placeholder={`https://${item.platform?.toLowerCase()}.com/your-account`}
                onChange={(event) =>
                  updateSocialLink(
                    index,
                    "url",
                    event.target.value
                  )
                }
              />
            </label>
          </div>
        ))}

        <small>
          Social links are saved through the existing Header
          settings API. You can manage them here in Footer.
        </small>
      </div>

      {/* Fixed Copyright */}
      <div className="we-footer-static-credit">
        <FiExternalLink />
        <div>
          <strong>Copyright and Developer Credit</strong>
          <p>
            Copyright year is automatic. IndiaTech Samadhaan
            is a fixed developer credit and cannot be changed
            from Website Editor.
          </p>
        </div>
      </div>
    </div>
  );
}
