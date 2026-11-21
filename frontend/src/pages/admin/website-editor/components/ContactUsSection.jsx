
import {
  FiSend,
  FiUser,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiBookOpen,
} from "react-icons/fi";

export default function ContactUsSection({
  settings,
  contact,
}) {
  if (settings?.enabled === false) {
    return null;
  }

  const phone = String(contact?.phone || "");
  const email = String(contact?.email || "");
  const phoneDigits = phone.replace(/\D/g, "");

  const heading = settings?.heading || "Get in Touch";

  const description =
    settings?.description ||
    "Have a question about a batch, test series or books? Send us a message and our team will help you choose the right preparation path.";

  return (
    <section className="we-preview-contact-section">
      <div className="we-preview-contact-container">
        <div className="we-preview-contact-info">
          <div className="we-preview-contact-eyebrow">
            <FiSend />
            CONTACT US
          </div>

          <h2>
            {heading}
          </h2>

          <p className="we-preview-contact-description">
            {description}
          </p>

          <div className="we-preview-contact-cards">
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="we-preview-contact-card"
              >
                <span className="we-preview-contact-icon">
                  <FiPhone />
                </span>

                <span>
                  <strong>Call us</strong>
                  <small>{phone}</small>
                </span>
              </a>
            )}

            {phoneDigits && (
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="we-preview-contact-card"
              >
                <span className="we-preview-contact-icon">
                  <FiMessageCircle />
                </span>

                <span>
                  <strong>WhatsApp</strong>
                  <small>Chat with our team</small>
                </span>
              </a>
            )}

            {email && (
              <a
                href={`mailto:${email}`}
                className="we-preview-contact-card"
              >
                <span className="we-preview-contact-icon">
                  <FiMail />
                </span>

                <span>
                  <strong>Email</strong>
                  <small>{email}</small>
                </span>
              </a>
            )}
          </div>
        </div>

        <div className="we-preview-contact-form-card">
          <div className="we-preview-contact-form-grid">
            <div className="we-preview-contact-field">
              <label>
                Full name <span>*</span>
              </label>

              <div className="we-preview-contact-input">
                <FiUser />
                <span>Your name</span>
              </div>
            </div>

            <div className="we-preview-contact-field">
              <label>
                Email <span>*</span>
              </label>

              <div className="we-preview-contact-input">
                <FiMail />
                <span>you@example.com</span>
              </div>
            </div>

            <div className="we-preview-contact-field">
              <label>Phone</label>

              <div className="we-preview-contact-input">
                <FiPhone />
                <span>10-digit mobile number</span>
              </div>
            </div>

            <div className="we-preview-contact-field">
              <label>Preparing for</label>

              <div className="we-preview-contact-input">
                <FiBookOpen />
                <span>Select course / enquiry</span>
              </div>
            </div>

            <div className="we-preview-contact-field we-preview-contact-message">
              <label>
                Message <span>*</span>
              </label>

              <div className="we-preview-contact-input we-preview-contact-textarea">
                <FiMessageCircle />
                <span>How can we help you?</span>
              </div>
            </div>
          </div>

          <a
            href="/contact"
            className="we-preview-contact-submit"
          >
            <FiSend />
            Send Message
          </a>
        </div>
      </div>
    </section>
  );
}
