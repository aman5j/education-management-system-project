
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

import studentPortalService from "../services/studentPortalService";
import { getAssetUrl } from "../utils/assetUrl";

export default function StudentTopbar({
  user,
  onMenuToggle,
  onPlannedItem,
  onLogout,
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
    <header className="student-layout__topbar">
      <div className="student-layout__topbar-left">
        <button
          type="button"
          className="student-layout__menu-toggle"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <FiMenu />
        </button>

        <label className="student-layout__search">
          <FiSearch />
          <input
            type="search"
            aria-label="Search student portal"
            placeholder="Search student portal"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.value = "";
              }
            }}
          />
        </label>
      </div>

      <div className="student-layout__topbar-actions">
        <button
          type="button"
          className="student-layout__icon-button"
          onClick={toggleFullscreen}
          title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          <FiMaximize />
        </button>

        <button
          type="button"
          className="student-layout__icon-button"
          aria-label="Notifications"
          onClick={() => onPlannedItem({ label: "Notifications", phase: 10 })}
          title="Notifications"
        >
          <FiBell />
        </button>

        <div className="student-layout__profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="student-layout__profile-button"
            onClick={handleProfileClick}
            aria-expanded={profileOpen}
            aria-label="Open student profile menu"
          >
            {renderAvatar()}

            <span className="student-layout__profile-text">
              <strong>{displayName}</strong>
              <small>Student</small>
            </span>

            <FiChevronDown />
          </button>

          {profileOpen && (
            <div className="student-layout__profile-menu">
              <div className="student-layout__profile-menu-heading">
                {renderAvatar()}
                <div>
                  <strong>{displayName}</strong>
                  <span>{user?.email || "Student account"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  onPlannedItem({ label: "My Profile", phase: 13 });
                }}
              >
                <FiUser />
                My Profile
              </button>

              <button
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
          )}
        </div>
      </div>
    </header>
  );
}
