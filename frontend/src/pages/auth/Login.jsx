import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import { getRoleHomePath } from "../../constants/roles";

import "./Auth.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    login,
    isAuthenticated,
    user,
    authError,
  } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(
        getRoleHomePath(user.role),
        {
          replace: true,
        }
      );
    }
  }, [
    isAuthenticated,
    user,
    navigate,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email || !form.password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const loggedInUser = await login(
        form.email,
        form.password
      );

      const destination =
        location.state?.from ||
        getRoleHomePath(loggedInUser.role);

      navigate(destination, {
        replace: true,
      });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setError(
      "Google authentication UI is ready. OAuth configuration will be connected in the authentication integration stage."
    );
  };

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="brand-mark">
              EMS
            </div>

            <h1>
              Education Management System
            </h1>

            <p>
              Manage students, admissions, courses,
              examinations and institutional operations
              from one secure platform.
            </p>

            <div className="brand-points">
              <div>
                <span>✓</span>
                Secure authentication
              </div>

              <div>
                <span>✓</span>
                Role-based access
              </div>

              <div>
                <span>✓</span>
                Centralized management
              </div>
            </div>
          </div>
        </div>

        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-heading">
              <span className="auth-eyebrow">
                Welcome back
              </span>

              <h2>Sign in to your account</h2>

              <p>
                Enter your credentials to continue.
              </p>
            </div>

            {(error || authError) && (
              <div className="auth-alert">
                {error || authError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">
                  Email
                </label>

                <div className="input-wrapper">
                  <FiMail />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="password-label-row">
                  <label htmlFor="password">
                    Password
                  </label>

                  <Link to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <div className="input-wrapper">
                  <FiLock />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (previous) => !previous
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FiEyeOff />
                    ) : (
                      <FiEye />
                    )}
                  </button>
                </div>
              </div>

              <button
                className="primary-auth-button"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? "Signing in..."
                  : "Sign In"}
              </button>
            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
            >
              <span className="google-icon">
                G
              </span>

              Continue with Google
            </button>

            <div className="auth-footer">
              <span>
                Don't have an account?
              </span>

              <Link to="/register">
                Create student account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;