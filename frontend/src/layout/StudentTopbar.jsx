
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiBell,
  FiChevronDown,
  FiMaximize,
  FiMenu,
  FiSearch,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import { FaBell } from "react-icons/fa";

import studentPortalService from "../services/studentPortalService";
import { getAssetUrl } from "../utils/assetUrl";
import { HiOutlineBars3 } from "react-icons/hi2";

export default function StudentTopbar({
  user,
  onMenuToggle,
  onPlannedItem,
  onLogout,
  onProfile,
}) { 
  const [profileOpen, setProfileOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [student, setStudent] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profileRef = useRef(null);

  const displayName =
    student?.name ||
    [student?.firstName, student?.surname].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Student";

  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  const avatarUrl = student?.profileImage
    ? getAssetUrl(student.profileImage)
    : "";

  const loadStudentProfile = useCallback(async () => {
    try {
      const response = await studentPortalService.getDashboard();
      setStudent(response?.data?.student || null);
      setAvatarFailed(false);
    } catch (error) {
      // The topbar can still render the student's initials if this fails.
      console.error("Unable to load student profile image:", error);
    }
  }, []);

  useEffect(() => {
    loadStudentProfile();
  }, [loadStudentProfile]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [student?.profileImage]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleFullscreen = async () => {
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

  const handleProfileClick = () => {
    setProfileOpen((previous) => !previous);
  };

  const renderAvatar = () => {
    if (avatarUrl && !avatarFailed) {
      return (
        <span className="student-layout__avatar student-layout__avatar--photo">
          <img
            src={avatarUrl}
            alt={`${displayName} profile`}
            onError={() => {
              console.error("Student profile image failed to load:", avatarUrl);
              setAvatarFailed(true);
            }}
          />
        </span>
      );
    }

    return (
      <span className="student-layout__avatar" aria-label={`${displayName} initials`}>
        {initial}
      </span>
    );
  };

  return (
    <header className="admin-topbar">
      <div className="student-layout__topbar-left">
        <button
          type="button"
          className="sidebar-collapse-button studentport"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
           <HiOutlineBars3 />
        </button>

       
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-icon-button"
          onClick={toggleFullscreen}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          <FiMaximize />
        </button>

        <button
          type="button"
          className="notification-bell"
          aria-label="Notifications"
          onClick={() => onPlannedItem({ label: "Notifications", phase: 10 })}
          title="Notifications"
        >
          <FaBell />
        </button>

        <div className="topbar-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="topbar-profile"
            onClick={handleProfileClick}
            aria-expanded={profileOpen}
            aria-label="Open student profile menu"
          >
            {renderAvatar()}

            <span className="profile-info">
              <strong>{displayName}</strong>
              <span>Student</span>
            </span>

            {/* <FiChevronDown /> */}
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                {renderAvatar()}
                <div>
                  <strong>{displayName}</strong>
                  <span>{user?.email || "Student account"}</span>
                </div>
              </div>
<div className="profile-dropdown-divider"></div>
            <div className="profile-dropdown-item">
              <button
                type="button"
                onClick={() => {
                  // setProfileOpen(false);
                  // onPlannedItem({ label: "My Profile", phase: 13 });
                  setProfileOpen(false);
                  onProfile?.();
                }}
              >
                <FiUser />
                My Profile
              </button>

              <button className="profile-logout-button"
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
              >
                <FiLogOut />
                Sign out
              </button>
            </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
