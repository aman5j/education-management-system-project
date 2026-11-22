
import { useState } from "react";

import {
  FiSend,
  FiUser,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiBookOpen,
  FiCheckCircle,
} from "react-icons/fi";

import contactUsService from "../../../../services/contactUsService";

import notification, {
  getApiErrorMessage,
} from "../../../../utils/notification";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  preparingFor: "",
  message: "",
};

export default function ContactUsSection({
  settings,
  contact,
  courses = [],
  interactive = false,
}) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setSubmitting(true);

    try {
      await contactUsService.submitEnquiry({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        preparingFor: form.preparingFor,
        message: form.message.trim(),
      });

      setForm(initialForm);
      setSubmitted(true);

      notification.success(
        "Your enquiry has been submitted successfully."
      );
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to submit your enquiry. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="we-preview-contact-section"
    >
      <div className="we-preview-contact-container">
        <div className="we-preview-contact-info">
          <div className="we-preview-contact-eyebrow">
            <FiSend />
            CONTACT US
          </div>

          <h2>{heading}</h2>

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
          {submitted ? (
            <div className="we-preview-contact-success">
              <FiCheckCircle />

              <h3>Thank you for contacting us!</h3>

              <p>
                Your enquiry has been received. Our team will
                contact you soon.
              </p>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
              >
                Submit another enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="we-preview-contact-form-grid">
                <div className="we-preview-contact-field">
                  <label htmlFor="website-contact-name">
                    Full name <span>*</span>
                  </label>

                  <div className="we-preview-contact-input">
                    <FiUser />

                    <input
                      id="website-contact-name"
                      type="text"
                      placeholder="Your name"
                      maxLength={100}
                      autoComplete="name"
                      value={form.fullName}
                      onChange={(event) =>
                        updateField("fullName", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="we-preview-contact-field">
                  <label htmlFor="website-contact-email">
                    Email <span>*</span>
                  </label>

                  <div className="we-preview-contact-input">
                    <FiMail />

                    <input
                      id="website-contact-email"
                      type="email"
                      placeholder="you@example.com"
                      maxLength={254}
                      autoComplete="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <div className="we-preview-contact-field">
                  <label htmlFor="website-contact-phone">
                    Phone
                  </label>

                  <div className="we-preview-contact-input">
                    <FiPhone />

                    <input
                      id="website-contact-phone"
                      type="tel"
                      placeholder="10-digit mobile number"
                      maxLength={20}
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="we-preview-contact-field">
                  <label htmlFor="website-contact-course">
                    Preparing for
                  </label>

                  <div className="we-preview-contact-input">
                    <FiBookOpen />

                    <select
                      id="website-contact-course"
                      value={form.preparingFor}
                      onChange={(event) =>
                        updateField(
                          "preparingFor",
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        Select course / enquiry
                      </option>

                      {courses.map((course) => (
                        <option
                          key={course._id}
                          value={course._id}
                        >
                          {course.courseTitle}
                        </option>
                      ))}

                      <option value="General Enquiry">
                        General Enquiry
                      </option>
                    </select>
                  </div>
                </div>

                <div className="we-preview-contact-field we-preview-contact-message">
                  <label htmlFor="website-contact-message">
                    Message <span>*</span>
                  </label>

                  <div className="we-preview-contact-input we-preview-contact-textarea">
                    <FiMessageCircle />

                    <textarea
                      id="website-contact-message"
                      placeholder="How can we help you?"
                      rows={4}
                      minLength={5}
                      maxLength={2000}
                      value={form.message}
                      onChange={(event) =>
                        updateField("message", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                className="we-preview-contact-submit"
                type="submit"
                disabled={submitting}
              >
                <FiSend />
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
