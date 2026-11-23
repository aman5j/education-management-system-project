
import {
  FiPlus,
  FiTrash2,
  FiPhone,
  FiMail,
  FiMapPin,
  FiImage,
  FiExternalLink,
} from "react-icons/fi";

export default function FooterControls({
  settings,
  institute,
  logoUrl,
  onChange,
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

      {renderLinkEditor(
        "Heading 1 Links",
        "columnOneLinks"
      )}

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

      {renderLinkEditor(
        "Heading 2 Links",
        "columnTwoLinks"
      )}

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
