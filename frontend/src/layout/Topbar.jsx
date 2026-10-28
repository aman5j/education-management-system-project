
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiChevronDown,
  FiMaximize,
  FiMenu,
  FiUser,
  FiSettings,
  FiLock,
  FiLogOut,
} from "react-icons/fi";
import { FaSchool } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/notifications/NotificationBell";
import { getAssetUrl } from "../utils/assetUrl";

import "./AdminLayout.css";

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

const Topbar = ({
  onOpenMobileSidebar,
  dashboardPath = "/admin/dashboard",
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  const avatarUrl = isStaff && user?.avatar
    ? getAssetUrl(user.avatar)
    : "";

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar]);

  useEffect(() => {
    const handleDocumentClick = () => setProfileOpen(false);

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  const handleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      setFullscreen(false);
    }
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const handleProfileClick = (event) => {
    event.stopPropagation();
    setProfileOpen((previous) => !previous);
  };

  const renderAvatar = (large = false) => {
    const className = `profile-avatar ${
      large ? "profile-avatar-large" : ""
    }`;

    // Admin always gets the school icon.
    if (isAdmin) {
      return (
        <div className={`${className} profile-avatar-admin`}>
          <FaSchool aria-label="Administrator" />
        </div>
      );
    }

    // Staff gets their uploaded profile photo.
    if (isStaff && avatarUrl && !avatarFailed) {
      return (
        <div className={`${className} profile-avatar-photo`}>
          <img
            src={avatarUrl}
            alt={`${user?.name || "Staff"} profile`}
            onError={() => setAvatarFailed(true)}
          />
        </div>
      );
    }

    // Fallback for staff without a photo and other account types.
    return (
      <div className={className}>
        {getInitials(user?.name)}
      </div>
    );
  };

  return (
    <header className="admin-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-icon-button mobile-menu-button"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar"
        >
          <FiMenu />
        </button>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-icon-button"
          onClick={handleFullscreen}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          <FiMaximize />
        </button>

        <NotificationBell />

        <div className="topbar-profile-wrapper">
          <button
            type="button"
            className="topbar-profile"
            onClick={handleProfileClick}
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
          >
            {renderAvatar()}

            <div className="profile-info">
              <strong>{user?.name || (isAdmin ? "Administrator" : "Staff")}</strong>
              <span>
                {isAdmin
                  ? "Administrator"
                  : user?.role === "staff"
                    ? user?.assignedRole?.label ||
                      user?.assignedRole?.name ||
                      "Staff"
                    : user?.role || "User"}
              </span>
            </div>

            <FiChevronDown
              className={`profile-chevron ${
                profileOpen ? "profile-chevron-open" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div
              className="profile-dropdown"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="profile-dropdown-header">
                {renderAvatar(true)}

                <div>
                  <strong>{user?.name || "User"}</strong>
                  <span>{user?.email || ""}</span>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              <div className="profile-dropdown-item">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate(
                      isStaff ? "/staff/profile" : "/admin/profile"
                    );
                  }}
                >
                  <FiUser />
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/admin/system-settings");
                  }}
                >
                  <FiSettings />
                  Settings
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/admin/change-password");
                  }}
                >
                  <FiLock />
                  Change Password
                </button>

                <button
                  type="button"
                  className="profile-logout-button"
                  onClick={handleLogout}
                >
                  <FiLogOut />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
