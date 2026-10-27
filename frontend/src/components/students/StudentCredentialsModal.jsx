
import { useEffect, useState } from "react";
import {
  FiCopy,
  FiEye,
  FiEyeOff,
  FiKey,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";

import studentCredentialService from "../../services/studentCredentialService";

const StudentCredentialsModal = ({ student, onClose }) => {
  const [account, setAccount] = useState(null);
  const [hasLogin, setHasLogin] = useState(false);
  const [email, setEmail] = useState(student?.email || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const studentId = student?._id;

  const loadStatus = async () => {
    if (!studentId) return;

    setLoading(true);
    setError("");

    try {
      const result =
        await studentCredentialService.getStatus(studentId);

      setHasLogin(Boolean(result.data?.hasLogin));
      setAccount(result.data?.account || null);
      setEmail(result.data?.studentEmail || student?.email || "");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load student login status."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // This modal is mounted for one selected student.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const validatePassword = () => {
    if (password.length < 12 || password.length > 128) {
      setError("Password must contain 12–128 characters.");
      return false;
    }
    return true;
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIssuedPassword("");

    if (!validatePassword()) return;

    setSaving(true);
    try {
      const result =
        await studentCredentialService.createAccount(
          studentId,
          password
        );

      setHasLogin(true);
      setAccount({
        name: result.data?.name,
        email: result.data?.email || email,
        status: result.data?.status || "active",
        role: result.data?.role || "student",
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      });

      setIssuedPassword(result.data?.initialPassword || password);
      setPassword("");
      setMessage("Student login created successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create student login."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIssuedPassword("");

    if (!validatePassword()) return;

    setSaving(true);
    try {
      await studentCredentialService.resetPassword(
        studentId,
        password
      );

      setIssuedPassword(password);
      setPassword("");
      setMessage("Password reset successfully. Copy it now and share it securely.");
      await loadStatus();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset the student password."
      );
    } finally {
      setSaving(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(issuedPassword);
      setMessage("Password copied to clipboard.");
    } catch {
      setError("Copy failed. Select and copy the password manually.");
    }
  };

  if (!student) return null;

  return (
    <div className="student-credentials-overlay" role="presentation">
      <section
        className="student-credentials-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-credentials-title"
      >
        <header className="student-credentials-header">
          <div>
            <span>STUDENT MANAGEMENT</span>
            <h2 id="student-credentials-title">Login Credentials</h2>
            <p>
              {student.firstName} {student.surname || ""}
              {student.rollNo ? ` · ${student.rollNo}` : ""}
            </p>
          </div>
          <button
            type="button"
            className="student-credentials-close"
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </header>

        <div className="student-credentials-body">
          {error && (
            <div className="student-credentials-error">{error}</div>
          )}

          {message && (
            <div className="student-credentials-success">{message}</div>
          )}

          {loading ? (
            <p>Checking login account...</p>
          ) : (
            <>
              <div className="student-credentials-field">
                <label>Student email</label>
                <input value={email} readOnly />
                <small>
                  This email comes from the existing Student record.
                  To change it, update the student record first.
                </small>
              </div>

              {hasLogin && account && (
                <div className="student-credentials-account">
                  <div>
                    <span>Login status</span>
                    <strong>{account.status || "Unknown"}</strong>
                  </div>
                  <div>
                    <span>Login email</span>
                    <strong>{account.email}</strong>
                  </div>
                  <div>
                    <span>Last login</span>
                    <strong>
                      {account.lastLoginAt
                        ? new Date(account.lastLoginAt).toLocaleString()
                        : "Never logged in"}
                    </strong>
                  </div>
                </div>
              )}

              <form
                onSubmit={hasLogin ? handleReset : handleCreate}
                className="student-credentials-form"
              >
                <div className="student-credentials-field">
                  <label>
                    {hasLogin ? "New password" : "Initial password"}
                  </label>
                  <div className="student-credentials-password">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={12}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="Enter at least 12 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                  <small>
                    The password is hashed before database storage.
                    It cannot be retrieved later.
                  </small>
                </div>

                <button
                  type="submit"
                  className="student-credentials-primary"
                  disabled={saving}
                >
                  {saving ? (
                    "Please wait..."
                  ) : hasLogin ? (
                    <>
                      <FiRefreshCw /> Reset Password
                    </>
                  ) : (
                    <>
                      <FiKey /> Create Login
                    </>
                  )}
                </button>
              </form>

              {issuedPassword && (
                <div className="student-credentials-issued">
                  <strong>
                    {hasLogin ? "New password" : "Initial password"}
                  </strong>
                  <p>
                    Copy this password now. It will not be available
                    for later retrieval.
                  </p>
                  <div className="student-credentials-password">
                    <input value={issuedPassword} readOnly />
                    <button
                      type="button"
                      onClick={copyPassword}
                      aria-label="Copy password"
                    >
                      <FiCopy />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="student-credentials-footer">
          <button
            type="button"
            className="student-credentials-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};

export default StudentCredentialsModal;
