import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiLock,
  FiSave,
  FiKey,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "../../styles/StaffProfile.css";

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "S";

export default function StaffProfile() {
  const navigate = useNavigate();
  const { user, updateUser, changePassword } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user?.name, user?.email, user?.phone]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (name.length < 2 || name.length > 100) {
      setError("Name must contain between 2 and 100 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (phone.length > 20) {
      setError("Phone number cannot exceed 20 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.put("/auth/profile", {
        name,
        email,
        phone,
      });

      const updatedUser = response?.data?.data?.user;

      if (!updatedUser) {
        throw new Error(
          "The server did not return the updated profile."
        );
      }

      updateUser(updatedUser);

      setForm({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      setSuccess("Your profile was updated successfully.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword.length > 128) {
      setError("Your new password cannot exceed 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different from the current password.");
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);

      navigate("/login", {
        replace: true,
        state: {
          message: "Password changed successfully. Please sign in again.",
        },
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setChangingPassword(false);
    }
  };

  const roleLabel =
    user?.assignedRole?.label ||
    user?.assignedRole?.name ||
    "Staff";

  return (
    <main className="staff-profile">
      <header className="staff-profile__header">
        <div>
          <h1>My Profile</h1>
          <p>View and update your account details and security settings.</p>
        </div>
      </header>

      {error && (
        <div className="staff-profile__alert staff-profile__alert--error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="staff-profile__alert staff-profile__alert--success" role="status">
          {success}
        </div>
      )}

      <div className="staff-profile__layout">
        <aside className="staff-profile__summary">
          <div className="staff-profile__avatar">
            {getInitials(user?.name)}
          </div>

          <h2>{user?.name || "Staff Member"}</h2>
          <p className="staff-profile__email">{user?.email || "No email available"}</p>

          <span className="staff-profile__status">
            {user?.status || "active"}
          </span>

          <div className="staff-profile__meta">
            <div>
              <FiShield />
              <span>
                <small>Assigned role</small>
                <strong>{roleLabel}</strong>
              </span>
            </div>

            <div>
              <FiUser />
              <span>
                <small>Account type</small>
                <strong>Staff</strong>
              </span>
            </div>

            <div>
              <FiMail />
              <span>
                <small>Email address</small>
                <strong>{user?.email || "Not available"}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="staff-profile__password-toggle"
            onClick={() => {
              setShowPasswordForm((previous) => !previous);
              setError("");
              setSuccess("");
            }}
          >
            <FiKey />
            {showPasswordForm ? "Cancel password change" : "Change password"}
          </button>
        </aside>

        <div className="staff-profile__content">
          <section className="staff-profile__panel">
            <div className="staff-profile__panel-header">
              <div>
                <h2>Personal Information</h2>
                <p>Keep your contact details up to date.</p>
              </div>
            </div>

            <form onSubmit={handleSave}>
              <div className="staff-profile__form-grid">
                <label>
                  Full name *
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  Email address *
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    maxLength={254}
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Phone number
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    maxLength={20}
                    autoComplete="tel"
                  />
                </label>

                <label>
                  Assigned role
                  <input type="text" value={roleLabel} readOnly />
                </label>
              </div>

              <div className="staff-profile__actions">
                <button
                  type="submit"
                  className="staff-profile__primary"
                  disabled={saving}
                >
                  <FiSave />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>

          {showPasswordForm && (
            <section className="staff-profile__panel">
              <div className="staff-profile__panel-header">
                <div>
                  <h2>Change Password</h2>
                  <p>
                    Verify your current password before setting a new one.
                    You will need to sign in again afterward.
                  </p>
                </div>
                <FiLock className="staff-profile__panel-icon" />
              </div>

              <form onSubmit={handleChangePassword}>
                <div className="staff-profile__form-grid">
                  <label>
                    Current password *
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <label>
                    New password *
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      required
                    />
                  </label>

                  <label>
                    Confirm new password *
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                </div>

                <div className="staff-profile__actions">
                  <button
                    type="submit"
                    className="staff-profile__primary"
                    disabled={changingPassword}
                  >
                    <FiLock />
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}