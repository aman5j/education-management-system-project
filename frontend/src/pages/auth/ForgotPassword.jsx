import { useState } from "react";
import { Link } from "react-router-dom";

import { FiArrowLeft, FiMail } from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";

import "./Auth.css";

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setResetUrl("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await forgotPassword(email);

      setMessage(response.message);

      if (response.devResetUrl) {
        setResetUrl(response.devResetUrl);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to process the request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <Link
              to="/login"
              className="back-link"
            >
              <FiArrowLeft />
              Back to login
            </Link>

            <h2>Forgot password?</h2>

            <p>
              Enter your registered email and we'll
              generate a password reset link.
            </p>
          </div>

          {error && (
            <div className="auth-alert">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-success">
              {message}
            </div>
          )}

          {resetUrl && (
            <div className="dev-reset-box">
              <strong>
                Development reset link
              </strong>

              <a
                href={resetUrl}
                target="_self"
                rel="noreferrer"
              >
                {resetUrl}
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="forgot-email">
                Email
              </label>

              <div className="input-wrapper">
                <FiMail />

                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <button
              className="primary-auth-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Sending..."
                : "Send Reset Link"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;