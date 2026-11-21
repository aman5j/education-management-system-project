
import { FiPhone, FiMail, FiMessageCircle } from "react-icons/fi";

export default function ContactUsControls({
  settings,
  contact,
  onChange,
}) {
  const updateField = (field, value) => {
    onChange({
      ...settings,
      [field]: value,
    });
  };

  return (
    <div className="we-contact-controls">
      <div className="we-contact-controls-intro">
        <h4>Contact Us Management</h4>
        <p>
          Manage the public Contact Us section. Contact details
          are automatically loaded from Institute Profile.
        </p>
      </div>

      <div className="we-contact-toggle-row">
        <div>
          <strong>Show Contact Us Section</strong>
          <span>
            Enable or hide the Contact Us section on the website.
          </span>
        </div>

        <button
          type="button"
          className={`we-contact-toggle ${
            settings.enabled ? "active" : ""
          }`}
          onClick={() =>
            updateField("enabled", !settings.enabled)
          }
          aria-pressed={settings.enabled}
        >
          <span />
        </button>
      </div>

      <div className="we-contact-field">
        <label htmlFor="contact-heading">
          Section Heading
        </label>

        <input
          id="contact-heading"
          type="text"
          maxLength={100}
          value={settings.heading || ""}
          onChange={(event) =>
            updateField("heading", event.target.value)
          }
          placeholder="Get in Touch"
        />
      </div>

      <div className="we-contact-field">
        <label htmlFor="contact-description">
          Description
        </label>

        <textarea
          id="contact-description"
          rows={4}
          maxLength={500}
          value={settings.description || ""}
          onChange={(event) =>
            updateField("description", event.target.value)
          }
          placeholder="Have a question? Send us a message..."
        />
      </div>

      <div className="we-contact-info-preview">
        <h5>Contact information from Institute Profile</h5>

        <div>
          <FiPhone />
          <span>
            <strong>Phone</strong>
            {contact?.phone || "Not configured"}
          </span>
        </div>

        <div>
          <FiMessageCircle />
          <span>
            <strong>WhatsApp</strong>
            {contact?.phone || "Not configured"}
          </span>
        </div>

        <div>
          <FiMail />
          <span>
            <strong>Email</strong>
            {contact?.email || "Not configured"}
          </span>
        </div>

        <small>
          To change these details, update Institute Profile.
        </small>
      </div>
    </div>
  );
}
