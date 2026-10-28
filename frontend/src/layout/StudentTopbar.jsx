
import { useEffect, useRef, useState } from "react";
import {
  FiBell,
  FiChevronDown,
  FiMaximize,
  FiMenu,
  FiSearch,
  FiUser,
  FiLogOut,
} from "react-icons/fi";

export default function StudentTopbar({
  user,
  onMenuToggle,
  onPlannedItem,
  onLogout,
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const profileRef = useRef(null);

  const displayName =
    user?.name || user?.email?.split("@")[0] || "Student";

  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
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
              if (event.key === "Escape") event.currentTarget.value = "";
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
          onClick={() =>
            onPlannedItem({ label: "Notifications", phase: 10 })
          }
          title="Notifications"
        >
          <FiBell />
        </button>

        <div className="student-layout__profile-wrap" ref={profileRef}>
          <button
            type="button"
            className="student-layout__profile-button"
            onClick={() => setProfileOpen((previous) => !previous)}
            aria-expanded={profileOpen}
            aria-label="Open student profile menu"
          >
            <span className="student-layout__avatar">{initial}</span>
            <span className="student-layout__profile-text">
              <strong>{displayName}</strong>
              <small>Student</small>
            </span>
            <FiChevronDown />
          </button>

          {profileOpen && (
            <div className="student-layout__profile-menu">
              <div className="student-layout__profile-menu-heading">
                <strong>{displayName}</strong>
                <span>{user?.email || "Student account"}</span>
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
