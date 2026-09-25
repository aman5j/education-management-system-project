import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { FiArrowLeft, FiLock } from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";

import "./Auth.css";

const ResetPassword = () => {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const token = searchParams.get("token");

  const { resetPassword } = useAuth();

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!token) {
      setError(
        "This password reset link is invalid."
      );

      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );

      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    setSubmitting(true);

    try {
      const response =
        await resetPassword(
          token,
          password
        );

      setMessage(response.message);

      setTimeout(() => {
        navigate("/login", {
          replace: true,
        });
      }, 1200);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to reset password."
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

            <h2>Reset password</h2>

            <p>
              Create a new password for your account.
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

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="new-password">
                New password
              </label>

              <div className="input-wrapper">
                <FiLock />

                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">
                Confirm password
              </label>

              <div className="input-wrapper">
                <FiLock />

                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              className="primary-auth-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Resetting..."
                : "Reset Password"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default ResetPassword;