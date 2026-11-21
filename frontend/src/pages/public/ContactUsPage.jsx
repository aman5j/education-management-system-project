
import { useEffect, useState } from "react";
import {
  FiSend,
  FiUser,
  FiMail,
  FiPhone,
  FiMessageCircle,
  FiBookOpen,
  FiCheckCircle,
} from "react-icons/fi";

import contactUsService from "../../services/contactUsService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import "./ContactUsPage.css";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  preparingFor: "",
  message: "",
};

export default function ContactUsPage() {
  const [pageData, setPageData] = useState({
    settings: {},
    contact: {},
    courses: [],
  });

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPage = async () => {
      try {
        const data = await contactUsService.getPublicContactData();

        if (!active) return;

        setPageData({
          settings: data.settings || {},
          contact: data.contact || {},
          courses: Array.isArray(data.courses) ? data.courses : [],
        });
      } catch (error) {
        if (active) {
          notification.error(
            getApiErrorMessage(error) ||
              "Unable to load Contact Us information."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPage();

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const phone = String(pageData.contact.phone || "");
  const email = String(pageData.contact.email || "");

  const phoneDigits = phone.replace(/\D/g, "");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.fullName.trim()) {
      notification.warning("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      notification.warning("Please enter your email address.");
      return;
    }

    if (!form.message.trim()) {
      notification.warning("Please enter your message.");
      return;
    }

    setSubmitting(true);

    try {
      await contactUsService.submitEnquiry({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        preparingFor: form.preparingFor,
        message: form.message,
      });

      setForm(initialForm);
      setSubmitted(true);

      notification.success(
        "Your enquiry has been submitted successfully."
      );
    } catch (error) {
      notification.error(
        getApiErrorMessage(error) ||
          "Unable to submit your enquiry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="contact-page-loading">
        Loading Contact Us...
      </div>
    );
  }

  if (pageData.settings.enabled === false) {
    return (
      <div className="contact-page-disabled">
        <h2>Contact Us is currently unavailable.</h2>
        <p>Please contact the institute directly.</p>
      </div>
    );
  }

  return (
    <main className="contact-page">
      <div className="contact-decoration contact-decoration-top" />
      <div className="contact-decoration contact-decoration-bottom" />

      <div className="contact-page-container">
        <section className="contact-intro">
          <div className="contact-eyebrow">
            <FiSend />
            CONTACT US
          </div>

          <h1>
            {pageData.settings.heading || "Get in Touch"}
          </h1>

          <p className="contact-description">
            {pageData.settings.description ||
              "Have a question? Send us a message and our team will help you."}
          </p>

          <div className="contact-info-list">
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="contact-info-card"
              >
                <span className="contact-info-icon">
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
                className="contact-info-card"
              >
                <span className="contact-info-icon">
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
                className="contact-info-card"
              >
                <span className="contact-info-icon">
                  <FiMail />
                </span>

                <span>
                  <strong>Email</strong>
                  <small>{email}</small>
                </span>
              </a>
            )}
          </div>
        </section>

        <section className="contact-form-card">
          {submitted ? (
            <div className="contact-success">
              <FiCheckCircle />
              <h2>Thank you for contacting us!</h2>
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
              <div className="contact-form-grid">
                <div className="contact-form-field">
                  <label htmlFor="contact-full-name">
                    Full name <span>*</span>
                  </label>

                  <div className="contact-input-wrap">
                    <FiUser />
                    <input
                      id="contact-full-name"
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

                <div className="contact-form-field">
                  <label htmlFor="contact-email">
                    Email <span>*</span>
                  </label>

                  <div className="contact-input-wrap">
                    <FiMail />
                    <input
                      id="contact-email"
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

                <div className="contact-form-field">
                  <label htmlFor="contact-phone">
                    Phone
                  </label>

                  <div className="contact-input-wrap">
                    <FiPhone />
                    <input
                      id="contact-phone"
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

                <div className="contact-form-field">
                  <label htmlFor="contact-preparing">
                    Preparing for
                  </label>

                  <div className="contact-input-wrap">
                    <FiBookOpen />

                    <select
                      id="contact-preparing"
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

                      {pageData.courses.map((course) => (
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

                <div className="contact-form-field contact-message-field">
                  <label htmlFor="contact-message">
                    Message <span>*</span>
                  </label>

                  <div className="contact-input-wrap contact-textarea-wrap">
                    <FiMessageCircle />

                    <textarea
                      id="contact-message"
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
                className="contact-submit-button"
                type="submit"
                disabled={submitting}
              >
                <FiSend />
                {submitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
