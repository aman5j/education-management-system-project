
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiSave,
  FiShield,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import "../../styles/AdminProfile.css";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "A";

const getError = (error, fallback) =>
  error?.response?.data?.message || fallback;

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, changePassword } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setProfileError("");
    setProfileSuccess("");
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPasswordError("");
    setPasswordSuccess("");
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (profile.name.trim().length < 2) {
      setProfileError("Name must contain at least 2 characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      setProfileError("Enter a valid email address.");
      return;
    }

    setSavingProfile(true);

    try {
      const response = await api.put("/auth/profile", {
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
      });

      const updatedUser = response?.data?.data?.user;

      if (!updatedUser) {
        throw new Error("The server did not return the updated profile.");
      }

      updateUser(updatedUser);

      setProfile({
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
      });

      setProfileSuccess(
        response?.data?.message || "Profile updated successfully."
      );
    } catch (error) {
      setProfileError(
        getError(error, error.message || "Unable to update your profile.")
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must contain at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError("Choose a new password different from the current one.");
      return;
    }

    setSavingPassword(true);

    try {
      const response = await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      setPasswordSuccess(
        response?.message ||
          "Password changed. Please sign in again."
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // The existing changePassword function clears the session.
      navigate("/login", {
        replace: true,
        state: {
          message: "Your password was changed. Please sign in again.",
        },
      });
    } catch (error) {
      setPasswordError(
        error?.message || "Unable to change your password."
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="admin-profile-page">
      <header className="admin-profile-header">
        <div>
          <span className="admin-profile-eyebrow">ACCOUNT SETTINGS</span>
          <h1>Admin Profile</h1>
          <p>Manage your account information and security.</p>
        </div>
      </header>

      <section className="admin-profile-identity">
        <div className="admin-profile-avatar" aria-hidden="true">
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            getInitials(user?.name)
          )}
        </div>

        <div className="admin-profile-identity-info">
          <h2>{user?.name || "Administrator"}</h2>
          <p>{user?.email || "No email available"}</p>
          <span className="admin-profile-role">
            <FiShield /> {user?.role || "admin"}
          </span>
        </div>

        <span className="admin-profile-account-status">
          {user?.status || "active"}
        </span>
      </section>

      <section className="admin-profile-card">
        <div className="admin-profile-card-heading">
          <span className="admin-profile-heading-icon">
            <FiUser />
          </span>
          <div>
            <h2>Personal Information</h2>
            <p>Update the details associated with your account.</p>
          </div>
        </div>

        {profileError && (
          <div className="admin-profile-alert error" role="alert">
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="admin-profile-alert success" role="status">
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="admin-profile-form-grid">
            <label className="admin-profile-field">
              <span>Full Name</span>
              <span className="admin-profile-input-wrap">
                <FiUser />
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  placeholder="Enter your full name"
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </span>
            </label>

            <label className="admin-profile-field">
              <span>Email Address</span>
              <span className="admin-profile-input-wrap">
                <FiMail />
                <input
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  placeholder="Enter your email"
                  maxLength={254}
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="admin-profile-field">
              <span>Phone Number</span>
              <span className="admin-profile-input-wrap">
                <FiPhone />
                <input
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter your phone number"
                  maxLength={20}
                  autoComplete="tel"
                />
              </span>
            </label>

            <div className="admin-profile-field">
              <span>Account Role</span>
              <div className="admin-profile-readonly">
                <FiShield />
                <span>{user?.role || "admin"}</span>
                <small>Managed by system permissions</small>
              </div>
            </div>
          </div>

          <div className="admin-profile-form-footer">
            <button
              className="admin-profile-primary-button"
              type="submit"
              disabled={savingProfile}
            >
              <FiSave />
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-profile-card">
        <div className="admin-profile-card-heading">
          <span className="admin-profile-heading-icon">
            <FiLock />
          </span>
          <div>
            <h2>Change Password</h2>
            <p>Verify your current password before setting a new one.</p>
          </div>
        </div>

        {passwordError && (
          <div className="admin-profile-alert error" role="alert">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="admin-profile-alert success" role="status">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="admin-profile-form-grid">
            <label className="admin-profile-field">
              <span>Current Password</span>
              <input
                className="admin-profile-password-input"
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                autoComplete="current-password"
                required
              />
            </label>

            <label className="admin-profile-field">
              <span>New Password</span>
              <input
                className="admin-profile-password-input"
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>

            <label className="admin-profile-field">
              <span>Confirm New Password</span>
              <input
                className="admin-profile-password-input"
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
          </div>

          <div className="admin-profile-security-note">
            Changing your password signs you out so you can sign in again
            with your new password.
          </div>

          <div className="admin-profile-form-footer">
            <button
              className="admin-profile-primary-button"
              type="submit"
              disabled={savingPassword}
            >
              <FiLock />
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default Profile;
