
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiShield, FiLock, FiMail } from "react-icons/fi";

import { usePlatformAuth } from "../../context/PlatformAuthContext";
import notification from "../../utils/notification";

const PlatformLogin = () => {
  const navigate = useNavigate();

  const { login, isAuthenticated, loading } =
    usePlatformAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      notification.warning("Please enter your email and password.");
      return;
    }

    try {
      setSubmitting(true);

      await login({
        email: email.trim().toLowerCase(),
        password,
      });

      notification.success("Platform login successful.");

      navigate("/platform/dashboard", { replace: true });
    } catch (error) {
      notification.error(
        error.response?.data?.message ||
        error.message ||
        "Unable to sign in to EMS Platform."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="platform-login-page">
      <section className="platform-login-brand">
        <div className="platform-brand-content">
          <div className="platform-brand-logo">
            <FiShield />
          </div>

          <span className="platform-brand-label">
            EMS PLATFORM
          </span>

          <h1>One platform.<br />Multiple institutes.</h1>

          <p>
            Manage institutes, infrastructure and platform
            operations from one secure control center.
          </p>

          <div className="platform-brand-footer">
            Education Management System
          </div>
        </div>
      </section>

      <section className="platform-login-panel">
        <div className="platform-login-card">
          <div className="platform-mobile-logo">
            <FiShield />
            <span>EMS PLATFORM</span>
          </div>

          <div className="platform-login-heading">
            <span className="platform-eyebrow">
              PLATFORM ADMINISTRATION
            </span>

            <h2>Welcome back</h2>

            <p>
              Sign in with your Platform Super Admin account.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="platform-email">
              Email address
            </label>

            <div className="platform-input-wrapper">
              <FiMail />

              <input
                id="platform-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="Enter your email"
                autoComplete="username"
                required
              />
            </div>

            <label htmlFor="platform-password">
              Password
            </label>

            <div className="platform-input-wrapper">
              <FiLock />

              <input
                id="platform-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="platform-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <button
              className="platform-login-button"
              type="submit"
              disabled={submitting || loading}
            >
              {submitting ? "Signing in..." : "Sign in securely"}
            </button>
          </form>

          <div className="platform-login-security">
            <FiShield />
            <span>Secure Platform Super Admin access</span>
          </div>

          <p className="platform-login-copyright">
            © {new Date().getFullYear()} EMS Platform
          </p>
        </div>
      </section>
    </main>
  );
};

export default PlatformLogin;
